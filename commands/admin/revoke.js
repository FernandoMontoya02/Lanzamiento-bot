module.exports = {
    match: (texto) => texto && texto.startsWith('.revoke'),
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;

        // Obtener información del grupo
        const groupMetadata = await sock.groupMetadata(grupo);
        const participantes = groupMetadata.participants;

        // Obtener lista de administradores
        const admins = participantes
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
            .map(participant => participant.id);

        // Obtener el número del bot
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botEsAdmin = admins.includes(botNumber);

        // Verificar si el remitente es administrador
        if (!admins.includes(remitente)) {
            await sock.sendMessage(grupo, { text: '❌ *Este comando es solo para administradores.*' });
            return;
        }

        // Verificar si el bot es administrador
        if (!botEsAdmin) {
            await sock.sendMessage(grupo, { text: '⚠️ *No puedo revocar administradores porque no soy administrador del grupo.*' });
            return;
        }

        const owner = groupMetadata.owner; // Dueño del grupo

        // Obtener usuario mencionado
        const mencion = texto.split(' ')[1];

        if (!mencion || !mencion.startsWith('@')) {
            await sock.sendMessage(grupo, { text: '⚠️ *Debes mencionar a un usuario para revocar su rol de administrador.*\n\nEjemplo: *.revoke @usuario*' });
            return;
        }

        const user = mencion.replace('@', '') + '@s.whatsapp.net';

        if (user === owner) {
            await sock.sendMessage(grupo, { text: '⛔ *No puedes revocar el rol de administrador del dueño del grupo.*' });
            return;
        }

        // Si el usuario no está registrado en la base, inicializarlo
        if (!users[user]) {
            users[user] = { dulces: 0, xp: 0, nivel: 0, admin: false };
        }

        users[user].admin = false;

        // Revocar el rol de administrador en el grupo
        try {
            if (grupo.endsWith('@g.us')) {
                await sock.groupParticipantsUpdate(grupo, [user], 'demote');
            }
            await sock.sendMessage(grupo, { 
                text: `⚠️ *@${user.split('@')[0]} ya no es administrador del grupo.* 🚫`,
                mentions: [user]
            });
        } catch (error) {
            console.error('❌ Error al revocar el rol de administrador:', error);
            await sock.sendMessage(grupo, { text: '⚠️ *No se pudo revocar el rol de administrador.*\nAsegúrate de que el bot tenga permisos de administrador.' });
        }
    }
};
