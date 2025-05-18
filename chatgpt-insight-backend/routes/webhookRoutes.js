const express = require('express');
const router = express.Router();
const { handleWebhook } = require('../controllers/webhookController');

// Cette route doit être accessible publiquement (pas de middleware d'authentification)
router.post('/stripe', express.raw({ type: 'application/json' }), handleWebhook);

module.exports = router; 