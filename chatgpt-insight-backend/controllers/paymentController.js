const Stripe = require('stripe');
const pool = require('../config/dbConfig');

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('La clé secrète Stripe (STRIPE_SECRET_KEY) n\'est pas définie dans les variables d\'environnement');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ID du produit Stripe
const PRODUCT_ID = 'prod_RcEgi3Dtf8cprd';

async function getPrices(req, res) {
  try {
    // Récupérer tous les prix actifs pour notre produit
    console.log('Récupération des prix pour le produit:', PRODUCT_ID);
    const prices = await stripe.prices.list({
      product: PRODUCT_ID,
      active: true,
      expand: ['data.product']
    });

    console.log('Prix reçus de Stripe:', JSON.stringify(prices.data, null, 2));

    // Si des prix sont trouvés, les utiliser
    if (prices.data.length > 0) {
      const formattedPrices = {};
      prices.data.forEach(price => {
        console.log('Traitement du prix:', price.id);
        formattedPrices[price.currency] = {
          id: price.id,
          amount: price.unit_amount,
          currency: price.currency,
          interval: price.recurring?.interval,
          interval_count: price.recurring?.interval_count
        };
      });
      console.log('Prix formatés:', JSON.stringify(formattedPrices, null, 2));
      return res.json(formattedPrices);
    } else {
      console.log('Aucun prix trouvé pour le produit');
    }

    // Si aucun prix n'est trouvé, utiliser les prix par défaut
    const defaultPrices = {
      eur: {
        id: 'price_default_eur',
        amount: 99,
        currency: 'eur',
        interval: 'month',
        interval_count: 1
      },
      usd: {
        id: 'price_default_usd',
        amount: 99,
        currency: 'usd',
        interval: 'month',
        interval_count: 1
      }
    };

    console.log('Retour des prix par défaut:', JSON.stringify(defaultPrices, null, 2));
    res.json(defaultPrices);
  } catch (error) {
    console.error('Erreur détaillée lors de la récupération des prix:', error);
    res.status(500).json({ 
      error: 'Erreur lors de la récupération des prix.',
      details: error.message 
    });
  }
}

async function createSubscription(req, res) {
  try {
    const { userId } = req.user;
    const userCurrency = req.body.currency || 'eur';

    // Récupérer le prix pour la devise demandée
    const prices = await stripe.prices.list({
      product: PRODUCT_ID,
      active: true,
      currency: userCurrency
    });

    if (prices.data.length === 0) {
      return res.status(400).json({ error: 'Aucun prix trouvé pour cette devise' });
    }

    const priceId = prices.data[0].id;

    // Récupérer les informations de l'utilisateur
    const [users] = await pool.query('SELECT * FROM users WHERE id = ?', [userId]);
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    const user = users[0];

    // Créer ou récupérer le client Stripe
    let customer;
    if (user.stripe_customer_id) {
      customer = await stripe.customers.retrieve(user.stripe_customer_id);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        name: user.full_name
      });
      await pool.query('UPDATE users SET stripe_customer_id = ? WHERE id = ?', 
        [customer.id, userId]
      );
    }

    // Créer une session de paiement pour l'abonnement
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      success_url: `${process.env.FRONTEND_URL}/checkout?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/checkout?success=false`,
      metadata: {
        userId: userId.toString(),
      },
      allow_promotion_codes: true,
      billing_address_collection: 'required',
      customer_update: {
        address: 'auto'
      }
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    console.error('Erreur lors de la création de l\'abonnement:', error);
    res.status(500).json({ error: 'Erreur lors de la création de l\'abonnement.' });
  }
}

async function handleSubscriptionSuccess(req, res) {
  console.log('Début du traitement handleSubscriptionSuccess');
  try {
    const { sessionId } = req.body;
    console.log('SessionId reçu:', sessionId);
    
    console.log('Récupération de la session Stripe...');
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription', 'invoice']
    });
    console.log('Session Stripe récupérée:', session.id);
    
    if (session.payment_status !== 'paid') {
      console.log('Paiement non complété, statut:', session.payment_status);
      return res.status(400).json({ error: 'Le paiement n\'est pas complété' });
    }

    const userId = parseInt(session.metadata.userId);
    console.log('UserId extrait:', userId);

    // Mettre à jour le statut de l'abonnement
    const now = new Date();
    console.log('Ajout dans l\'historique des paiements...');
    await pool.query(
      `INSERT INTO payment_history 
       (user_id, amount, currency, status, stripe_invoice_id)
       VALUES (?, ?, ?, 'paid', ?)`,
      [userId, session.amount_total / 100, session.currency.toLowerCase(), session.invoice.id]
    );

    console.log('Mise à jour du type d\'abonnement de l\'utilisateur...');
    await pool.query(
      'UPDATE users SET subscription_type = ? WHERE id = ?',
      ['premium', userId]
    );

    console.log('Traitement terminé avec succès');
    res.json({ success: true });
  } catch (error) {
    console.error('Erreur détaillée lors du traitement de l\'abonnement:', error);
    res.status(500).json({ 
      error: 'Erreur lors du traitement de l\'abonnement.',
      details: error.message 
    });
  }
}

const cancelSubscription = async (req, res) => {
  try {
    const userId = req.user.userId;
    
    // 1. Récupérer les informations de l'utilisateur
    const [userRows] = await pool.query(
      'SELECT stripe_customer_id FROM users WHERE id = ?',
      [userId]
    );

    if (!userRows.length) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }

    const stripeCustomerId = userRows[0].stripe_customer_id;

    // 2. Récupérer les abonnements actifs dans Stripe
    const subscriptions = await stripe.subscriptions.list({
      customer: stripeCustomerId,
      status: 'active',
      limit: 1
    });

    if (subscriptions.data.length > 0) {
      // 3. Annuler l'abonnement dans Stripe
      const subscription = subscriptions.data[0];
      await stripe.subscriptions.update(subscription.id, {
        cancel_at_period_end: true
      });

      // 4. Mettre à jour la base de données
      await pool.query(
        `UPDATE users 
         SET subscription_expiry = FROM_UNIXTIME(?),
             subscription_type = 'free'
         WHERE id = ?`,
        [subscription.current_period_end, userId]
      );

      // 5. Enregistrer l'historique de paiement
      await pool.query(
        `INSERT INTO payment_history (user_id, amount, currency, status, stripe_invoice_id, created_at)
         VALUES (?, 0.00, 'eur', 'cancelled', ?, NOW())`,
        [userId, subscription.latest_invoice]
      );

      res.json({ 
        success: true, 
        message: 'Abonnement annulé avec succès',
        expiry_date: new Date(subscription.current_period_end * 1000)
      });
    } else {
      // Si aucun abonnement actif n'est trouvé, mettre quand même à jour l'utilisateur
      await pool.query(
        `UPDATE users 
         SET subscription_type = 'free',
             subscription_expiry = NULL
         WHERE id = ?`,
        [userId]
      );

      res.json({ 
        success: true, 
        message: 'Statut utilisateur mis à jour' 
      });
    }
  } catch (error) {
    console.error('Erreur lors de l\'annulation de l\'abonnement:', error);
    res.status(500).json({ 
      error: 'Erreur lors de l\'annulation de l\'abonnement',
      details: error.message 
    });
  }
};

module.exports = { createSubscription, handleSubscriptionSuccess, getPrices, cancelSubscription };
