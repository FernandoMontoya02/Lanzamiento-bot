const { readUsers, writeUsers } = require('../../utils');

module.exports = {
    match: (texto) => texto === '.dulces',
    execute: async (sock, mensaje, texto, users) => {
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        if (!remitente) {
            console.error("Error: 'remitente' no disponible.");
            return;
        }

        users = readUsers();

        if (!users[remitente]) {
            users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
        }

        const dulces = users[remitente].dulces;
        const respuesta = `@${remitente.split('@')[0]}, tienes ${dulces} dulces.`;
        await sock.sendMessage(mensaje.key.remoteJid, { text: respuesta, mentions: [remitente] });

        writeUsers(users);
    }
};