/***********************************************/
/* FICHIER : routes/userRoutes.js             */
/***********************************************/
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { 
  getUserProfile, 
  getUserStatsHistory, 
  getUserRank,
  updateUserProfile,
  updateUserPassword,
  getUserSubscription
} = require('../controllers/userController');

// Récupérer le profil utilisateur
router.get('/profile', authenticateToken, getUserProfile);

// Mettre à jour le profil utilisateur
router.put('/profile', authenticateToken, updateUserProfile);

// Mettre à jour le mot de passe
router.put('/password', authenticateToken, updateUserPassword);

// Récupérer l'historique des stats
router.get('/stats/history', authenticateToken, getUserStatsHistory);

// Obtenir le classement (basé sur ratio factures / OpenAI)
router.get('/stats/rank', authenticateToken, getUserRank);

// Obtenir les informations de souscription
router.get('/subscription', authenticateToken, getUserSubscription);

module.exports = router;
