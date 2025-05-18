/*******************************************************/
/* FICHIER : controllers/userController.js            */
/*******************************************************/
const pool = require('../config/dbConfig');

const FREE_ANALYSIS_LIMIT = process.env.FREE_ANALYSIS_LIMIT || 5;

// Obtenir le nombre d'analyses du mois en cours
async function getMonthlyAnalysisCount(userId) {
  const [rows] = await pool.query(
    `SELECT COUNT(*) as count
     FROM user_stats_history
     WHERE user_id = ?
     AND MONTH(analysis_date) = MONTH(CURRENT_DATE())
     AND YEAR(analysis_date) = YEAR(CURRENT_DATE())`,
    [userId]
  );
  return rows[0].count;
}

// Récupérer le profil utilisateur (GET /api/user/profile)
async function getUserProfile(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        id,
        email,
        full_name,
        created_at,
        last_login,
        subscription_type
      FROM users 
      WHERE id = ?`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const user = rows[0];
    const monthlyAnalysisCount = await getMonthlyAnalysisCount(req.user.userId);
    const analysisLimit = user.subscription_type === 'premium' ? null : FREE_ANALYSIS_LIMIT;

    res.json({
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      created_at: user.created_at,
      last_login: user.last_login,
      subscription_type: user.subscription_type,
      monthly_analysis: {
        count: monthlyAnalysisCount,
        limit: analysisLimit
      }
    });
  } catch (err) {
    console.error('Erreur lors de la récupération du profil:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
  }
}

// Historique des stats (GET /api/user/stats/history)
async function getUserStatsHistory(req, res) {
  try {
    const [rows] = await pool.query(
      `SELECT 
        total_conversations,
        total_words,
        total_input_tokens,
        total_output_tokens,
        total_messages,
        average_words_per_conversation,
        total_cost,
        analysis_date
      FROM user_stats_history 
      WHERE user_id = ? 
      ORDER BY analysis_date ASC`,
      [req.user.userId]
    );
    res.json(rows);
  } catch (err) {
    console.error('Erreur lors de la récupération de l\'historique:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de l\'historique' });
  }
}

// Obtenir le classement (GET /api/user/stats/rank)
// Basé sur ratio : total_invoices_amount / total_cost
async function getUserRank(req, res) {
  console.log('🎯 Requête de classement reçue pour l\'utilisateur:', req.user.userId);
  
  try {
    // Récupérer tous les utilisateurs et calculer la somme de leurs factures + total_cost
    const [users] = await pool.query(`
      SELECT 
        u.id,
        COALESCE(
          (SELECT total_cost 
           FROM user_stats_history ush 
           WHERE ush.user_id = u.id 
           ORDER BY analysis_date DESC 
           LIMIT 1), 0
        ) as total_cost,
        COALESCE(
          (SELECT SUM(amount) 
           FROM invoices i 
           WHERE i.user_id = u.id
          ), 0
        ) as total_invoices_amount
      FROM users u
    `);

    console.log('📊 Nombre total d\'utilisateurs récupérés:', users.length);

    // Calculer le ratio pour chaque utilisateur (factures / cost)
    const usersWithRatio = users.map(user => {
      const ratio = (user.total_cost > 0) ? user.total_invoices_amount / user.total_cost : 0;
      console.log(`Utilisateur ${user.id}: total_cost=${user.total_cost}, total_invoices=${user.total_invoices_amount}, ratio=${ratio}`);
      return {
        ...user,
        ratio
      };
    });

    // Trier par ratio décroissant
    usersWithRatio.sort((a, b) => b.ratio - a.ratio);

    // Trouver le rang de l'utilisateur actuel
    const userRank = usersWithRatio.findIndex(u => u.id === req.user.userId) + 1;

    // Calculer le percentile
    const percentile = users.length > 1 
      ? Math.round(((users.length - userRank) / (users.length - 1)) * 100)
      : 100;

    console.log('📈 Statistiques de l\'utilisateur:', {
      userId: req.user.userId,
      rank: userRank,
      totalUsers: users.length,
      ratio: usersWithRatio.find(u => u.id === req.user.userId)?.ratio,
      percentile
    });

    res.json({
      rank: userRank,
      totalUsers: users.length,
      percentile
    });

  } catch (error) {
    console.error('❌ Erreur lors du calcul du classement:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({ 
      error: 'Erreur lors du calcul du classement',
      details: error.message 
    });
  }
}

// Mettre à jour le profil utilisateur (PUT /api/user/profile)
async function updateUserProfile(req, res) {
  try {
    const { full_name } = req.body;
    
    await pool.query(
      `UPDATE users 
       SET full_name = ?
       WHERE id = ?`,
      [full_name, req.user.userId]
    );

    res.json({ message: 'Profil mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du profil:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
  }
}

// Mettre à jour le mot de passe (PUT /api/user/password)
async function updateUserPassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;
    
    // Vérifier l'ancien mot de passe
    const [users] = await pool.query(
      'SELECT password FROM users WHERE id = ?',
      [req.user.userId]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const bcrypt = require('bcryptjs');
    const isValidPassword = await bcrypt.compare(currentPassword, users[0].password);

    if (!isValidPassword) {
      return res.status(400).json({ error: 'Mot de passe actuel incorrect' });
    }

    // Hasher et mettre à jour le nouveau mot de passe
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE users SET password = ? WHERE id = ?',
      [hashedPassword, req.user.userId]
    );

    res.json({ message: 'Mot de passe mis à jour avec succès' });
  } catch (err) {
    console.error('Erreur lors de la mise à jour du mot de passe:', err);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du mot de passe' });
  }
}

// Obtenir les informations de souscription (GET /api/user/subscription)
async function getUserSubscription(req, res) {
  try {
    // Récupérer les informations utilisateur et le dernier paiement
    const [rows] = await pool.query(
      `SELECT 
        u.subscription_type,
        u.subscription_expiry,
        u.stripe_customer_id,
        ph.stripe_invoice_id,
        ph.created_at as last_payment_date,
        ph.status as payment_status,
        ph.amount as last_payment_amount,
        ph.currency as last_payment_currency
      FROM users u
      LEFT JOIN (
        SELECT *
        FROM payment_history
        WHERE status = 'paid'
        ORDER BY created_at DESC
        LIMIT 1
      ) ph ON u.id = ph.user_id
      WHERE u.id = ?`,
      [req.user.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const subscription = rows[0];
    const now = new Date();
    
    // Si l'utilisateur a une date d'expiration (abonnement annulé)
    const expiryDate = subscription.subscription_expiry ? new Date(subscription.subscription_expiry) : null;
    const lastPaymentDate = subscription.last_payment_date ? new Date(subscription.last_payment_date) : null;
    
    // Un utilisateur est considéré premium si :
    // 1. Il a une date d'expiration future, ou
    // 2. Il est de type premium et a un paiement récent
    const is_active = (expiryDate && expiryDate > now) || 
                     (subscription.subscription_type === 'premium' && lastPaymentDate);

    res.json({
      status: is_active ? 'active' : 'inactive',
      subscription_type: subscription.subscription_type || 'free',
      current_period_end: expiryDate,
      stripe_customer_id: subscription.stripe_customer_id,
      latest_invoice: subscription.stripe_invoice_id ? {
        id: subscription.stripe_invoice_id,
        payment_status: subscription.payment_status,
        amount: subscription.last_payment_amount,
        currency: subscription.last_payment_currency,
        date: subscription.last_payment_date
      } : null
    });
  } catch (err) {
    console.error('Erreur lors de la récupération de la souscription:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération de la souscription' });
  }
}

module.exports = {
  getUserProfile,
  getUserStatsHistory,
  getUserRank,
  updateUserProfile,
  updateUserPassword,
  getMonthlyAnalysisCount,
  getUserSubscription
};
