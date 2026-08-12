const JournalAudit = require("../models/JournalAudit");

/**
 * Enregistre une entrée dans le journal d'audit (Module 25). Conçue pour
 * être appelée depuis les autres contrôleurs, exactement comme notifier()
 * pour les notifications.
 *
 * Volontairement non bloquante pour l'appelant : si l'écriture échoue,
 * l'erreur est journalisée en console mais ne fait jamais échouer l'action
 * métier d'origine (ex. la modification d'un véhicule ne doit pas planter
 * parce que le journal d'audit n'a pas pu être écrit).
 */
async function enregistrerAudit({ utilisateur, typeAction, ressource, ressourceId, description }) {
  try {
    return await JournalAudit.create({
      utilisateur: utilisateur || null,
      typeAction,
      ressource,
      ressourceId: ressourceId || null,
      description,
    });
  } catch (error) {
    console.error("[audit] échec d'enregistrement :", error.message);
    return null;
  }
}

module.exports = { enregistrerAudit };
