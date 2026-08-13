// Module 1 — KYC (validé le 04/08/2026, anomalie #10 de l'audit initial)
//
// Documents exigés par rôle. La pièce d'identité (CNI ou NINA) est commune à
// tous ; chauffeurs et transporteurs doivent en plus fournir permis et carte
// grise. Le propriétaire d'une entreprise cliente (Module 2, ajouté le
// 06/08/2026) doit en plus fournir RCCM et NIF.

const DOCUMENTS_REQUIS_PAR_ROLE = {
  client: ["cni_nina"],
  transporteur: ["cni_nina", "permis_conduire", "carte_grise"],
  admin: ["cni_nina"],
};

const DOCUMENTS_SUPPLEMENTAIRES_PROPRIETAIRE_ENTREPRISE = ["rccm", "nif"];

/**
 * Détermine si le dossier KYC d'un utilisateur est complet pour son rôle
 * (tous les documents requis ont été déposés — indépendamment de leur
 * validation par un administrateur). Un client propriétaire d'une entreprise
 * doit en plus fournir RCCM et NIF.
 * @param {import('../models/User')} user
 * @returns {{ complet: boolean, manquants: string[] }}
 */
function verifierDossierComplet(user) {
  let requis = DOCUMENTS_REQUIS_PAR_ROLE[user.role] || DOCUMENTS_REQUIS_PAR_ROLE.client;
  if (user.entreprise?.roleEntreprise === "proprietaire") {
    requis = [...requis, ...DOCUMENTS_SUPPLEMENTAIRES_PROPRIETAIRE_ENTREPRISE];
  }
  const typesDeposees = new Set((user.kyc?.documents || []).map((d) => d.type));
  const manquants = requis.filter((type) => !typesDeposees.has(type));
  return { complet: manquants.length === 0, manquants };
}

module.exports = { DOCUMENTS_REQUIS_PAR_ROLE, DOCUMENTS_SUPPLEMENTAIRES_PROPRIETAIRE_ENTREPRISE, verifierDossierComplet };
