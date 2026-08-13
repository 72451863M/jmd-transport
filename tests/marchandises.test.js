const { verifierCompatibiliteVehicule, TYPES_MARCHANDISE, NECESSITE_DECLARATION } = require("../utils/marchandises");

let ok = 0, fail = 0;
function assert(cond, label) { if (cond) { ok++; console.log("✅", label); } else { fail++; console.log("❌", label); } }

// --- 8 types bien présents (fidélité au cahier des charges) ---
assert(TYPES_MARCHANDISE.length === 8, "Exactement 8 types de marchandise, comme spécifié");
["colis", "palettes", "materiaux_construction", "produits_agricoles", "produits_petroliers", "produits_dangereux", "produits_refrigeres", "conteneurs"].forEach((t) => {
  assert(TYPES_MARCHANDISE.includes(t), `Le type "${t}" est bien présent`);
});

// --- colis : aucune contrainte de véhicule ---
let res = verifierCompatibiliteVehicule("colis", null);
assert(res.compatible === true, "Colis compatible avec n'importe quel véhicule (même aucun choisi)");
res = verifierCompatibiliteVehicule("colis", { type: "moto" });
assert(res.compatible === true, "Colis compatible avec une moto");

// --- produits_refrigeres : nécessite un véhicule frigorifique ---
res = verifierCompatibiliteVehicule("produits_refrigeres", { type: "camion" });
assert(res.compatible === false, "Un camion standard n'est pas compatible avec des produits réfrigérés");
assert(res.message.includes("frigorifique"), "Le message d'erreur mentionne le type de véhicule requis");
res = verifierCompatibiliteVehicule("produits_refrigeres", { type: "frigorifique" });
assert(res.compatible === true, "Un véhicule frigorifique est compatible avec des produits réfrigérés");

// --- produits_refrigeres sans véhicule choisi du tout ---
res = verifierCompatibiliteVehicule("produits_refrigeres", null);
assert(res.compatible === false, "Aucun véhicule choisi -> incompatible si le type l'exige");

// --- produits_petroliers : nécessite une citerne ---
res = verifierCompatibiliteVehicule("produits_petroliers", { type: "camion" });
assert(res.compatible === false, "Un camion standard n'est pas compatible avec des produits pétroliers");
res = verifierCompatibiliteVehicule("produits_petroliers", { type: "citerne" });
assert(res.compatible === true, "Une citerne est compatible avec des produits pétroliers");

// --- conteneurs : nécessite un semi-remorque ---
res = verifierCompatibiliteVehicule("conteneurs", { type: "camion" });
assert(res.compatible === false, "Un camion simple n'est pas compatible avec des conteneurs");
res = verifierCompatibiliteVehicule("conteneurs", { type: "semi_remorque" });
assert(res.compatible === true, "Un semi-remorque est compatible avec des conteneurs");

// --- materiaux_construction : exclut les petits véhicules ---
res = verifierCompatibiliteVehicule("materiaux_construction", { type: "moto" });
assert(res.compatible === false, "Une moto n'est pas compatible avec des matériaux de construction");
res = verifierCompatibiliteVehicule("materiaux_construction", { type: "camionnette" });
assert(res.compatible === false, "Une camionnette n'est pas jugée assez robuste pour des matériaux de construction");
res = verifierCompatibiliteVehicule("materiaux_construction", { type: "camion" });
assert(res.compatible === true, "Un camion est compatible avec des matériaux de construction");

// --- produits_dangereux : accepte plusieurs types robustes ---
res = verifierCompatibiliteVehicule("produits_dangereux", { type: "citerne" });
assert(res.compatible === true, "Une citerne est compatible avec des produits dangereux");
res = verifierCompatibiliteVehicule("produits_dangereux", { type: "moto" });
assert(res.compatible === false, "Une moto n'est pas compatible avec des produits dangereux");

// --- déclaration obligatoire pour matières sensibles uniquement ---
assert(NECESSITE_DECLARATION.includes("produits_petroliers"), "Les produits pétroliers nécessitent une déclaration");
assert(NECESSITE_DECLARATION.includes("produits_dangereux"), "Les produits dangereux nécessitent une déclaration");
assert(!NECESSITE_DECLARATION.includes("colis"), "Les colis ne nécessitent pas de déclaration");
assert(!NECESSITE_DECLARATION.includes("produits_agricoles"), "Les produits agricoles ne nécessitent pas de déclaration");

console.log(`\n${ok} tests réussis, ${fail} échoués`);
process.exit(fail > 0 ? 1 : 0);
