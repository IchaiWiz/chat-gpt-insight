/**************************************************/
/* FICHIER : middlewares/authMiddleware.js        */
/**************************************************/
const jwt = require('jsonwebtoken');

// On peut utiliser une variable d'environnement pour le secret.
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_secret';

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token manquant' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token invalide' });
    }
    req.user = user;
    next();
  });
};

module.exports = { authenticateToken };
