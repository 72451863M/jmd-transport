const { genererFacture } = require("../utils/documentGenerator");

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

const livraison = {
  _id: "6a7c65e72d76f44cec469abc",
  adresseDepart: { label: "Médine, Bamako" },
  adresseArrivee: { label: "ACI 2000, Bamako" },
  distanceKm: 6,
  prix: 2000,
  commission: 200,
  modePaiement: "especes",
  statutPaiement: "en_attente",
};
const client = { nom: "Aminata Koné", telephone: "+22376112233", email: "aminata@test.com" };
const transporteur = { nom: "Boubacar Traoré", telephone: "+22376998877" };

const facture = genererFacture(livraison, client, transporteur);

assert(facture.reference.startsWith("FACT-"), "La référence de facture commence par FACT-");
assert(facture.client.nom === "Aminata Koné", "Le nom du client est correctement repris");
assert(facture.transporteur.nom === "Boubacar Traoré", "Le nom du transporteur est correctement repris");
assert(facture.montantTotal === 2000, "Le montant total correspond au prix de la livraison");
assert(facture.commissionPlateforme === 200, "La commission plateforme est correctement reprise");
assert(facture.montantTransporteur === 1800, "Le montant net transporteur = prix - commission (1800)");
assert(facture.statutPaiement === "en_attente", "Le statut de paiement est correctement repris");
assert(facture.dateEmission instanceof Date, "La date d'émission est bien une date");

// Cas limite : commission absente (ne doit pas planter, ni donner NaN)
const factureSansCommission = genererFacture({ ...livraison, commission: undefined }, client, transporteur);
assert(factureSansCommission.montantTransporteur === 2000, "Si aucune commission, le montant net = le prix total (pas de NaN)");

console.log(`\n${ok} tests réussis, ${fail} échoués`);
process.exit(fail > 0 ? 1 : 0);
