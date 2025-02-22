module.exports = {
    match: (texto) => texto.startsWith('.status'),
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        
        // Obtener la lista de administradores del grupo
        const groupMetadata = await sock.groupMetadata(grupo);
        const admins = groupMetadata.participants
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
            .map(participant => participant.id);

        let usuarioConsulta = remitente; // Por defecto, consulta el estado del remitente
        let mencion = texto.split(' ')[1];

        if (mencion && mencion.startsWith('@')) {
            usuarioConsulta = mencion.replace('@', '') + '@s.whatsapp.net';
        }

        // Verificar si el usuario consultado es administrador
        const esAdmin = admins.includes(usuarioConsulta);
        const status = esAdmin ? '👑 *Administrador*' : '🙍 *Usuario*';

        // Enviar respuesta con mención
        await sock.sendMessage(grupo, { 
            text: `🔍 *@${usuarioConsulta.split('@')[0]}*, su estado es: ${status}`, 
            mentions: [usuarioConsulta] 
        });
    }
};
