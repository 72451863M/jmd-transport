// Module 11 — Génération de la lettre de voiture
//
// Contenu structuré généré automatiquement à l'acceptation d'une mission
// (Chapitre 5 du cahier des charges V3.0 : "Lettre de voiture, bons, facture,
// assurance, permis, photos"). Rendu final (impression/PDF) laissé au
// frontend, qui reçoit ces données structurées.
function genererLettreDeVoiture(livraison, client, transporteur) {
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
      vehicule: transporteur?.vehicule || null,
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
