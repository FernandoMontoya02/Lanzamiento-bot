module.exports = {
    match: (texto) => texto && texto.startsWith('.n '),
    execute: async (sock, mensaje) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;

        try {
            // Obtener información del grupo
            const groupMetadata = await sock.groupMetadata(grupo);
            const participantes = groupMetadata.participants;

            // Obtener lista de administradores (IDs normalizados)
            const admins = participantes
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id.split(':')[0]); // Normalizar el ID (quitar el sufijo)

            // Normalizar ID del remitente para comparación
            const remitenteNormalizado = remitente.split(':')[0];

            // Verificar si el remitente es administrador
            if (!admins.includes(remitenteNormalizado)) {
                await sock.sendMessage(grupo, { text: '❌ Solo los administradores pueden usar este comando.' });
                return;
            }

            // Obtener el mensaje sin el comando ".n"
            let texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text || '';
            texto = texto.replace(/^\.n\s*/, '').trim(); // Eliminar ".n" y espacios extra

            if (!texto) {
                await sock.sendMessage(grupo, { text: '⚠️ Debes escribir un mensaje después de ".n"' });
                return;
            }

            // Crear lista de menciones
            const mencionados = participantes.map(p => p.id);

            // Enviar el mensaje de notificación mencionando a todos
            await sock.sendMessage(grupo, {
                text: `📢 *NOTIFICACIÓN:*\n\n${texto}`,
                mentions: mencionados
            });

        } catch (error) {
            console.error('Error al enviar la notificación:', error);
            await sock.sendMessage(grupo, { text: '⚠️ No se pudo enviar la notificación.' });
        }
    }
};
