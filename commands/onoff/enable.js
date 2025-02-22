module.exports = {
    match: (texto) => texto === '.enable',
    execute: async (sock, mensaje, texto, users, gruposDeshabilitados) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        const index = gruposDeshabilitados.indexOf(grupo);
        if (index > -1) {
            gruposDeshabilitados.splice(index, 1);
            await sock.sendMessage(grupo, { text: 'El bot ha sido habilitado en este grupo. Todos los usuarios pueden usar comandos.' });
        } else {
            await sock.sendMessage(grupo, { text: 'El bot ya está habilitado en este grupo.' });
        }
    }
};