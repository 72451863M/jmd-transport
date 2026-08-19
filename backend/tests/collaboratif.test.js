const {
  marchandisesCompatibles,
  datesCompatibles,
  demandeCompatibleAvecGroupe,
  trouverGroupeCompatible,
  calculerPrixGroupe,
  calculerRepartitionCouts,
  vueGroupePourClient,
} = require("../utils/collaboratif");

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

// --- marchandisesCompatibles ---
assert(marchandisesCompatibles("colis", "palettes") === true, "Colis et palettes sont compatibles");
assert(marchandisesCompatibles("colis", "colis") === true, "Même type toujours compatible");
assert(marchandisesCompatibles("produits_dangereux", "colis") === false, "Produits dangereux jamais mélangés avec autre chose");
assert(marchandisesCompatibles("produits_refrigeres", "produits_agricoles") === false, "Produits réfrigérés jamais mélangés avec autre chose (même denrées alimentaires)");
assert(marchandisesCompatibles("produits_dangereux", "produits_dangereux") === true, "Deux demandes de produits dangereux entre elles restent compatibles");

// --- datesCompatibles ---
const base = new Date("2026-08-13T10:00:00Z");
const proche = new Date("2026-08-13T18:00:00Z"); // +8h
const loin = new Date("2026-08-15T10:00:00Z"); // +48h
assert(datesCompatibles(base, proche) === true, "8h d'écart reste compatible (fenêtre 12h)");
assert(datesCompatibles(base, loin) === false, "48h d'écart n'est pas compatible");
assert(datesCompatibles(null, proche) === true, "Aucune date précisée -> pas de contrainte inventée");

// --- demandeCompatibleAvecGroupe ---
const groupeOuvert = {
  statut: "ouvert",
  adresseDepart: "Bamako",
  adresseArrivee: "Sikasso",
  dateSouhaitee: base,
  capaciteRestanteKg: 500,
  typeMarchandiseDominant: "colis",
};
let demande = { adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" }, dateLivraisonPrevue: proche, poidsKg: 100, typeMarchandise: "colis" };
assert(demandeCompatibleAvecGroupe(demande, groupeOuvert) === true, "Demande compatible avec le groupe (trajet, date, poids, type)");

demande = { ...demande, adresseArrivee: { label: "Kayes" } };
assert(demandeCompatibleAvecGroupe(demande, groupeOuvert) === false, "Destination différente -> incompatible");

demande = { adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" }, dateLivraisonPrevue: proche, poidsKg: 9999, typeMarchandise: "colis" };
assert(demandeCompatibleAvecGroupe(demande, groupeOuvert) === false, "Poids dépassant la capacité restante -> incompatible");

demande = { adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" }, dateLivraisonPrevue: proche, poidsKg: 100, typeMarchandise: "produits_dangereux" };
assert(demandeCompatibleAvecGroupe(demande, groupeOuvert) === false, "Produits dangereux incompatibles avec un groupe 'colis'");

const groupeFerme = { ...groupeOuvert, statut: "complet" };
demande = { adresseDepart: { label: "Bamako" }, adresseArrivee: { label: "Sikasso" }, dateLivraisonPrevue: proche, poidsKg: 100, typeMarchandise: "colis" };
assert(demandeCompatibleAvecGroupe(demande, groupeFerme) === false, "Un groupe non 'ouvert' n'accepte plus de nouvelles demandes");

// --- trouverGroupeCompatible ---
const groupes = [groupeFerme, groupeOuvert];
assert(trouverGroupeCompatible(demande, groupes) === groupeOuvert, "Trouve le bon groupe ouvert parmi plusieurs");
assert(trouverGroupeCompatible({ ...demande, adresseArrivee: { label: "Gao" } }, groupes) === null, "Retourne null si aucun groupe ne convient (pas d'invention)");

// --- calculerPrixGroupe : vraie économie mesurable ---
// 2 demandes, même trajet 10km, 30kg chacune (10kg facturable au-delà du seuil de 20kg)
const demandesGroupe = [
  { _id: "d1", poidsKg: 30, prix: 3000 }, // solo : 1000 + 10*150 + 10*50 = 3000
  { _id: "d2", poidsKg: 30, prix: 3000 },
];
const prixGroupe = calculerPrixGroupe(10, demandesGroupe);
assert(prixGroupe === 3500, `Prix de groupe = 1000 (une fois) + 1500 (une fois) + 500 + 500 (poids cumulé) = 3500, obtenu ${prixGroupe}`);

// --- calculerRepartitionCouts ---
const repartition = calculerRepartitionCouts(10, demandesGroupe);
assert(repartition.length === 2, "Une part calculée par demande");
assert(repartition[0].partAllouee === 1750, `Part égale pour un poids égal (3500/2 = 1750), obtenu ${repartition[0].partAllouee}`);
assert(repartition[0].economie === 1250, `Économie = 3000 (solo) - 1750 (part groupe) = 1250, obtenu ${repartition[0].economie}`);
const economieTotale = repartition.reduce((t, r) => t + r.economie, 0);
assert(economieTotale === 2500, `Économie totale du groupe = 6000 (somme solo) - 3500 (prix groupe) = 2500, obtenu ${economieTotale}`);

// Répartition proportionnelle au poids (pas égale) si les poids diffèrent
const demandesInegales = [
  { _id: "d1", poidsKg: 60, prix: 5000 },
  { _id: "d2", poidsKg: 20, prix: 2000 },
];
const repartitionInegale = calculerRepartitionCouts(10, demandesInegales);
assert(repartitionInegale[0].partAllouee > repartitionInegale[1].partAllouee, "Celui qui pèse plus lourd paie une part plus importante");

// Cas limite : poids total nul (ne doit jamais planter ni diviser par zéro)
const repartitionPoidsNul = calculerRepartitionCouts(10, [{ _id: "d1", poidsKg: 0, prix: 1000 }, { _id: "d2", poidsKg: 0, prix: 1000 }]);
assert(repartitionPoidsNul.every((r) => !Number.isNaN(r.partAllouee)), "Poids total nul géré sans NaN (répartition égale par défaut)");

// --- vueGroupePourClient : confidentialité (liste blanche anomalie #9) ---
const demandesCompletes = [
  { _id: "d1", adresseArrivee: { label: "Sikasso centre" }, dateLivraisonPrevue: proche, client: { nom: "Aminata Koné", telephone: "+22376112233" }, description: "Colis fragile secret" },
  { _id: "d2", adresseArrivee: { label: "Sikasso gare" }, dateLivraisonPrevue: base, client: { nom: "Boubacar Traoré", telephone: "+22376998877" }, description: "Autre colis" },
];
const vue = vueGroupePourClient({ _id: "g1", adresseDepart: "Bamako", adresseArrivee: "Sikasso", statut: "ouvert" }, demandesCompletes, "d1");
assert(vue.autresLivraisons.length === 1, "Un seul 'autre' membre visible (celui du demandeur exclu)");
assert(vue.autresLivraisons[0].villeLivraison === "Sikasso gare", "La ville de livraison de l'autre client est visible");
assert(JSON.stringify(vue).includes("Boubacar Traoré") === false, "Le nom de l'autre client n'apparaît JAMAIS dans la vue");
assert(JSON.stringify(vue).includes("+22376998877") === false, "Le téléphone de l'autre client n'apparaît JAMAIS dans la vue");
assert(JSON.stringify(vue).includes("Autre colis") === false, "Le contenu/description du colis de l'autre client n'apparaît JAMAIS dans la vue");

console.log(`\n${ok} tests réussis, ${fail} échoués`);
process.exit(fail > 0 ? 1 : 0);
