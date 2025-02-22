module.exports = {
    match: (texto) => texto === '.crimen',
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

        const resultado = Math.random() > 0.5 ? 'ganado' : 'perdido';
        let cantidad = Math.floor(Math.random() * 10);

        if (resultado === 'perdido' && users[remitente].dulces < cantidad) {
            cantidad = users[remitente].dulces; // No perder más dulces de los que se tienen
        }

        if (resultado === 'ganado') {
            users[remitente].dulces += cantidad;
        } else {
            users[remitente].dulces -= cantidad;
        }

        const respuesta = `¡@${remitente.split('@')[0]} has ${resultado} ${cantidad} dulces!`;
        await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });
    }
};