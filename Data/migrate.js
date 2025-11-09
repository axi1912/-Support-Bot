// Script para migrar datos de database.json a MongoDB
require('dotenv').config({ path: '../Inusual BOT/.env' });
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');

// Leer datos del JSON
const jsonPath = path.join(__dirname, 'database.json');
const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Connection string de MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

// Schemas (mismo que db-mongo.js)
const ticketSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    channelId: String,
    userId: String,
    username: String,
    type: String,
    status: { type: String, default: 'open' },
    details: Object,
    createdAt: Date,
    updatedAt: Date,
    closedAt: Date
});

const vouchSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    fromUserId: String,
    fromUsername: String,
    toUserId: String,
    toUsername: String,
    stars: Number,
    comment: String,
    createdAt: Date
});

const verificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: String,
    verifiedAt: Date
});

const statsSchema = new mongoose.Schema({
    totalTickets: Number,
    activeTickets: Number,
    closedTickets: Number,
    totalVouches: Number,
    verifiedUsers: Number,
    updatedAt: Date
});

// Modelos
const Ticket = mongoose.model('Ticket', ticketSchema);
const Vouch = mongoose.model('Vouch', vouchSchema);
const Verification = mongoose.model('Verification', verificationSchema);
const Stats = mongoose.model('Stats', statsSchema);

async function migrate() {
    try {
        console.log('🔄 Conectando a MongoDB...');
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB');

        // Limpiar colecciones existentes
        console.log('🗑️  Limpiando colecciones...');
        await Ticket.deleteMany({});
        await Vouch.deleteMany({});
        await Verification.deleteMany({});
        await Stats.deleteMany({});

        // Migrar tickets
        console.log(`📦 Migrando ${jsonData.tickets.length} tickets...`);
        for (const ticket of jsonData.tickets) {
            await Ticket.create(ticket);
        }
        console.log(`✅ ${jsonData.tickets.length} tickets migrados`);

        // Migrar vouches
        console.log(`📦 Migrando ${jsonData.vouches.length} vouches...`);
        for (const vouch of jsonData.vouches) {
            await Vouch.create(vouch);
        }
        console.log(`✅ ${jsonData.vouches.length} vouches migrados`);

        // Migrar verificaciones (evitando duplicados)
        console.log(`📦 Migrando ${jsonData.verifications.length} verificaciones...`);
        let verificationCount = 0;
        for (const verification of jsonData.verifications) {
            try {
                await Verification.create(verification);
                verificationCount++;
            } catch (error) {
                if (error.code === 11000) {
                    console.log(`⚠️  Verificación duplicada omitida: ${verification.userId}`);
                } else {
                    throw error;
                }
            }
        }
        console.log(`✅ ${verificationCount} verificaciones migradas`);

        // Migrar stats
        console.log('📊 Migrando estadísticas...');
        await Stats.create({
            ...jsonData.stats,
            updatedAt: new Date()
        });
        console.log('✅ Estadísticas migradas');

        console.log('\n🎉 ¡MIGRACIÓN COMPLETADA EXITOSAMENTE!');
        console.log(`\n📊 RESUMEN:`);
        console.log(`   Tickets: ${jsonData.tickets.length}`);
        console.log(`   Vouches: ${jsonData.vouches.length}`);
        console.log(`   Verificaciones: ${jsonData.verifications.length}`);
        console.log(`   Stats: OK`);

        await mongoose.connection.close();
        console.log('\n✅ Conexión cerrada');
        
    } catch (error) {
        console.error('❌ Error en la migración:', error);
        process.exit(1);
    }
}

migrate();
