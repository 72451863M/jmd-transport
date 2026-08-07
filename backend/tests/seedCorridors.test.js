const mock = require("mock-require");
let corridorsDB = {};
let counter = 1;
const FakeCorridor = {
  findOne: async (filter) => Object.values(corridorsDB).find((c) => c.nom === filter.nom) || null,
  create: async (data) => {
    const doc = { _id: "cor" + counter++, ...data };
    corridorsDB[doc._id] = doc;
    return doc;
  },
};
mock("../models/Corridor", FakeCorridor);
const { seedCorridors, CORRIDORS_REFERENCE } = require("../jobs/seedCorridors");

(async () => {
  const r1 = await seedCorridors();
  console.log("1er passage:", r1);
  console.assert(r1.crees === CORRIDORS_REFERENCE.length, "tous les corridors créés au premier passage");
  const r2 = await seedCorridors();
  console.log("2e passage (rejouer le script):", r2);
  console.assert(r2.crees === 0, "aucun doublon créé si on relance le script");
  console.log("\n✅ Script de peuplement des corridors idempotent et correct");
})();
