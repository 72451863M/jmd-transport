// Module 11 — Génération de la lettre de voiture
//
// Contenu structuré généré automatiquement à l'acceptation d'une mission
// (Chapitre 5 du cahier des charges V3.0 : "Lettre de voiture, bons, facture,
// assurance, permis, photos"). Rendu final (impression/PDF) laissé au
// frontend, qui reçoit ces données structurées.
function genererLettreDeVoiture(livraison, client, transporteur, vehiculeFlotte) {
  return {
    reference: livraison._id.toString(),
    dateEmission: new Date(),
    expediteur: {
      nom: client?.nom || null,
      telephone: client?.telephone || null,
    },
    transporteur: {
      nom: transporteur?.nom || null,
      telephone: transporteur?.telephone || null,
      // Priorité au véhicule de flotte choisi à l'acceptation (plus fiable,
      // saisi par le transporteur lui-même) ; à défaut, le champ véhicule
      // unique historique du compte transporteur.
      vehicule: vehiculeFlotte
        ? {
            type: vehiculeFlotte.type,
            immatriculation: vehiculeFlotte.immatriculation,
            capaciteKg: vehiculeFlotte.capaciteKg,
          }
        : transporteur?.vehicule || null,
      chauffeur: vehiculeFlotte?.nomChauffeur || null,
    },
    marchandise: {
      description: livraison.description || null,
      poidsKg: livraison.poidsKg || 0,
    },
    trajet: {
      depart: livraison.adresseDepart?.label || null,
      arrivee: livraison.adresseArrivee?.label || null,
      distanceKm: livraison.distanceKm || 0,
    },
    prix: livraison.prix,
    modePaiement: livraison.modePaiement,
  };
}

module.exports = { genererLettreDeVoiture };
