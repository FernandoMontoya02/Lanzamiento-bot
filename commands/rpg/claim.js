module.exports = {
    match: (texto) => texto === '.claim',
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

        users[remitente].dulces += 10;
        const dulcesTotales = users[remitente].dulces;
        const respuesta = `@${remitente.split('@')[0]}, has reclamado 10 dulces. Ahora tienes ${dulcesTotales} dulces.`;
        await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });
    }
};