/*******************************/
/* FICHIER : config/dbConfig.js*/
/*******************************/
const mysql = require('mysql2/promise');

// Configuration de la base de données. 
// Pense à utiliser des variables d'environnement (process.env) en production.
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'chatgpt_insight'
};

// Création et export du pool de connexions.
const pool = mysql.createPool(dbConfig);

module.exports = pool;
