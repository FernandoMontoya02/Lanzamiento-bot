const fs = require('fs');
const path = require('path');

// 📌 Ruta absoluta de la carpeta "session"
const sessionFolder = path.join('C:\\Users\\ferna\\Desktop\\bot whattsapp\\instento 3 con copilot\\bot-whatsapp\\session');
const actividadPath = path.join(sessionFolder, 'actividad_grupo.json');

// 📌 Verificar y crear la carpeta "session" si no existe
if (!fs.existsSync(sessionFolder)) {
    fs.mkdirSync(sessionFolder, { recursive: true });
}

// 📌 Verificar y crear el archivo JSON si no existe
if (!fs.existsSync(actividadPath)) {
    fs.writeFileSync(actividadPath, JSON.stringify({}, null, 2));
}

module.exports = {
    match: (texto) => texto && texto.startsWith('.inactivos'),
    execute: async (sock, mensaje) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;

        try {
            // Obtener información del grupo
            const groupMetadata = await sock.groupMetadata(grupo);
            const participantes = groupMetadata.participants.map(p => p.id);

            // Obtener lista de administradores
            const admins = groupMetadata.participants
                .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
                .map(p => p.id);

            // Verificar si el remitente es administrador
            if (!admins.includes(remitente)) {
                await sock.sendMessage(grupo, { text: '❌ Solo los administradores pueden usar este comando.' });
                return;
            }

            // Cargar historial de actividad
            let actividad = JSON.parse(fs.readFileSync(actividadPath, 'utf-8'));

            // Obtener la fecha actual y hace 14 días
            const ahora = Date.now();
            const haceDosSemanas = ahora - (14 * 24 * 60 * 60 * 1000);

            // Filtrar usuarios que no han escrito en los últimos 14 días
            const inactivos = participantes
                .map(id => ({
                    id,
                    ultimaActividad: actividad[id] || 0 // Si no tiene actividad, se considera 0
                }))
                .filter(user => user.ultimaActividad === 0 || user.ultimaActividad < haceDosSemanas)
                .sort((a, b) => a.ultimaActividad - b.ultimaActividad) // Ordenar por menos actividad
                .slice(0, 5); // Tomar los 5 menos activos

            if (inactivos.length === 0) {
                await sock.sendMessage(grupo, { text: '✅ No hay miembros inactivos en las últimas dos semanas.' });
                return;
            }

            // Crear la lista de menciones
            const mencionados = inactivos.map(user => user.id);

            // Enviar el mensaje de notificación
            await sock.sendMessage(grupo, {
                text: `⚠️ *Usuarios menos activos en las últimas 2 semanas:*\n\n${mencionados.map((m, i) => `${i + 1}. @${m.split('@')[0]}`).join('\n')}`,
                mentions: mencionados
            });

        } catch (error) {
            console.error('Error al ejecutar el comando .inactivos:', error);
            await sock.sendMessage(grupo, { text: '❌ Ocurrió un error al obtener la lista de inactivos.' });
        }
    }
};

// 📌 Monitorear la actividad y guardarla en "session/actividad_grupo.json"
module.exports.monitorActividad = async (sock, mensaje) => {
    try {
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;

        // Cargar historial de actividad
        let actividad = JSON.parse(fs.readFileSync(actividadPath, 'utf-8'));

        // Actualizar la actividad del usuario
        actividad[remitente] = Date.now();

        // Guardar la actividad en el archivo
        fs.writeFileSync(actividadPath, JSON.stringify(actividad, null, 2));
    } catch (error) {
        console.error('Error al registrar actividad:', error);
    }
};
