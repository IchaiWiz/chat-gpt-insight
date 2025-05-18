/***********************************************/
/* FICHIER : routes/authRoutes.js             */
/***********************************************/
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { registerUser, loginUser, verifyToken } = require('../controllers/authController');

// Inscription
router.post('/register', registerUser);

// Connexion
router.post('/login', loginUser);

// Vérification du token
router.get('/verify', authenticateToken, verifyToken);

module.exports = router;
