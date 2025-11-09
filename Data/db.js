const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', 'Data', 'database.json');

// Leer datos
function readData() {
    try {
        const data = fs.readFileSync(DATA_PATH, 'utf8');
        return JSON.parse(data);
    } catch (error) {
        console.error('Error reading data:', error);
        return null;
    }
}

// Escribir datos
function writeData(data) {
    try {
        fs.writeFileSync(DATA_PATH, JSON.stringify(data, null, 2), 'utf8');
        return true;
    } catch (error) {
        console.error('Error writing data:', error);
        return false;
    }
}

// Agregar ticket
function addTicket(ticket) {
    const data = readData();
    if (!data) return false;
    
    data.tickets.push(ticket);
    data.stats.totalTickets++;
    data.stats.activeTickets++;
    
    return writeData(data);
}

// Actualizar detalles del ticket (cuando seleccionan paquete)
function updateTicketDetails(ticketId, details) {
    const data = readData();
    if (!data) return false;
    
    const ticket = data.tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.details = details;
        ticket.updatedAt = new Date().toISOString();
    }
    
    return writeData(data);
}

// Obtener ticket por ID
function getTicketById(ticketId) {
    const data = readData();
    if (!data) return null;
    
    return data.tickets.find(t => t.id === ticketId);
}

// Obtener ticket por Channel ID
function getTicketByChannelId(channelId) {
    const data = readData();
    if (!data) return null;
    
    return data.tickets.find(t => t.channelId === channelId);
}

// Cerrar ticket
function closeTicket(ticketId) {
    const data = readData();
    if (!data) return false;
    
    const ticket = data.tickets.find(t => t.id === ticketId);
    if (ticket) {
        ticket.status = 'closed';
        ticket.closedAt = new Date().toISOString();
        data.stats.activeTickets--;
        data.stats.closedTickets++;
    }
    
    return writeData(data);
}

// Agregar vouch
function addVouch(vouch) {
    const data = readData();
    if (!data) return false;
    
    data.vouches.push(vouch);
    data.stats.totalVouches++;
    
    return writeData(data);
}

// Agregar verificación
function addVerification(userId, username) {
    const data = readData();
    if (!data) return false;
    
    data.verifications.push({
        userId,
        username,
        verifiedAt: new Date().toISOString()
    });
    data.stats.verifiedUsers++;
    
    return writeData(data);
}

// Obtener estadísticas
function getStats() {
    const data = readData();
    return data ? data.stats : null;
}

// Obtener todos los tickets
function getAllTickets() {
    const data = readData();
    return data ? data.tickets : [];
}

// Obtener tickets activos
function getActiveTickets() {
    const data = readData();
    return data ? data.tickets.filter(t => t.status === 'open') : [];
}

// Obtener todos los vouches
function getAllVouches() {
    const data = readData();
    return data ? data.vouches : [];
}

// Obtener vouches de un usuario
function getUserVouches(userId) {
    const data = readData();
    return data ? data.vouches.filter(v => v.toUserId === userId) : [];
}

module.exports = {
    readData,
    writeData,
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
