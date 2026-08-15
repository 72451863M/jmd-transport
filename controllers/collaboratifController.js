const GroupeCollaboratif = require("../models/GroupeCollaboratif");
const Livraison = require("../models/Livraison");
const {
  trouverGroupeCompatible,
  calculerRepartitionCouts,
  vueGroupePourClient,
} = require("../utils/collaboratif");

/**
 * Appelée juste après la création d'une livraison éligible au transport
 * collaboratif (Module 29). Cherche un groupe ouvert compatible ; à défaut,
 * en crée un nouveau. Recalcule ensuite la répartition des coûts et
 * l'économie de chaque membre du groupe. Volontairement non bloquante pour
 * l'appelant (comme notifier()/enregistrerAudit()) : un souci ici ne doit
 * jamais empêcher la création de la demande elle-même.
 */
async function tenterRegroupement(livraison) {
  try {
    if (!livraison.eligibleCollaboratif) return;

    const groupesOuverts = await GroupeCollaboratif.find({ statut: "ouvert" });
    let groupe = trouverGroupeCompatible(livraison, groupesOuverts);

    if (!groupe) {
      groupe = await GroupeCollaboratif.create({
        adresseDepart: livraison.adresseDepart.label,
        adresseArrivee: livraison.adresseArrivee.label,
        corridor: livraison.corridor || null,
        dateSouhaitee: livraison.dateLivraisonPrevue || new Date(),
        capaciteTotaleKg: 1000, // capacité de référence V1 — un seul véhicule type ; affinable plus tard par type de véhicule réellement affecté
        capaciteRestanteKg: 1000,
        statut: "ouvert",
        demandes: [],
      });
    }

    groupe.demandes.push(livraison._id);
    groupe.capaciteRestanteKg -= livraison.poidsKg || 0;
    if (groupe.capaciteRestanteKg <= 0) groupe.statut = "complet";

    const demandesDuGroupe = await Livraison.find({ _id: { $in: groupe.demandes } });
    const repartition = calculerRepartitionCouts(
      demandesDuGroupe[0]?.distanceKm || livraison.distanceKm,
      demandesDuGroupe
    );

    let economieTotale = 0;
    for (const part of repartition) {
      economieTotale += part.economie;
      const d = demandesDuGroupe.find((x) => x._id.toString() === part.livraisonId.toString());
      if (d) {
        d.economieCollaborative = part.economie;
        d.groupeCollaboratif = groupe._id;
        await d.save();
      }
    }
    groupe.economieTotaleEstimee = economieTotale;

    await groupe.save();
  } catch (error) {
    console.error("[collaboratif] échec du regroupement :", error.message);
  }
}

// @desc    Consulter le groupe collaboratif de ma demande — vue filtrée
//          (liste blanche de confidentialité : ville de livraison et heure
//          estimée des autres membres uniquement, jamais leur nom,
//          téléphone, adresse exacte ou contenu du colis)
// @route   GET /api/collaboratif/livraisons/:id/groupe
// @access  Privé (client auteur de la demande, ou admin)
const getMonGroupe = async (req, res) => {
  try {
    const livraison = await Livraison.findById(req.params.id);
    if (!livraison) {
      return res.status(404).json({ message: "Livraison introuvable" });
    }
    const estAuteur = livraison.client.toString() === req.user._id.toString();
    if (!estAuteur && req.user.role !== "admin") {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à consulter ce groupe" });
    }
    if (!livraison.groupeCollaboratif) {
      return res.status(404).json({ message: "Cette demande ne fait partie d'aucun groupe collaboratif" });
    }

    const groupe = await GroupeCollaboratif.findById(livraison.groupeCollaboratif);
    if (!groupe) {
      return res.status(404).json({ message: "Groupe introuvable" });
    }
    const demandesDuGroupe = await Livraison.find({ _id: { $in: groupe.demandes } });

    const vue = vueGroupePourClient(groupe, demandesDuGroupe, livraison._id);
    vue.maPart = livraison.economieCollaborative > 0
      ? { economie: livraison.economieCollaborative }
      : null;

    return res.status(200).json(vue);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Liste de tous les groupes collaboratifs (vue admin, complète)
// @route   GET /api/collaboratif/groupes
// @access  Privé (admin)
const getTousLesGroupes = async (req, res) => {
  try {
    const groupes = await GroupeCollaboratif.find({});
    return res.status(200).json(groupes);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { tenterRegroupement, getMonGroupe, getTousLesGroupes };
