/*****************************/
/* FICHIER : server.js       */
/*****************************/
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');

// Import des routes
const authRoutes = require('./routes/authRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const userRoutes = require('./routes/userRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
// >>> NOUVELLES ROUTES <<<
const invoiceRoutes = require('./routes/invoicesRoutes');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE"]
  }
});
const PORT = process.env.PORT || 5000;

// On peut stocker io dans l'app pour le récupérer dans les contrôleurs
app.set('io', io);

// Socket.io : gérer les connexions
io.on('connection', (socket) => {
  console.log('Client connecté');
  socket.on('disconnect', () => {
    console.log('Client déconnecté');
  });
});

// Création du dossier uploads s'il n'existe pas
const fs = require('fs');
const path = require('path');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Middleware pour parser le JSON et activer CORS
app.use(express.json());
app.use(cors());

// Utilisation des routes existantes
app.use('/api/auth', authRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/user', userRoutes);
app.use('/api/payment', paymentRoutes);

// >>> Utilisation de la nouvelle route invoices <<<
app.use('/api/invoices', invoiceRoutes);

// Lancement du serveur
server.listen(PORT, () => {
  console.log(`Serveur démarré sur le port ${PORT}`);
});
