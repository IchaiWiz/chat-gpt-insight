/************************************************/
/* FICHIER : routes/uploadRoutes.js             */
/************************************************/
const express = require('express');
const router = express.Router();
const { upload, handleUpload, getPrices } = require('../controllers/uploadController');

// Route d'upload
// Note : on passe la fonction upload.single('zipfile') avant notre contrôleur
router.post('/', upload.single('zipfile'), (req, res) => {
  // On récupère io depuis req.app (stocké dans server.js) et on le transmet
  const ioInstance = req.app.get('io');
  handleUpload(req, res, ioInstance);
});

// Route pour récupérer les prix
router.get('/prices', getPrices);

module.exports = router;
