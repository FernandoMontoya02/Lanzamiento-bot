module.exports = {
    match: (texto) => texto === '.disable',
    execute: async (sock, mensaje, texto, users, gruposDeshabilitados) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        if (!gruposDeshabilitados.includes(grupo)) {
            gruposDeshabilitados.push(grupo);
            await sock.sendMessage(grupo, { text: 'El bot ha sido deshabilitado en este grupo. Solo los administradores pueden usar comandos.' });
        } else {
            await sock.sendMessage(grupo, { text: 'El bot ya está deshabilitado en este grupo.' });
        }
    }
};