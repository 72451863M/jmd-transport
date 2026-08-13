const Document = require("../models/Document");
const Livraison = require("../models/Livraison");

async function estAutoriseSurLivraison(livraisonId, userId, userRole) {
  const livraison = await Livraison.findById(livraisonId);
  if (!livraison) return { autorise: false, livraison: null };
  if (userRole === "admin") return { autorise: true, livraison };
  const estClient = livraison.client.toString() === userId.toString();
  const estTransporteur = livraison.transporteur && livraison.transporteur.toString() === userId.toString();
  return { autorise: estClient || estTransporteur, livraison };
}

// @desc    Liste des documents d'une livraison
// @route   GET /api/livraisons/:id/documents
// @access  Privé (client, transporteur assigné, ou admin)
const getDocumentsLivraison = async (req, res) => {
  try {
    const { autorise } = await estAutoriseSurLivraison(req.params.id, req.user._id, req.user.role);
    if (!autorise) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à consulter les documents de cette livraison" });
    }

    const documents = await Document.find({ livraison: req.params.id }).sort({ createdAt: -1 });
    return res.status(200).json(documents);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

// @desc    Ajouter un document à une livraison (bon de livraison, assurance, photo, autre)
// @route   POST /api/livraisons/:id/documents
// @access  Privé (client ou transporteur de la livraison)
const ajouterDocument = async (req, res) => {
  try {
    const { type, url } = req.body;
    const typesAjoutablesManuel = ["bon_livraison", "facture", "assurance", "photo", "autre"];

    if (!typesAjoutablesManuel.includes(type) || !url) {
      return res.status(400).json({ message: "Type de document ou URL invalide" });
    }

    const { autorise } = await estAutoriseSurLivraison(req.params.id, req.user._id, req.user.role);
    if (!autorise) {
      return res.status(403).json({ message: "Vous n'êtes pas autorisé à ajouter un document à cette livraison" });
    }

    const document = await Document.create({
      livraison: req.params.id,
      type,
      url,
      ajoutePar: req.user._id,
    });

    return res.status(201).json(document);
  } catch (error) {
    return res.status(500).json({ message: "Erreur serveur", error: error.message });
  }
};

module.exports = { getDocumentsLivraison, ajouterDocument };
