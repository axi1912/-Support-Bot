const mongoose = require('mongoose');

// Connection URI - se configura desde .env
const MONGODB_URI = process.env.MONGODB_URI || '';

// Conectar a MongoDB
async function connectDB() {
    try {
        await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log('✅ Conectado a MongoDB Atlas');
    } catch (error) {
        console.error('❌ Error al conectar a MongoDB:', error);
        process.exit(1);
    }
}

// Schemas de MongoDB
const ticketSchema = new mongoose.Schema({
    id: { type: Number, required: true, unique: true },
    channelId: String,
    userId: String,
    username: String,
    type: String,
    status: { type: String, default: 'open' },
    details: {
        package: String,
        price: String,
        quantity: Number,
        duration: String,
        botType: String,
        description: String
    },
    createdAt: { type: Date, default: Date.now },
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
    createdAt: { type: Date, default: Date.now }
});

const verificationSchema = new mongoose.Schema({
    userId: { type: String, required: true, unique: true },
    username: String,
    verifiedAt: { type: Date, default: Date.now }
});

const statsSchema = new mongoose.Schema({
    totalTickets: { type: Number, default: 0 },
    activeTickets: { type: Number, default: 0 },
    closedTickets: { type: Number, default: 0 },
    totalVouches: { type: Number, default: 0 },
    verifiedUsers: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

// Modelos
const Ticket = mongoose.model('Ticket', ticketSchema);
const Vouch = mongoose.model('Vouch', vouchSchema);
const Verification = mongoose.model('Verification', verificationSchema);
const Stats = mongoose.model('Stats', statsSchema);

// Funciones de base de datos

// Inicializar stats si no existen
async function initStats() {
    try {
        let stats = await Stats.findOne();
        if (!stats) {
            stats = new Stats();
            await stats.save();
        }
        return stats;
    } catch (error) {
        console.error('Error al inicializar stats:', error);
        return null;
    }
}

// Agregar ticket
async function addTicket(ticketData) {
    try {
        const ticket = new Ticket(ticketData);
        await ticket.save();
        
        // Actualizar stats
        await Stats.updateOne({}, {
            $inc: { totalTickets: 1, activeTickets: 1 },
            $set: { updatedAt: new Date() }
        });
        
        return true;
    } catch (error) {
        console.error('Error al agregar ticket:', error);
        return false;
    }
}

// Actualizar detalles del ticket
async function updateTicketDetails(ticketId, details) {
    try {
        await Ticket.updateOne(
            { id: ticketId },
            { 
                $set: { 
                    details: details,
                    updatedAt: new Date()
                }
            }
        );
        return true;
    } catch (error) {
        console.error('Error al actualizar ticket:', error);
        return false;
    }
}

// Obtener ticket por ID
async function getTicketById(ticketId) {
    try {
        return await Ticket.findOne({ id: ticketId });
    } catch (error) {
        console.error('Error al obtener ticket:', error);
        return null;
    }
}

// Obtener ticket por Channel ID
async function getTicketByChannelId(channelId) {
    try {
        return await Ticket.findOne({ channelId: channelId });
    } catch (error) {
        console.error('Error al obtener ticket:', error);
        return null;
    }
}

// Cerrar ticket
async function closeTicket(ticketId) {
    try {
        await Ticket.updateOne(
            { id: ticketId },
            { 
                $set: { 
                    status: 'closed',
                    closedAt: new Date()
                }
            }
        );
        
        // Actualizar stats
        await Stats.updateOne({}, {
            $inc: { activeTickets: -1, closedTickets: 1 },
            $set: { updatedAt: new Date() }
        });
        
        return true;
    } catch (error) {
        console.error('Error al cerrar ticket:', error);
        return false;
    }
}

// Agregar vouch
async function addVouch(vouchData) {
    try {
        const vouch = new Vouch(vouchData);
        await vouch.save();
        
        // Actualizar stats
        await Stats.updateOne({}, {
            $inc: { totalVouches: 1 },
            $set: { updatedAt: new Date() }
        });
        
        return true;
    } catch (error) {
        console.error('Error al agregar vouch:', error);
        return false;
    }
}

// Agregar verificación
async function addVerification(userId, username) {
    try {
        const verification = new Verification({
            userId,
            username,
            verifiedAt: new Date()
        });
        await verification.save();
        
        // Actualizar stats
        await Stats.updateOne({}, {
            $inc: { verifiedUsers: 1 },
            $set: { updatedAt: new Date() }
        });
        
        return true;
    } catch (error) {
        console.error('Error al agregar verificación:', error);
        return false;
    }
}

// Obtener estadísticas
async function getStats() {
    try {
        let stats = await Stats.findOne();
        if (!stats) {
            stats = await initStats();
        }
        return stats;
    } catch (error) {
        console.error('Error al obtener stats:', error);
        return null;
    }
}

// Obtener todos los tickets
async function getAllTickets() {
    try {
        return await Ticket.find().sort({ createdAt: -1 });
    } catch (error) {
        console.error('Error al obtener tickets:', error);
        return [];
    }
}

// Obtener tickets activos
async function getActiveTickets() {
    try {
        return await Ticket.find({ status: 'open' }).sort({ createdAt: -1 });
    } catch (error) {
        console.error('Error al obtener tickets activos:', error);
        return [];
    }
}

// Obtener todos los vouches
async function getAllVouches() {
    try {
        return await Vouch.find().sort({ createdAt: -1 });
    } catch (error) {
        console.error('Error al obtener vouches:', error);
        return [];
    }
}

// Obtener vouches de un usuario
async function getUserVouches(userId) {
    try {
        return await Vouch.find({ toUserId: userId }).sort({ createdAt: -1 });
    } catch (error) {
        console.error('Error al obtener vouches del usuario:', error);
        return [];
    }
}

// Leer datos (para compatibilidad con versión anterior)
async function readData() {
    try {
        const tickets = await getAllTickets();
        const vouches = await getAllVouches();
        const verifications = await Verification.find();
        const stats = await getStats();
        
        return {
            tickets,
            vouches,
            verifications,
            stats
        };
    } catch (error) {
        console.error('Error al leer datos:', error);
        return null;
    }
}

module.exports = {
    connectDB,
    initStats,
    readData,
    addTicket,
    updateTicketDetails,
    getTicketById,
    getTicketByChannelId,
    closeTicket,
    addVouch,
    addVerification,
    getStats,
    getAllTickets,
    getActiveTickets,
    getAllVouches,
    getUserVouches
};
