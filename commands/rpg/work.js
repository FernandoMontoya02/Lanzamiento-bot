module.exports = {
    match: (texto) => texto === '.work',
    execute: async (sock, mensaje, texto, users) => {
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const grupo = mensaje.key.remoteJid;
        if (!remitente) {
            console.error("Error: 'remitente' no disponible.");
            return;
        }

        if (!users[remitente]) {
            users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
        }

        const trabajos = ['plomero', 'carpintero', 'electricista', 'jardinero', 'mecánico'];
        const trabajo = trabajos[Math.floor(Math.random() * trabajos.length)];
        const cantidad = Math.floor(Math.random() * 30);
        users[remitente].dulces += cantidad;
        const dulcesTotales = users[remitente].dulces;
        const respuesta = `@${remitente.split('@')[0]}, has trabajado de ${trabajo} y ganado ${cantidad} dulces. Ahora tienes ${dulcesTotales} dulces.`;
        await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });
    }
};