const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middlewares/authMiddleware');
const { 
  createSubscription, 
  handleSubscriptionSuccess, 
  getPrices,
  cancelSubscription 
} = require('../controllers/paymentController');

// On protège la route avec authenticateToken si tu veux que l'utilisateur soit loggé pour payer
router.post('/create-subscription', authenticateToken, createSubscription);
router.post('/subscription-success', authenticateToken, handleSubscriptionSuccess);
router.post('/cancel-subscription', authenticateToken, cancelSubscription);
router.get('/prices', getPrices);

module.exports = router;
