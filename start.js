// Wrapper to initialize MongoDB before starting the bot
require('dotenv').config();
const db = require('../Data/db-mongo');

async function start() {
    // Conectar a MongoDB
    await db.connectDB();
    await db.initStats();
    
    // Iniciar el bot
    require('./index.js');
}

start().catch(console.error);
