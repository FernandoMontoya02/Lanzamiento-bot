let spamActivo = {};
let permitirTodosSpam = false; // Control de permisos de spam

module.exports = {
    match: (texto) => texto && (texto.startsWith('.spam') || texto === '.todospam' || texto === '.adminspam' || texto === '.stopspam'),
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const args = texto.split(' ');
        const comando = args[0];

        const groupMetadata = await sock.groupMetadata(grupo);
        const admins = groupMetadata.participants
            .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
            .map(participant => participant.id);

        if (texto === '.stopspam') {
            spamActivo[grupo] = false;
            await sock.sendMessage(grupo, { text: '🚫 Spam detenido con éxito.' });
            return;
        }

        if (texto === '.todospam') {
            if (!admins.includes(remitente)) {
                await sock.sendMessage(grupo, { text: '❌ Solo los administradores pueden habilitar el spam para todos.' });
                return;
            }

            permitirTodosSpam = true;
            await sock.sendMessage(grupo, { text: '✅ Ahora cualquiera en el grupo puede usar el comando .spam.' });
            return;
        }

        if (texto === '.adminspam') {
            if (!admins.includes(remitente)) {
                await sock.sendMessage(grupo, { text: '❌ Solo los administradores pueden usar este comando.' });
                return;
            }

            permitirTodosSpam = false;
            await sock.sendMessage(grupo, { text: '✅ Ahora solo los administradores pueden usar el comando .spam.' });
            return;
        }

        const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
        const botEsAdmin = admins.includes(botNumber);

        if (!botEsAdmin) {
            await sock.sendMessage(grupo, { text: '❌ No puedo hacer spam porque no soy administrador.' });
            return;
        }

        if (!permitirTodosSpam && !admins.includes(remitente)) {
            await sock.sendMessage(grupo, { text: '❌ No tienes permiso para hacer spam. Un administrador debe habilitarlo con .todospam' });
            return;
        }

        const cantidad = parseInt(args[args.length - 1]);
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(grupo, { text: '❌ Debes indicar una cantidad válida de mensajes. Ejemplo: .spam Hola 5' });
            return;
        }

        const maxMensajes = 50;
        if (cantidad > maxMensajes) {
            await sock.sendMessage(grupo, { text: `⚠️ El límite máximo de mensajes es *${maxMensajes}*. Ajustando a 50...` });
        }
        const cantidadReal = Math.min(cantidad, maxMensajes);

        const mensajeSpam = args.slice(1, -1).join(' ');
        if (!mensajeSpam.trim()) {
            await sock.sendMessage(grupo, { text: '❌ Debes escribir un mensaje para enviar el spam. Ejemplo: .spam Hola 5' });
            return;
        }

        spamActivo[grupo] = true;

        for (let i = 0; i < cantidadReal; i++) {
            if (!spamActivo[grupo]) break;

            await sock.sendMessage(grupo, { text: mensajeSpam });

            await new Promise(resolve => setTimeout(resolve, 1000));
        }

        delete spamActivo[grupo];
    }
};
