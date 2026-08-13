const Livraison = require("../models/Livraison");
const User = require("../models/User");
const Document = require("../models/Document");
const Corridor = require("../models/Corridor");
const Vehicule = require("../models/Vehicule");
const { calculerPrixEstime, calculerCommission, estEnRetard } = require("../utils/tarification");
const { notifier } = require("../utils/notifications");
const { genererLettreDeVoiture, genererFacture } = require("../utils/documentGenerator");
const { detecterArrets, detecterDeviationItineraire } = require("../utils/gpsTracking");
const { TYPES_MARCHANDISE, LABELS_TYPES_MARCHANDISE, NECESSITE_DECLARATION, verifierCompatibiliteVehicule } = require("../utils/marchandises");
const { recupererOuCreerParametres } = require("./parametreController");

// Anti-désintermédiation : tant qu'une demande est en_attente (aucun
// transporteur assigné), le téléphone du client n'est jamais montré à un
// transporteur qui ne fait que consulter la bourse de fret — seulement son
// nom et sa localisation générale. Objectif : empêcher un contact direct
// hors plateforme avant même l'acceptation de la mission. Le téléphone
// n'est révélé qu'une fois la mission acceptée (les deux parties en ont
// alors réellement besoin pour exécuter la livraison), et reste toujours
// visible pour le client lui-même et pour l'admin.
function masquerContactAvantAcceptation(livraisonDoc, requestUserId, requestUserRole) {
  const livraison = livraisonDoc.toObject ? livraisonDoc.toObject() : livraisonDoc;
  if (livraison.statut !== "en_attente") return livraison;
  if (requestUserRole === "admin") return livraison;

  const estClientProprietaire = livraison.client && livraison.client._id?.toString() === requestUserId.toString();
  if (estClientProprietaire) return livraison; // le client voit toujours ses propres coordonnées

  if (livraison.client && livraison.client.telephone) {
    livraison.client = { ...livraison.client, telephone: null };
  }
  return livraison;
}

// @desc    Estimer le prix d'une livraison avant création (formule V1 validée le 04/08/2026)
// @route   POST /api/livraisons/estimation
// @access  Privé (client)
const estimerPrix = async (req, res) => {
  try {
    const { distanceKm, poidsKg, optionExpress, dateEnlevement } = req.body;
    const estimation = calculerPrixEstime({ distanceKm, poidsKg, optionExpress, dateEnlevement });
    return res.status(200).json(estimation);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Créer une nouvelle demande de livraison
// @route   POST /api/livraisons
// @access  Privé (client)
const creerLivraison = async (req, res) => {
  try {
    const {
      adresseDepart,
      adresseArrivee,
      description,
      poidsKg,
      distanceKm,
      optionExpress,
      modePaiement,
      dateLivraisonPrevue,
      typeMarchandise,
      nombrePalettes,
      declarationMarchandiseDangereuse,
    } = req.body;

    if (!adresseDepart?.label || !adresseArrivee?.label) {
      return res.status(400).json({
        message: "Adresse de départ et d'arrivée sont obligatoires",
      });
    }

    // Module 6 — Gestion des marchandises : un type invalide est refusé
    // plutôt que silencieusement ignoré, et les matières dangereuses /
    // produits pétroliers exigent une déclaration explicite avant de
    // pouvoir créer la demande (responsabilise l'expéditeur ; l'application
    // ne prétend pas valider elle-même la conformité réglementaire réelle).
    const type = typeMarchandise || "colis";
    if (!TYPES_MARCHANDISE.includes(type)) {
      return res.status(400).json({ message: "Type de marchandise invalide" });
    }
    if (NECESSITE_DECLARATION.includes(type) && !declarationMarchandiseDangereuse) {
      return res.status(400).json({
        message: `Le transport de "${LABELS_TYPES_MARCHANDISE[type]}" nécessite une déclaration explicite confirmant la conformité de la marchandise à la réglementation en vigueur.`,
      });
    }

    // Sécurité : le prix n'est jamais accepté depuis le client, il est toujours
    // recalculé côté serveur selon la formule V1 validée — empêche toute
    // manipulation du prix ou de la commission par un client malveillant.
    // Note (Module 27) : cette formule a été conçue pour des trajets courts
    // intra-urbains ; sa pertinence sur un trajet inter-pays de plusieurs
    // centaines de kilomètres reste à confirmer (cahier des charges V4.0,
    // "Points ouverts avant l'Étape 1") — non modifiée ici pour ne pas
    // inventer un barème non validé.
    const { prix } = calculerPrixEstime({ distanceKm, poidsKg, optionExpress });
    const parametres = await recupererOuCreerParametres();
    const commission = calculerCommission(prix, parametres.tauxCommission);

    const paysDepart = adresseDepart.pays || "Mali";
    const paysArrivee = adresseArrivee.pays || "Mali";
    const estTransfrontalier = paysDepart !== paysArrivee;

    let corridor = null;
    if (estTransfrontalier) {
      corridor = await Corridor.findOne({ paysDepart, paysArrivee, actif: true });
    }

    const livraison = await Livraison.create({
      client: req.user._id,
      adresseDepart: { ...adresseDepart, pays: paysDepart },
      adresseArrivee: { ...adresseArrivee, pays: paysArrivee },
      description,
      poidsKg,
      distanceKm,
      optionExpress: !!optionExpress,
      prix,
      commission,
      dateLivraisonPrevue: dateLivraisonPrevue || null,
      modePaiement: modePaiement || "especes",
      estTransfrontalier,
      corridor: corridor ? corridor._id : null,
      statutDouane: estTransfrontalier ? "a_traiter_manuellement" : "non_applicable",
      typeMarchandise: type,
      nombrePalettes: type === "palettes" ? Number(nombrePalettes) || null : null,
      declarationMarchandiseDangereuse: NECESSITE_DECLARATION.includes(type) ? true : false,
    });

    // Retour associés du 08/08/2026 : réduire le temps d'attente du client en
    // prévenant activement les transporteurs disponibles plutôt que de
    // compter uniquement sur eux pour consulter la bourse de fret. Seuls les
    // transporteurs actifs et au KYC validé sont notifiés (ce sont les seuls
    // qui peuvent réellement accepter la mission).
    const transporteursDisponibles = await User.find({
      role: "transporteur",
      actif: true,
      "kyc.statutGlobal": "valide",
    });
    await Promise.all(
      transporteursDisponibles.map((t) =>
        notifier({
          destinataire: t._id,
          type: "nouvelle_demande_disponible",
          titre: "Nouvelle demande disponible",
          message: `${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label} (${livraison.poidsKg} kg, ${livraison.prix} FCFA). Premier arrivé, premier accepté.`,
          lien: livraison._id.toString(),
        })
      )
    );

    return res.status(201).json(livraison);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste des livraisons (filtrée selon le rôle)
// @route   GET /api/livraisons
// @access  Privé
const getLivraisons = async (req, res) => {
  try {
    let filtre = {};

    if (req.user.role === "client") {
      filtre.client = req.user._id;
    } else if (req.user.role === "transporteur") {
      // Le transporteur voit ses livraisons + celles en attente non assignées
      filtre = {
        $or: [{ transporteur: req.user._id }, { statut: "en_attente" }],
      };
    }
    // L'admin voit tout (filtre reste vide)

    const livraisons = await Livraison.find(filtre)
      .populate("client", "nom telephone")
      .populate("transporteur", "nom telephone vehicule")
      .sort({ createdAt: -1 });

    const livraisonsMasquees = livraisons.map((l) =>
      masquerContactAvantAcceptation(l, req.user._id, req.user.role)
    );

    return res.status(200).json(livraisonsMasquees);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Détail d'une livraison
// @route   GET /api/livraisons/:id
// @access  Privé
const getLivraisonById = async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id)
      .populate("client", "nom telephone")
      .populate("transporteur", "nom telephone vehicule position");

    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    // Sécurité : seuls le client propriétaire, le transporteur assigné (ou tout
    // transporteur si la livraison est encore en_attente) et l'admin peuvent
    // consulter le détail d'une livraison.
    const estClientProprietaire = livraison.client._id.toString() === req.user._id.toString();
    const estTransporteurAssigne =
      livraison.transporteur && livraison.transporteur._id.toString() === req.user._id.toString();
    const estTransporteurEtLivraisonDisponible =
      req.user.role === "transporteur" && livraison.statut === "en_attente";

    const estAutorise =
      req.user.role === "admin" ||
      estClientProprietaire ||
      estTransporteurAssigne ||
      estTransporteurEtLivraisonDisponible;

    if (!estAutorise) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à consulter cette livraison" });
    }

    // Détection de retard (seuil V1 validé : 30 minutes au-delà de l'ETA)
    if (livraison.statut === "en_cours" && !livraison.retardDetecte) {
      if (estEnRetard(livraison.dateLivraisonPrevue)) {
        livraison.retardDetecte = true;
        await livraison.save();
      }
    }

    const livraisonMasquee = masquerContactAvantAcceptation(livraison, req.user._id, req.user.role);

    return res.status(200).json(livraisonMasquee);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Un transporteur accepte une livraison
// @route   PUT /api/livraisons/:id/accepter
// @access  Privé (transporteur)
const accepterLivraison = async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id);

    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }
    if (livraison.statut !== "en_attente") {
      return res.status(400).json({ message: "Cette livraison n'est plus disponible" });
    }

    // Mesure liée au KYC (retour associés du 08/08/2026) : un transporteur
    // dont le dossier n'est pas encore validé ne peut pas accepter de mission
    // — il a été relancé au préalable (Module 1, relancerKYC).
    if (req.user.kyc?.statutGlobal !== "valide") {
      return res.status(403).json({
        message: "Ton dossier KYC doit être validé avant de pouvoir accepter une mission. Complète-le dans « Mon KYC ».",
      });
    }

    // Gestion de flotte : le choix d'un véhicule est facultatif (un
    // transporteur indépendant sans flotte enregistrée peut accepter sans),
    // mais s'il en choisit un, on vérifie qu'il lui appartient bien et qu'il
    // est actif.
    const { vehiculeId } = req.body || {};
    let vehiculeChoisi = null;
    if (vehiculeId) {
      vehiculeChoisi = await Vehicule.findById(vehiculeId);
      if (!vehiculeChoisi || vehiculeChoisi.proprietaire.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Ce véhicule ne fait pas partie de ta flotte" });
      }
      if (!vehiculeChoisi.actif) {
        return res.status(400).json({ message: "Ce véhicule est désactivé" });
      }
    }

    // Module 6 — Gestion des marchandises : certains types de fret exigent
    // un véhicule adapté (ex. produits réfrigérés -> véhicule frigorifique).
    const compatibilite = verifierCompatibiliteVehicule(livraison.typeMarchandise, vehiculeChoisi);
    if (!compatibilite.compatible) {
      return res.status(400).json({ message: compatibilite.message });
    }

    if (vehiculeChoisi) {
      livraison.vehiculeUtilise = vehiculeChoisi._id;
    }

    livraison.transporteur = req.user._id;
    livraison.statut = "acceptee";
    await livraison.save();

    // Statistique utilisée par le score de fiabilité (taux d'acceptation)
    await User.findByIdAndUpdate(req.user._id, {
      $inc: { "statsFiabilite.missionsAcceptees": 1 },
    });

    // Module 11 — Génération automatique de la lettre de voiture
    const client = await User.findById(livraison.client);
    const vehiculeFlotte = livraison.vehiculeUtilise ? await Vehicule.findById(livraison.vehiculeUtilise) : null;
    await Document.create({
      livraison: livraison._id,
      type: "lettre_voiture",
      donneesGenerees: genererLettreDeVoiture(livraison, client, req.user, vehiculeFlotte),
      ajoutePar: null, // document système, pas ajouté manuellement
    });

    await notifier({
      destinataire: livraison.client,
      type: "mission_acceptee",
      titre: "Transporteur trouvé",
      message: `${req.user.nom} a accepté votre demande (${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label}).`,
      lien: livraison._id.toString(),
    });

    return res.status(200).json(livraison);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Mettre à jour le statut d'une livraison (en_cours, livree, annulee)
// @route   PUT /api/livraisons/:id/statut
// @access  Privé (client, transporteur assigné ou admin)
//
// Règles d'annulation validées le 04/08/2026 :
//  - Client : gratuite si en_attente ; pénalité si acceptee ; bloquée si en_cours
//    sauf force majeure validée par un administrateur.
//  - Transporteur : pénalité sur son score si annulation après acceptee (+ remise
//    en en_attente) ; pénalité renforcée + signalement admin si après en_cours.
const updateStatutLivraison = async (req, res) => {
  try {
    const { statut, motif } = req.body;
    // "livree" n'est plus accepté ici : cette transition exige une preuve de
    // livraison (POST /:id/livrer) — Module 12, validé le 05/08/2026.
    const statutsValides = ["en_cours", "annulee"];

    if (!statutsValides.includes(statut)) {
      return res.status(400).json({
        message:
          statut === "livree"
            ? "Utilisez POST /api/livraisons/:id/livrer avec une preuve de livraison"
            : "Statut invalide",
      });
    }

    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    const estClientProprietaire = livraison.client.toString() === req.user._id.toString();
    const estTransporteurAssigne =
      livraison.transporteur && livraison.transporteur.toString() === req.user._id.toString();
    const estAdmin = req.user.role === "admin";

    if (!estAdmin && !estTransporteurAssigne && !(estClientProprietaire && statut === "annulee")) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à modifier cette livraison" });
    }

    // --- Cas particulier : annulation ---
    if (statut === "annulee") {
      if (["livree", "annulee"].includes(livraison.statut) && !estAdmin) {
        return res.status(400).json({
          message: "Cette livraison est déjà terminée ou annulée, elle ne peut plus être modifiée.",
        });
      }

      if (estClientProprietaire && !estAdmin) {
        if (livraison.statut === "en_attente") {
          // Gratuite
        } else if (livraison.statut === "acceptee") {
          // Pénalité client — pas de dispositif de pénalité financière client
          // encore défini ailleurs dans le cahier des charges ; on trace au moins l'événement.
          if (livraison.transporteur) {
            await notifier({
              destinataire: livraison.transporteur,
              type: "mission_annulee",
              titre: "Mission annulée par le client",
              message: `Le client a annulé la mission ${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label}.`,
              lien: livraison._id.toString(),
            });
          }
        } else if (livraison.statut === "en_cours" && !estAdmin) {
          return res.status(400).json({
            message: "Annulation impossible : la livraison est déjà en cours. Contactez le support pour un motif de force majeure.",
          });
        }
      }

      if (estTransporteurAssigne && !estAdmin) {
        const statutAvantAnnulation = livraison.statut;
        // Pénalité sur le score de fiabilité du transporteur (comptée comme une annulation)
        await User.findByIdAndUpdate(livraison.transporteur, {
          $inc: { "statsFiabilite.missionsAnnuleesParTransporteur": 1 },
        });

        if (statutAvantAnnulation === "acceptee") {
          // Remise en attente pour réattribution, pénalité simple
          livraison.transporteur = null;
          livraison.statut = "en_attente";
          livraison.annulation = { annulePar: "transporteur", motif: motif || null, horodatage: new Date() };
          await livraison.save();
          await notifier({
            destinataire: livraison.client,
            type: "mission_annulee",
            titre: "Le transporteur a annulé",
            message: `Le transporteur a annulé la mission ${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label}. Elle est remise en recherche de transporteur.`,
            lien: livraison._id.toString(),
          });
          return res.status(200).json({
            ...livraison.toObject(),
            info: "Mission remise en attente pour réattribution. Pénalité appliquée au score de fiabilité.",
          });
        }

        if (statutAvantAnnulation === "en_cours") {
          // Pénalité renforcée + signalement admin (cas grave, marchandise déjà en route)
          await User.findByIdAndUpdate(livraison.transporteur, {
            $inc: { "statsFiabilite.missionsAnnuleesParTransporteur": 1 }, // compte double pour peser plus lourd dans le score
          });
          livraison.transporteur = null;
          livraison.statut = "en_attente";
          livraison.annulation = {
            annulePar: "transporteur",
            motif: motif || "Annulation en cours de trajet — signalement automatique",
            horodatage: new Date(),
          };
          await livraison.save();

          await notifier({
            destinataire: livraison.client,
            type: "mission_annulee",
            titre: "Annulation en cours de trajet",
            message: `Le transporteur a annulé la mission ${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label} alors qu'elle était en cours. Une réattribution urgente est en cours.`,
            lien: livraison._id.toString(),
          });
          const admins = await User.find({ role: "admin" });
          await Promise.all(
            admins.map((admin) =>
              notifier({
                destinataire: admin._id,
                type: "mission_annulee",
                titre: "Signalement : annulation en cours de trajet",
                message: `Le transporteur ${req.user.nom} a annulé une mission en_cours (${livraison._id}). Marchandise potentiellement en transit non accompagné.`,
                lien: livraison._id.toString(),
              })
            )
          );

          return res.status(200).json({
            ...livraison.toObject(),
            info: "Annulation en cours de trajet : réattribution urgente déclenchée et signalement transmis à l'administration.",
          });
        }
      }

      if (estAdmin) {
        livraison.annulation = { annulePar: "admin", motif: motif || null, horodatage: new Date() };
      } else if (estClientProprietaire) {
        livraison.annulation = { annulePar: "client", motif: motif || null, horodatage: new Date() };
      }
    }

    livraison.statut = statut;
    await livraison.save();

    return res.status(200).json(livraison);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Évaluer l'autre partie après une livraison terminée (Module 19)
// @route   POST /api/livraisons/:id/evaluer
// @access  Privé (client ou transporteur de la livraison)
const evaluerLivraison = async (req, res) => {
  try {
    const { note, commentaire } = req.body;
    const noteNum = Number(note);

    if (!noteNum || noteNum < 1 || noteNum > 5) {
      return res.status(400).json({ message: "La note doit être comprise entre 1 et 5" });
    }

    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }
    if (livraison.statut !== "livree") {
      return res.status(400).json({ message: "Seule une livraison terminée peut être évaluée" });
    }

    const estClient = livraison.client.toString() === req.user._id.toString();
    const estTransporteur =
      livraison.transporteur && livraison.transporteur.toString() === req.user._id.toString();

    if (!estClient && !estTransporteur) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à évaluer cette livraison" });
    }

    if (estClient) {
      if (livraison.evaluation.clientVersTransporteur.note !== null) {
        return res.status(400).json({ message: "Vous avez déjà évalué cette livraison" });
      }
      livraison.evaluation.clientVersTransporteur = { note: noteNum, commentaire: commentaire || null, creeLe: new Date() };

      // Alimente directement le score de fiabilité (Module 9) et, indirectement,
      // le score IA (Module 21) au prochain recalcul par lot.
      if (livraison.transporteur) {
        await User.findByIdAndUpdate(livraison.transporteur, {
          $inc: { "statsFiabilite.sommeNotes": noteNum, "statsFiabilite.nbNotes": 1 },
        });
      }
    } else {
      if (livraison.evaluation.transporteurVersClient.note !== null) {
        return res.status(400).json({ message: "Vous avez déjà évalué cette livraison" });
      }
      livraison.evaluation.transporteurVersClient = { note: noteNum, commentaire: commentaire || null, creeLe: new Date() };
      // Pas encore de score de fiabilité côté client dans le cahier des charges V3.0 —
      // la note est conservée sur la livraison mais n'alimente aucun agrégat pour l'instant.
    }

    await livraison.save();

    const destinataireNotif = estClient ? livraison.transporteur : livraison.client;
    await notifier({
      destinataire: destinataireNotif,
      type: "evaluation_recue",
      titre: "Nouvelle évaluation reçue",
      message: `Tu as reçu une note de ${noteNum}/5 pour la livraison ${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label}.`,
      lien: livraison._id.toString(),
    });

    return res.status(200).json(livraison);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Marquer une livraison comme "livree" avec preuve de livraison
//          obligatoire (Module 12 — Signature électronique)
// @route   POST /api/livraisons/:id/livrer
// @access  Privé (transporteur assigné)
const livrerAvecPreuve = async (req, res) => {
  try {
    const { nomDestinataire, signatureUrl, photoUrl, lat, lng } = req.body;

    if (!nomDestinataire || (!signatureUrl && !photoUrl)) {
      return res.status(400).json({
        message: "Le nom du destinataire et au moins une preuve (signature ou photo) sont obligatoires",
      });
    }

    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    const estTransporteurAssigne =
      livraison.transporteur && livraison.transporteur.toString() === req.user._id.toString();
    if (!estTransporteurAssigne) {
      return res.status(403).json({ message: "Seul le transporteur assigné peut confirmer la livraison" });
    }
    if (livraison.statut !== "en_cours") {
      return res.status(400).json({
        message: "Seule une livraison en_cours peut être marquée comme livrée",
      });
    }

    livraison.preuveLivraison = {
      nomDestinataire,
      signatureUrl: signatureUrl || null,
      photoUrl: photoUrl || null,
      geolocalisation: { lat: lat ?? null, lng: lng ?? null },
      horodatage: new Date(),
    };

    const enRetard = estEnRetard(livraison.dateLivraisonPrevue);
    livraison.retardDetecte = enRetard;
    livraison.statut = "livree";

    await livraison.save();

    // Module 14 — Comptabilité : la facture est générée automatiquement dès
    // que la prestation est terminée (livraison marquée "livree").
    const clientPourFacture = await User.findById(livraison.client);
    await Document.create({
      livraison: livraison._id,
      type: "facture",
      donneesGenerees: genererFacture(livraison, clientPourFacture, req.user),
      ajoutePar: null,
    });

    // Statistiques utilisées par le score de fiabilité (Module 9) et, en aval,
    // par le score IA (Module 21) au prochain recalcul par lot.
    const update = { $inc: { "statsFiabilite.missionsCompletees": 1 } };
    if (!enRetard) update.$inc["statsFiabilite.missionsALHeure"] = 1;
    await User.findByIdAndUpdate(livraison.transporteur, update);

    await notifier({
      destinataire: livraison.client,
      type: "livraison_livree",
      titre: "Livraison effectuée",
      message: `Votre colis a été remis à ${nomDestinataire} (${livraison.adresseDepart.label} → ${livraison.adresseArrivee.label}).`,
      lien: livraison._id.toString(),
    });

    return res.status(200).json(livraison);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Suivi GPS détaillé (Module 10) : position actuelle, itinéraire
//          parcouru, arrêts détectés, retard, alerte de sortie d'itinéraire
// @route   GET /api/livraisons/:id/suivi-gps
// @access  Privé (client, transporteur assigné, ou admin)
const getSuiviGPS = async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }

    const estClient = livraison.client.toString() === req.user._id.toString();
    const estTransporteur = livraison.transporteur && livraison.transporteur.toString() === req.user._id.toString();
    if (!estClient && !estTransporteur && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à consulter ce suivi" });
    }

    const positionsTrajet = livraison.positionsTrajet || [];
    const positionActuelle = positionsTrajet.length > 0 ? positionsTrajet[positionsTrajet.length - 1] : null;

    return res.status(200).json({
      positionActuelle,
      itineraireParcouru: positionsTrajet,
      arrets: detecterArrets(positionsTrajet),
      retard: {
        detecte: !!livraison.retardDetecte,
        dateLivraisonPrevue: livraison.dateLivraisonPrevue,
      },
      alerteDeviation: detecterDeviationItineraire(positionActuelle, livraison.adresseDepart, livraison.adresseArrivee),
      adresseDepart: livraison.adresseDepart,
      adresseArrivee: livraison.adresseArrivee,
    });
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = {
  estimerPrix,
  creerLivraison,
  getLivraisons,
  getLivraisonById,
  accepterLivraison,
  updateStatutLivraison,
  evaluerLivraison,
  livrerAvecPreuve,
  getSuiviGPS,
};
