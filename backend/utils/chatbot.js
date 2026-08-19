// Module 28 — Centre d'assistance : « chatbot »
//
// Limite technique importante à connaître : ce n'est PAS un vrai chatbot
// conversationnel basé sur une IA — ce projet n'a ni clé API ni service de
// langage branché pour ça. Ce qui suit est une simple recherche par
// correspondance de mots-clés dans la FAQ : on compare les mots de la
// question posée à ceux des questions/réponses de la FAQ, et on retourne les
// entrées qui se recoupent le plus. C'est honnête, ça fonctionne pour
// orienter quelqu'un vers la bonne fiche FAQ, mais ça ne comprend pas le
// sens d'une phrase comme le ferait un vrai assistant conversationnel.

const MOTS_VIDES = new Set([
  "le", "la", "les", "un", "une", "des", "de", "du", "et", "ou", "je", "tu", "il", "elle",
  "nous", "vous", "ils", "elles", "mon", "ma", "mes", "ton", "ta", "tes", "son", "sa", "ses",
  "que", "qui", "quoi", "comment", "pourquoi", "quand", "où", "est", "suis", "es", "sont",
  "pour", "avec", "sans", "sur", "dans", "à", "au", "aux", "ce", "cette", "ces", "pas", "ne",
]);

function tokeniser(texte) {
  return (texte || "")
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // retire les accents pour une comparaison plus tolérante
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((mot) => mot.length > 1 && !MOTS_VIDES.has(mot));
}

/**
 * Recherche les entrées de FAQ les plus pertinentes pour une question posée,
 * par recoupement de mots-clés (pas de compréhension sémantique réelle).
 * @param {string} question - la question posée par l'utilisateur
 * @param {Array} listeFAQ - les entrées FAQ actives (question, reponse, categorie)
 * @param {number} limite - nombre maximum de résultats à retourner
 */
function rechercherDansFAQ(question, listeFAQ, limite = 3) {
  const motsQuestion = new Set(tokeniser(question));
  if (motsQuestion.size === 0) return [];

  const resultatsScores = listeFAQ.map((entree) => {
    const motsEntree = tokeniser(`${entree.question} ${entree.reponse}`);
    const correspondances = motsEntree.filter((mot) => motsQuestion.has(mot)).length;
    return { entree, score: correspondances };
  });

  return resultatsScores
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limite)
    .map((r) => r.entree);
}

module.exports = { rechercherDansFAQ, tokeniser };
