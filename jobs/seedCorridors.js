// Peuple la collection Corridor avec les corridors cités au Chapitre 5 du
// cahier des charges (Module 27), en données de référence uniquement.
// Utilisation : node jobs/seedCorridors.js

const Corridor = require("../models/Corridor");

const CORRIDORS_REFERENCE = [
  { nom: "Dakar–Bamako", paysDepart: "Sénégal", paysArrivee: "Mali", villesPrincipales: ["Dakar", "Kayes", "Bamako"] },
  { nom: "Bamako–Dakar", paysDepart: "Mali", paysArrivee: "Sénégal", villesPrincipales: ["Bamako", "Kayes", "Dakar"] },
  { nom: "Abidjan–Bamako", paysDepart: "Côte d'Ivoire", paysArrivee: "Mali", villesPrincipales: ["Abidjan", "Ferkessédougou", "Sikasso", "Bamako"] },
  { nom: "Bamako–Abidjan", paysDepart: "Mali", paysArrivee: "Côte d'Ivoire", villesPrincipales: ["Bamako", "Sikasso", "Ferkessédougou", "Abidjan"] },
  { nom: "Lomé–Ouagadougou", paysDepart: "Togo", paysArrivee: "Burkina Faso", villesPrincipales: ["Lomé", "Cinkassé", "Ouagadougou"] },
  { nom: "Ouagadougou–Lomé", paysDepart: "Burkina Faso", paysArrivee: "Togo", villesPrincipales: ["Ouagadougou", "Cinkassé", "Lomé"] },
];

async function seedCorridors() {
  let crees = 0;
  for (const c of CORRIDORS_REFERENCE) {
    const existe = await Corridor.findOne({ nom: c.nom });
    if (!existe) {
      await Corridor.create(c);
      crees++;
    }
  }
  return { total: CORRIDORS_REFERENCE.length, crees };
}

if (require.main === module) {
  require("dotenv").config();
  const connectDB = require("../config/db");
  (async () => {
    await connectDB();
    const resultat = await seedCorridors();
    console.log(`✅ Corridors : ${resultat.crees}/${resultat.total} créés (les autres existaient déjà).`);
    process.exit(0);
  })().catch((err) => {
    console.error("❌ Échec du peuplement des corridors :", err.message);
    process.exit(1);
  });
}

module.exports = { seedCorridors, CORRIDORS_REFERENCE };
