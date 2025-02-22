module.exports = {
    match: (texto) => texto && texto.startsWith('.owner'),
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
            await sock.sendMessage(grupo, { text: '⚠️ *No puedo promover usuarios porque no soy administrador del grupo.*' });
            return;
        }

        // Obtener usuario mencionado
        const mencion = texto.split(' ')[1];

        if (!mencion || !mencion.startsWith('@')) {
            await sock.sendMessage(grupo, { text: '⚠️ *Por favor, menciona a un usuario para hacerlo administrador.*\n\nEjemplo: *.owner @usuario*' });
            return;
        }

        const user = mencion.replace('@', '') + '@s.whatsapp.net';

        // Crear usuario en el sistema si no existe
        if (!users[user]) {
            users[user] = { dulces: 0, xp: 0, nivel: 0, admin: false };
        }

        users[user].admin = true;

        // Intentar promover a administrador
        try {
            if (grupo.endsWith('@g.us')) {
                await sock.groupParticipantsUpdate(grupo, [user], 'promote');
            }
            await sock.sendMessage(grupo, { 
                text: `✅ *@${user.split('@')[0]} ahora es administrador del grupo!* 🎉🎖️`,
                mentions: [user]
            });
        } catch (error) {
            console.error('❌ Error al promover a administrador:', error);
            await sock.sendMessage(grupo, { text: '⚠️ *No se pudo promover a administrador.*\nAsegúrate de que el bot tenga permisos de administrador.' });
        }
    }
};
