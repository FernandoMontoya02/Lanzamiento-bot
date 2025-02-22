module.exports = {
    match: (texto) => texto && texto.startsWith('.kick'),
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;

        // Obtener metadatos del grupo
        const groupMetadata = await sock.groupMetadata(grupo);
        const admins = groupMetadata.participants
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
            .map(participant => participant.id);

        // Verificar si el remitente es administrador
        if (!admins.includes(remitente)) {
            await sock.sendMessage(grupo, { 
                text: '🚫 *Solo los administradores pueden usar este comando.*' 
            });
            return;
        }

        const mencion = texto.split(' ')[1];
        if (!mencion || !mencion.startsWith('@')) {
            await sock.sendMessage(grupo, { 
                text: '⚠️ *Por favor, menciona a un usuario para eliminarlo del grupo.*\n📌 *Ejemplo:* .kick @Juan123' 
            });
            return;
        }

        const user = mencion.replace('@', '') + '@s.whatsapp.net';

        // Intentar eliminar al usuario del grupo
        try {
            if (grupo.endsWith('@g.us')) {
                await sock.groupParticipantsUpdate(grupo, [user], 'remove');
            }
            await sock.sendMessage(grupo, { 
                text: `❌ *@${user.split('@')[0]} ha sido eliminado del grupo.*`, 
                mentions: [user] 
            });
        } catch (error) {
            console.error('Error al eliminar al usuario del grupo:', error);
            await sock.sendMessage(grupo, { 
                text: '⚠️ *No se pudo eliminar al usuario del grupo.*\n🔍 *Asegúrate de que el bot sea administrador.*' 
            });
        }
    }
};
