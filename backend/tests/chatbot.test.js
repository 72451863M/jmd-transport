const { rechercherDansFAQ, tokeniser } = require("../utils/chatbot");

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

// --- tokeniser ---
assert(tokeniser("Comment valider mon KYC ?").includes("kyc"), "Tokenise et conserve les mots significatifs (kyc)");
assert(!tokeniser("Comment valider mon KYC ?").includes("comment"), "Retire les mots vides (comment)");
assert(tokeniser("Été").includes("ete"), "Retire les accents pour une comparaison tolérante (Été -> ete)");
assert(tokeniser("").length === 0, "Chaîne vide -> aucun token, pas d'erreur");

const faq = [
  { question: "Comment valider mon dossier KYC ?", reponse: "Va dans Mon KYC, dépose tes documents (CNI, permis, carte grise), un admin les validera.", categorie: "KYC" },
  { question: "Comment ajouter un véhicule à ma flotte ?", reponse: "Va dans Ma flotte, remplis le formulaire avec immatriculation, type et capacité.", categorie: "Flotte" },
  { question: "Que faire si mon KYC est rejeté ?", reponse: "Le motif du rejet t'est envoyé par notification, tu peux redéposer des documents corrigés.", categorie: "KYC" },
  { question: "Comment fonctionne la commission ?", reponse: "Une commission est prélevée sur chaque livraison, le taux est fixé par l'administration.", categorie: "Paiement" },
];

// Test 1 : question correspondant clairement à une entrée précise
let resultats = rechercherDansFAQ("Comment valider mon KYC", faq);
assert(resultats.length > 0, "Trouve au moins un résultat pour une question sur le KYC");
assert(resultats[0].categorie === "KYC", "Le meilleur résultat est bien une entrée KYC");

// Test 2 : les deux entrées KYC remontent avant les autres
resultats = rechercherDansFAQ("mon dossier KYC a été rejeté pourquoi", faq);
assert(resultats.some((r) => r.question.includes("rejeté")), "Trouve l'entrée sur le rejet KYC");

// Test 3 : question sur la flotte ne retourne pas les entrées KYC en premier
resultats = rechercherDansFAQ("Comment ajouter un véhicule", faq);
assert(resultats[0].categorie === "Flotte", "Question sur la flotte retourne bien l'entrée flotte en premier");

// Test 4 : question sans aucun mot en commun -> aucun résultat (pas d'invention de réponse)
resultats = rechercherDansFAQ("recette de cuisine malienne", faq);
assert(resultats.length === 0, "Aucune correspondance -> liste vide, pas de résultat inventé");

// Test 5 : question vide -> aucun résultat, pas d'erreur
resultats = rechercherDansFAQ("", faq);
assert(resultats.length === 0, "Question vide -> aucun résultat, pas d'erreur");

// Test 6 : la limite de résultats est respectée
resultats = rechercherDansFAQ("comment KYC véhicule commission", faq, 2);
assert(resultats.length <= 2, "La limite de résultats (2) est bien respectée");

// Test 7 : liste FAQ vide -> aucun résultat, pas d'erreur
resultats = rechercherDansFAQ("KYC", []);
assert(resultats.length === 0, "Liste FAQ vide gérée sans erreur");

// Test 8 : insensible à la casse et aux accents
resultats = rechercherDansFAQ("COMMENT AJOUTER UN VEHICULE", faq);
assert(resultats.length > 0 && resultats[0].categorie === "Flotte", "Insensible à la casse et aux accents");

console.log(`\n${ok} tests réussis, ${fail} échoués`);
process.exit(fail > 0 ? 1 : 0);
