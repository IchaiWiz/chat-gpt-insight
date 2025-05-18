/********************************************************/
/* FICHIER : controllers/uploadController.js            */
/********************************************************/
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const AdmZip = require('adm-zip');
const jwt = require('jsonwebtoken');
const pool = require('../config/dbConfig');
const { Server } = require('socket.io');

// Sécurité : on peut utiliser process.env
const JWT_SECRET = process.env.JWT_SECRET || 'votre_secret_jwt_super_secret';

// On configure multer pour stocker temporairement le fichier ZIP dans uploads/
const upload = multer({ dest: 'uploads/' });

// Cette fonction gère l'upload et le traitement complet (POST /api/upload)
async function handleUpload(req, res, ioInstance) {
  try {
    // 1) Récupération du fichier ZIP
    if (!req.file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    // Vérifier si l'utilisateur est authentifié
    let userId = null;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userId = decoded.userId;
      } catch (err) {
        console.warn('Token invalide fourni:', err);
      }
    }

    const zipFilePath = req.file.path;
    const originalName = req.file.originalname;
    console.log('Fichier ZIP reçu :', originalName);

    // 2) Décompression du ZIP dans un dossier dédié
    const unzipFolderPath = path.join(__dirname, '..', 'uploads', `extracted_${Date.now()}`);
    fs.mkdirSync(unzipFolderPath);
    const zip = new AdmZip(zipFilePath);
    zip.extractAllTo(unzipFolderPath, true);
    console.log('Extraction dans :', unzipFolderPath);

    // 3) Vérifier et lire le fichier user.json
    const userJsonPath = path.join(unzipFolderPath, 'user.json');
    if (!fs.existsSync(userJsonPath)) {
      fs.rmSync(unzipFolderPath, { recursive: true, force: true });
      return res.status(400).json({ error: 'Le fichier user.json est manquant dans l\'archive.' });
    }

    let userData;
    try {
      userData = JSON.parse(fs.readFileSync(userJsonPath, 'utf-8'));
      if (!userData.email) {
        fs.rmSync(unzipFolderPath, { recursive: true, force: true });
        return res.status(400).json({ error: 'Le fichier user.json ne contient pas d\'email.' });
      }
    } catch (err) {
      fs.rmSync(unzipFolderPath, { recursive: true, force: true });
      return res.status(400).json({ error: 'Le fichier user.json est invalide.' });
    }

    // 4) Localiser le fichier de conversations
    const possibleFileNames = ['conversations.json', 'conversation.json', 'chatgpt_conversations.json'];
    let conversationFilePath = null;
    
    for (const fileName of possibleFileNames) {
      const testPath = path.join(unzipFolderPath, fileName);
      if (fs.existsSync(testPath)) {
        conversationFilePath = testPath;
        break;
      }
    }

    if (!conversationFilePath) {
      console.log('Contenu du dossier:', fs.readdirSync(unzipFolderPath));
      fs.rmSync(unzipFolderPath, { recursive: true, force: true });
      return res.status(400).json({ 
        error: 'Aucun fichier de conversations trouvé dans l\'archive. Veuillez vérifier que votre ZIP contient un fichier conversations.json, conversation.json ou chatgpt_conversations.json'
      });
    }

    // 5) Exécuter le script Python
    const structuredJsonPath = path.join(unzipFolderPath, 'structured.json');
    const statsOutputPath = path.join(unzipFolderPath, 'rapport_stats.json');
    const priceFilePath = path.join(__dirname, '..', 'scripts', 'price.json');

    const pythonScriptPath = path.join(__dirname, '..', 'scripts', 'run_script.py');
    const args = [
      conversationFilePath,
      structuredJsonPath,
      `--stats_output_file=${statsOutputPath}`,
      `--price_file=${priceFilePath}`,
      '--verbosity=progress'
    ];
    console.log('Lancement du script python avec args :', args);

    const pythonProcess = spawn('python', [pythonScriptPath, ...args], {
      cwd: path.join(__dirname, '..', 'scripts'),
    });

    let progressData = { percentage: 0, description: '' };

    pythonProcess.stdout.on('data', (data) => {
      const output = data.toString();
      console.log(`[Python STDOUT]: ${output}`);
      const progressMatch = output.match(/\[PROGRESS\] ([\d.]+)% - (.+)/);
      if (progressMatch) {
        progressData = {
          percentage: parseFloat(progressMatch[1]),
          description: progressMatch[2]
        };
        // Émettre la progression via socket.io
        ioInstance.emit('analysisProgress', progressData);
      }
    });

    pythonProcess.stderr.on('data', (data) => {
      const output = data.toString();
      console.error(`[Python STDERR]: ${output}`);
      const progressMatch = output.match(/\[PROGRESS\] ([\d.]+)% - (.+)/);
      if (progressMatch) {
        progressData = {
          percentage: parseFloat(progressMatch[1]),
          description: progressMatch[2]
        };
        ioInstance.emit('analysisProgress', progressData);
      }
    });

    pythonProcess.on('close', async (code) => {
      console.log(`Script Python terminé avec code ${code}`);

      if (code !== 0) {
        fs.rmSync(unzipFolderPath, { recursive: true, force: true });
        return res.status(500).json({ error: 'Le script Python a échoué.' });
      }

      if (!fs.existsSync(structuredJsonPath) || !fs.existsSync(statsOutputPath)) {
        fs.rmSync(unzipFolderPath, { recursive: true, force: true });
        return res.status(500).json({ error: 'Le script Python n\'a pas généré les fichiers attendus.' });
      }

      try {
        const structuredDataRaw = fs.readFileSync(structuredJsonPath, 'utf-8');
        const statsDataRaw = fs.readFileSync(statsOutputPath, 'utf-8');

        const structuredData = JSON.parse(structuredDataRaw);
        const statsData = JSON.parse(statsDataRaw);

        const details = structuredData; 
        const globalStats = statsData.global_stats || {};
        const costStatsCombined = statsData.cost_stats_combined_over_time || {};
        const messageStatsOverTime = statsData.message_stats_over_time || null;

        const output = {
          stats: {
            totalConversations: globalStats.total_conversations || 0,
            totalWords: globalStats.total_words || 0,
            totalInputTokens: globalStats.total_tokens_in || 0,
            totalOutputTokens: globalStats.total_tokens_out || 0,
            averageWordsPerConversation: globalStats.average_words_per_conversation || 0,
            totalCost: globalStats.total_cost || 0,
          },
          graphsData: {
            costs_by_model: costStatsCombined.costs_by_model || {},
            models: Object.keys(costStatsCombined.costs_by_model || {}),
            costs: Object.keys(costStatsCombined.costs_by_model || {}).map(
              (m) => costStatsCombined.costs_by_model[m].total_cost
            ),
            tokens: Object.keys(costStatsCombined.costs_by_model || {}).map(
              (m) => (costStatsCombined.costs_by_model[m].input_tokens
                      + costStatsCombined.costs_by_model[m].output_tokens)
            ),
          },
          messageStatsOverTime: messageStatsOverTime,
          details: details
        };

        // Mise à jour des stats côté BDD si l'utilisateur est authentifié
        if (userId) {
          try {
            const totalMessages = details.reduce((sum, conv) => sum + conv.messages.length, 0);
            await pool.query(
              `INSERT INTO user_stats_history (
                user_id,
                total_conversations,
                total_words,
                total_input_tokens,
                total_output_tokens,
                total_messages,
                average_words_per_conversation,
                total_cost
              ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
              [
                userId,
                globalStats.total_conversations || 0,
                globalStats.total_words || 0,
                globalStats.total_tokens_in || 0,
                globalStats.total_tokens_out || 0,
                totalMessages,
                globalStats.average_words_per_conversation || 0,
                globalStats.total_cost || 0
              ]
            );
          } catch (err) {
            console.error('Erreur lors de la mise à jour des statistiques utilisateur:', err);
          }
        }

        fs.rmSync(unzipFolderPath, { recursive: true, force: true });
        fs.rmSync(zipFilePath, { force: true });
        return res.json(output);

      } catch (err) {
        console.error('Erreur de parsing JSON :', err);
        return res.status(500).json({ error: 'Erreur interne lors du parsing des fichiers JSON.' });
      }
    });
  } catch (err) {
    console.error('Erreur dans /api/upload :', err);
    return res.status(500).json({ error: 'Erreur interne du serveur.' });
  }
}

// Route pour récupérer les prix (GET /api/prices)
function getPrices(req, res) {
  try {
    const priceFilePath = path.join(__dirname, '..', 'scripts', 'price.json');
    const priceData = JSON.parse(fs.readFileSync(priceFilePath, 'utf-8'));
    res.json(priceData);
  } catch (err) {
    console.error('Erreur lors de la lecture des prix:', err);
    res.status(500).json({ error: 'Erreur lors de la récupération des prix' });
  }
}

// Export de l'uploader Multer pour l'utiliser dans la route.
module.exports = {
  upload,
  handleUpload,
  getPrices
};
