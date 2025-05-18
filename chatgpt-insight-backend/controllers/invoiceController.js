/*****************************************************/
/* NOUVEAU FICHIER : controllers/invoiceController.js*/
/*****************************************************/
const pool = require('../config/dbConfig');
const moment = require('moment');

// POST /api/invoices
// Body attendu : { date, amount, count, customDates }
async function addInvoices(req, res) {
  try {
    const userId = req.user.userId;
    let { date, amount, count, customDates } = req.body;
    
    if (!amount) {
      return res.status(400).json({ error: 'Le montant de la facture est obligatoire.' });
    }

    // On parse la date si nécessaire
    let startDate;
    if (date) {
      startDate = moment(date, 'YYYY-MM-DD');
      if (!startDate.isValid()) {
        return res.status(400).json({ error: 'Date de facture invalide.' });
      }
    }

    const insertValues = [];

    // Si l'utilisateur fournit un count
    if (count && startDate) {
      for (let i = 0; i < count; i++) {
        const invoiceDate = startDate.clone().add(i, 'month');
        insertValues.push([userId, invoiceDate.format('YYYY-MM-DD'), amount]);
      }
    }
    // Si l'utilisateur fournit un tableau de dates précises
    if (Array.isArray(customDates) && customDates.length > 0) {
      customDates.forEach(cd => {
        const mDate = moment(cd, 'YYYY-MM-DD');
        if (mDate.isValid()) {
          insertValues.push([userId, mDate.format('YYYY-MM-DD'), amount]);
        }
      });
    }
    // Si aucune de ces options => facture unique
    if (!count && (!customDates || customDates.length === 0) && startDate) {
      insertValues.push([userId, startDate.format('YYYY-MM-DD'), amount]);
    }

    if (insertValues.length === 0) {
      return res.status(400).json({
        error: 'Aucune facture à ajouter. Vérifiez vos paramètres (date, count, customDates).'
      });
    }

    await pool.query(
      `INSERT INTO invoices (user_id, date, amount) VALUES ?`,
      [insertValues]
    );

    res.json({ message: 'Facture(s) ajoutée(s) avec succès.' });
  } catch (error) {
    console.error('Erreur lors de l\'ajout de factures:', error);
    res.status(500).json({ error: 'Erreur lors de l\'ajout de factures.' });
  }
}

// GET /api/invoices
async function getInvoices(req, res) {
  try {
    const userId = req.user.userId;
    const [rows] = await pool.query(
      `SELECT id, date, amount
       FROM invoices
       WHERE user_id = ?
       ORDER BY date DESC`,
      [userId]
    );
    res.json(rows);
  } catch (error) {
    console.error('Erreur lors de la récupération des factures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des factures.' });
  }
}

// GET /api/invoices/stats
// Donne le total des factures, et le ratio entre factures / total_cost (depuis user_stats_history)
async function getInvoicesStats(req, res) {
  try {
    const userId = req.user.userId;

    // Récupérer la somme totale des factures
    const [[{ totalInvoices }]] = await pool.query(
      `SELECT COALESCE(SUM(amount), 0) as totalInvoices
       FROM invoices
       WHERE user_id = ?`,
      [userId]
    );

    // Récupérer le dernier total_cost
    const [[{ totalOpenAICost }]] = await pool.query(
      `SELECT COALESCE(total_cost, 0) as totalOpenAICost
       FROM user_stats_history
       WHERE user_id = ?
       ORDER BY analysis_date DESC
       LIMIT 1`,
      [userId]
    );

    const ratio = totalOpenAICost > 0 ? (totalInvoices / totalOpenAICost) : 0;

    res.json({
      totalInvoices,
      totalOpenAICost,
      ratio
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques de factures:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques de factures.' });
  }
}

// DELETE /api/invoices/:id
async function deleteInvoice(req, res) {
  try {
    const userId = req.user.userId;
    const invoiceId = req.params.id;

    // Vérifier que la facture appartient bien à l'utilisateur
    const [rows] = await pool.query(
      `SELECT id FROM invoices WHERE id = ? AND user_id = ?`,
      [invoiceId, userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Facture introuvable ou vous n\'êtes pas autorisé.' });
    }

    await pool.query(
      `DELETE FROM invoices WHERE id = ?`,
      [invoiceId]
    );

    res.json({ message: 'Facture supprimée avec succès.' });
  } catch (error) {
    console.error('Erreur lors de la suppression de la facture:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression de la facture.' });
  }
}

module.exports = {
  addInvoices,
  getInvoices,
  deleteInvoice,
  getInvoicesStats
};
