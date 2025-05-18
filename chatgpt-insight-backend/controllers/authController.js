/****************************************************/
/* FICHIER : controllers/authController.js          */
/****************************************************/
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const pool = require('../config/dbConfig');

// Pareil, on récupère le secret depuis une variable d'environnement si possible.
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_secret';

// Route d'inscription (POST /api/auth/register)
async function registerUser(req, res) {
  const { email, password, full_name } = req.body;
  
  try {
    // Vérifier la longueur du mot de passe
    if (password.length < 8) {
      return res.status(400).json({ error: 'Le mot de passe doit contenir au moins 8 caractères' });
    }

    // Vérifier si l'utilisateur existe déjà
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length > 0) {
      return res.status(400).json({ error: 'Cet email est déjà utilisé' });
    }

    // Hasher le mot de passe
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insérer le nouvel utilisateur
    const [result] = await pool.query(
      'INSERT INTO users (email, password, full_name) VALUES (?, ?, ?)',
      [email, hashedPassword, full_name]
    );

    // Générer le token JWT
    const token = jwt.sign(
      { userId: result.insertId, email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: result.insertId });
  } catch (err) {
    console.error('Erreur lors de l\'inscription:', err);
    res.status(500).json({ error: 'Erreur lors de l\'inscription' });
  }
}

// Route de connexion (POST /api/auth/login)
async function loginUser(req, res) {
  const { email, password } = req.body;

  try {
    // Rechercher l'utilisateur
    const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
    if (users.length === 0) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    const user = users[0];

    // Vérifier le mot de passe
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
    }

    // Générer le token JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, userId: user.id });
  } catch (err) {
    console.error('Erreur lors de la connexion:', err);
    res.status(500).json({ error: 'Erreur lors de la connexion' });
  }
}

// Route pour vérifier si le token est valide (GET /api/auth/verify)
function verifyToken(req, res) {
  // Grâce au middleware authenticateToken, on sait que le token est valide.
  res.json({ userId: req.user.userId, email: req.user.email });
}

module.exports = {
  registerUser,
  loginUser,
  verifyToken
};
