const Stripe = require('stripe');
const pool = require('../config/dbConfig');
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

async function handleWebhook(req, res) {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Erreur de signature webhook:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        const customerId = subscription.customer;
        
        // Récupérer l'utilisateur par son Stripe Customer ID
        const [users] = await pool.query(
          'SELECT id FROM users WHERE stripe_customer_id = ?',
          [customerId]
        );
        
        if (users.length === 0) {
          console.error('Utilisateur non trouvé pour le customer_id:', customerId);
          return res.json({ received: true });
        }
        
        const userId = users[0].id;
        const now = new Date();
        
        if (event.type === 'customer.subscription.deleted' || subscription.status === 'canceled') {
          // Mettre à jour le statut de l'abonnement en "free"
          await pool.query(
            'UPDATE users SET subscription_type = ? WHERE id = ?',
            ['free', userId]
          );
          
          // Ajouter une entrée dans l'historique des paiements
          const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
          await pool.query(
            `INSERT INTO payment_history 
             (user_id, amount, currency, status, stripe_invoice_id)
             VALUES (?, 0, ?, 'cancelled', ?)`,
            [userId, subscription.currency, invoice.id]
          );
        } else if (subscription.status === 'active') {
          // Renouvellement réussi
          const invoice = await stripe.invoices.retrieve(subscription.latest_invoice);
          await pool.query(
            `INSERT INTO payment_history 
             (user_id, amount, currency, status, stripe_invoice_id)
             VALUES (?, ?, ?, 'paid', ?)`,
            [userId, subscription.plan.amount / 100, subscription.currency, invoice.id]
          );
        }
        break;
      }
      
      case 'invoice.payment_failed': {
        const invoice = event.data.object;
        const customerId = invoice.customer;
        
        // Récupérer l'utilisateur
        const [users] = await pool.query(
          'SELECT id, email FROM users WHERE stripe_customer_id = ?',
          [customerId]
        );
        
        if (users.length > 0) {
          // Ici vous pourriez envoyer un email à l'utilisateur
          console.log(`Échec de paiement pour l'utilisateur ${users[0].email}`);
        }
        break;
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Erreur lors du traitement du webhook:', err);
    res.status(500).json({ error: 'Erreur lors du traitement du webhook.' });
  }
}

module.exports = { handleWebhook }; 