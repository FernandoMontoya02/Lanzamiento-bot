const fs = require('fs');
const path = require('path');

let ordenas = [];
let ordenaActual = null;
let mensajeOrdenaId = null;
let ordenaResuelto = false;
let temporizador = null;

// Cargar las palabras desde el archivo JSON
const cargarOrdenas = () => {
    const data = fs.readFileSync(path.join(__dirname, 'ordena.json'), 'utf8');
    ordenas = JSON.parse(data);
};

// Seleccionar una palabra aleatoria
const seleccionarOrdena = () => {
    const indice = Math.floor(Math.random() * ordenas.length);
    return ordenas[indice];
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    match: (texto) => texto === '.ordena',
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        // Cargar las palabras si no se han cargado
        if (ordenas.length === 0) {
            cargarOrdenas();
        }

        // Seleccionar una palabra aleatoria
        ordenaActual = seleccionarOrdena();
        ordenaResuelto = false;

        // Enviar la palabra al grupo
        const respuesta = `*Ordena la palabra:*\n${ordenaActual.question}`;
        const mensajeEnviado = await sock.sendMessage(grupo, { text: respuesta });

        // Guardar el ID del mensaje de la palabra
        mensajeOrdenaId = mensajeEnviado.key.id;

        // Iniciar el temporizador de un minuto
        if (temporizador) {
            clearTimeout(temporizador);
        }
        temporizador = setTimeout(async () => {
            if (!ordenaResuelto) {
                await sock.sendMessage(grupo, { text: `*El tiempo para responder la palabra ha terminado.*\n*La respuesta correcta es:* 🌟 ${ordenaActual.response}` });
                ordenaActual = null;
                mensajeOrdenaId = null;
            }
        }, 60000); // 1 minuto en milisegundos
    },
    verificarRespuesta: async (sock, mensaje, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text;

        if (!grupo.endsWith('@g.us') || !mensajeOrdenaId || !ordenaActual) {
            return;
        }

        // Verificar si la palabra ya fue resuelta
        if (ordenaResuelto) {
            await sock.sendMessage(grupo, { text: 'Esta palabra ya fue resuelta.' });
            return;
        }

        // Verificar si el mensaje es una respuesta a la palabra
        if (mensaje.message.extendedTextMessage && mensaje.message.extendedTextMessage.contextInfo && mensaje.message.extendedTextMessage.contextInfo.stanzaId === mensajeOrdenaId) {
            // Verificar si la respuesta es correcta
            if (texto && texto.toLowerCase() === ordenaActual.response.toLowerCase()) {
                if (!users[remitente]) {
                    users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
                }

                // Otorgar dulces al usuario que respondió correctamente
                users[remitente].dulces += 8;
                const respuesta = `✅ ¡Correcto @${remitente.split('@')[0]}! Has ganado 8 dulces. Ahora tienes ${users[remitente].dulces} dulces.`;
                await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });

                // Marcar la palabra como resuelta
                ordenaResuelto = true;

                // Resetear la palabra actual
                ordenaActual = null;
                mensajeOrdenaId = null;

                // Limpiar el temporizador
                if (temporizador) {
                    clearTimeout(temporizador);
                    temporizador = null;
                }
            } else {
                // Respuesta incorrecta
                await delay(1000); // Agregar un pequeño retraso para evitar el límite de tasa
                await sock.sendMessage(grupo, { text: `❌ Incorrecto intentalo de nuevamente.` });
            }
        }
    }
};