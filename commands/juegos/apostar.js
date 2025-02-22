const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

let juegos = {}; // Guardar apuestas activas

module.exports = {
    match: (texto) => texto.startsWith('.apostar'),
    execute: async (sock, mensaje, texto, users) => {
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const grupo = mensaje.key.remoteJid;

        if (!remitente) return;

        if (!users[remitente]) {
            await sock.sendMessage(grupo, { 
                text: `⚠️ *@${remitente.split('@')[0]}*, aún no tienes dulces registrados.`, 
                mentions: [remitente] 
            });
            return;
        }

        const cantidad = parseInt(texto.split(' ')[1], 10);
        if (isNaN(cantidad) || cantidad <= 0) {
            await sock.sendMessage(grupo, { 
                text: `🎰 *@${remitente.split('@')[0]}*, ingresa una cantidad válida de dulces para apostar.\n\n*Ejemplo:* .apostar 10`, 
                mentions: [remitente] 
            });
            return;
        }

        if (users[remitente].dulces < cantidad) {
            await sock.sendMessage(grupo, { 
                text: `😢 *@${remitente.split('@')[0]}*, no tienes suficientes dulces.\n\n*Tienes:* ${users[remitente].dulces} dulces.`, 
                mentions: [remitente] 
            });
            return;
        }

        // Generar número aleatorio entre 1 y 10
        const numeroSecreto = Math.floor(Math.random() * 10) + 1;

        // Enviar mensaje con la pregunta
        const mensajeBot = await sock.sendMessage(grupo, { 
            text: `🎲 *@${remitente.split('@')[0]}*, estoy pensando en un número entre *1 y 10*.\n\n¡Respóndeme a este mensaje con el número correcto para ganar el doble de lo apostado! 🤔`, 
            mentions: [remitente] 
        });

        // Guardar la apuesta con el ID del mensaje y el temporizador
        juegos[remitente] = {
            numeroSecreto,
            cantidad,
            mensajeId: mensajeBot.key.id,
            timeout: setTimeout(async () => {
                // Si no responde a tiempo, pierde la apuesta
                users[remitente].dulces -= cantidad;
                await sock.sendMessage(grupo, { 
                    text: `⌛ *@${remitente.split('@')[0]}*, no respondiste a tiempo. Perdiste *${cantidad}* dulces. 😭`, 
                    mentions: [remitente] 
                });
                delete juegos[remitente]; // Eliminar apuesta después de perder
            }, 60000) // ⏳ 1 minuto (60,000 ms)
        };
    },

    verificarRespuesta: async (sock, mensaje, users) => {
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const grupo = mensaje.key.remoteJid;
        const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text;

        if (!juegos[remitente]) return; // Si no hay apuesta activa, ignorar

        // Verificar si el usuario está respondiendo al mensaje correcto
        if (mensaje.message.extendedTextMessage &&
            mensaje.message.extendedTextMessage.contextInfo &&
            mensaje.message.extendedTextMessage.contextInfo.stanzaId === juegos[remitente].mensajeId) {

            const respuesta = parseInt(texto, 10);
            const { numeroSecreto, cantidad, timeout } = juegos[remitente];

            clearTimeout(timeout); // ⛔ Cancelar el temporizador si responde a tiempo

            if (respuesta === numeroSecreto) {
                users[remitente].dulces += cantidad * 2;
                await sock.sendMessage(grupo, { 
                    text: `🎉 *@${remitente.split('@')[0]}* ¡Felicidades! Adivinaste el número *${numeroSecreto}* y ganaste *${cantidad * 2}* dulces. 🤑🎊`, 
                    mentions: [remitente] 
                });
            } else {
                users[remitente].dulces -= cantidad;
                await sock.sendMessage(grupo, { 
                    text: `❌ *@${remitente.split('@')[0]}*, el número era *${numeroSecreto}*. Perdiste *${cantidad}* dulces. 😭`, 
                    mentions: [remitente] 
                });
            }

            delete juegos[remitente]; // Eliminar la apuesta después de jugar
        }
    }
};
