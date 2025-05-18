/*************************************************/
/* NOUVEAU FICHIER : routes/invoiceRoutes.js     */
/*************************************************/
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const {
  addInvoices,
  getInvoices,
  deleteInvoice,
  getInvoicesStats
} = require('../controllers/invoiceController');

// Ajouter une (ou des) facture(s)
router.post('/', authenticateToken, addInvoices);

// Récupérer toutes les factures d'un utilisateur
router.get('/', authenticateToken, getInvoices);

// Récupérer les stats de factures (total, ratio, etc.)
router.get('/stats', authenticateToken, getInvoicesStats);

// Supprimer une facture
router.delete('/:id', authenticateToken, deleteInvoice);

module.exports = router;
