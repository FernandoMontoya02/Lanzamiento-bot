let soloAdminsPuedenMencionar = false; // Configuración inicial

module.exports = {
    match: (texto) => ['.todos', '.mtodos', '.atodos'].includes(texto),
    execute: async (sock, mensaje, texto) => {
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const grupo = mensaje.key.remoteJid;

        if (!remitente || !grupo.endsWith('@g.us')) {
            console.error("Error: 'remitente' no disponible o no es un grupo.");
            return;
        }

        // Obtener metadata del grupo
        const groupMetadata = await sock.groupMetadata(grupo);
        const admins = groupMetadata.participants
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
            .map(participant => participant.id);

        if (texto === '.mtodos') {
            soloAdminsPuedenMencionar = false;
            await sock.sendMessage(grupo, { text: '✅ Ahora *cualquiera* en el grupo puede usar el comando .todos' });
            return;
        }

        if (texto === '.atodos') {
            if (!admins.includes(remitente)) {
                await sock.sendMessage(grupo, { text: '❌ Solo los administradores pueden cambiar esta configuración.' });
                return;
            }
            soloAdminsPuedenMencionar = true;
            await sock.sendMessage(grupo, { text: '🔒 Ahora *solo los administradores* pueden usar el comando .todos' });
            return;
        }

        if (texto === '.todos') {
            if (soloAdminsPuedenMencionar && !admins.includes(remitente)) {
                await sock.sendMessage(grupo, { text: '🚫 Solo los administradores pueden usar este comando ahora.' });
                return;
            }

            // Obtener lista de participantes
            const participantes = groupMetadata.participants.map(participant => participant.id);
            const respuesta = `📢 *Mención para todos*:\n\n` +
                participantes.map(participant => `📌 @${participant.split('@')[0]}`).join('\n');

            await sock.sendMessage(grupo, { text: respuesta, mentions: participantes });
        }
    }
};
