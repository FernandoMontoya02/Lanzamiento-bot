module.exports = {
    match: (texto) => texto && (texto.startsWith('.dchat') || texto.startsWith('.hchat')),
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
            await sock.sendMessage(grupo, { text: '⚠️ No puedo cambiar los permisos porque no soy administrador del grupo.' });
            return;
        }

        try {
            if (mensaje.message.conversation.startsWith('.dchat')) {
                // Restringir mensajes solo para administradores
                await sock.groupSettingUpdate(grupo, 'announcement');
                await sock.sendMessage(grupo, { text: '🔒 Solo los administradores pueden escribir en el grupo.' });
            } else if (mensaje.message.conversation.startsWith('.hchat')) {
                // Permitir mensajes para todos
                await sock.groupSettingUpdate(grupo, 'not_announcement');
                await sock.sendMessage(grupo, { text: '🔓 Todos los miembros pueden escribir en el grupo.' });
            }
        } catch (error) {
            console.error('Error al cambiar los permisos del grupo:', error);
            await sock.sendMessage(grupo, { text: '⚠️ No se pudo cambiar la configuración del chat. Asegúrate de que el bot tenga permisos de administrador.' });
        }
    }
};
