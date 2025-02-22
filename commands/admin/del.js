module.exports = {
    match: (texto) => texto && texto.startsWith('.del'),
    execute: async (sock, mensaje) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;

        // Obtener información del grupo
        const groupMetadata = await sock.groupMetadata(grupo);
        const participantes = groupMetadata.participants;

        // Obtener lista de administradores
        const admins = participantes
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
            .map(participant => participant.id);

        // Obtener el bot en la lista de participantes
        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botEsAdmin = admins.includes(botNumber);

        // Verificar si el remitente es administrador
        if (!admins.includes(remitente)) {
            await sock.sendMessage(grupo, { text: '❌ Solo los administradores pueden usar este comando.' });
            return;
        }

        // Verificar si el bot es administrador
        if (!botEsAdmin) {
            await sock.sendMessage(grupo, { text: '⚠️ No puedo eliminar mensajes porque no soy administrador del grupo.' });
            return;
        }

        // Obtener el mensaje citado para eliminarlo
        const quoted = mensaje.message?.extendedTextMessage?.contextInfo?.stanzaId;
        const participant = mensaje.message?.extendedTextMessage?.contextInfo?.participant;

        if (!quoted || !participant) {
            await sock.sendMessage(grupo, { text: '❌ Responde a un mensaje con .del para eliminarlo.' });
            return;
        }

        // Intentar eliminar el mensaje
        try {
            await sock.sendMessage(grupo, {
                delete: {
                    remoteJid: grupo,
                    fromMe: false,
                    id: quoted,
                    participant: participant
                }
            });
            await sock.sendMessage(grupo, { text: '✅ Mensaje eliminado con éxito.' });
        } catch (error) {
            console.error('Error al eliminar el mensaje:', error);
            await sock.sendMessage(grupo, { text: '⚠️ No se pudo eliminar el mensaje. Asegúrate de que el bot tenga permisos de administrador.' });
        }
    }
};
