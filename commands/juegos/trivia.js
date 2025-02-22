const fs = require('fs');
const path = require('path');

let trivias = [];
let triviaActual = null;
let mensajeTriviaId = null;
let triviaResuelta = false;
let temporizador = null;

// Cargar las trivias desde el archivo JSON
const cargarTrivias = () => {
    const data = fs.readFileSync(path.join(__dirname, 'trivia.json'), 'utf8');
    trivias = JSON.parse(data);
};

// Seleccionar una trivia aleatoria
const seleccionarTrivia = () => {
    const indice = Math.floor(Math.random() * trivias.length);
    return trivias[indice];
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    match: (texto) => texto === '.trivia',
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        // Cargar las trivias si no se han cargado
        if (trivias.length === 0) {
            cargarTrivias();
        }

        // Seleccionar una trivia aleatoria
        triviaActual = seleccionarTrivia();
        triviaResuelta = false;

        // Enviar la trivia al grupo
        const respuesta = `*Trivia:*\n${triviaActual.question}`;
        const mensajeEnviado = await sock.sendMessage(grupo, { text: respuesta });

        // Guardar el ID del mensaje de la trivia
        mensajeTriviaId = mensajeEnviado.key.id;

        // Iniciar el temporizador de un minuto
        if (temporizador) {
            clearTimeout(temporizador);
        }
        temporizador = setTimeout(async () => {
            if (!triviaResuelta) {
                await sock.sendMessage(grupo, { text: `*El tiempo para responder la trivia ha terminado.*\n*La respuesta correcta es:* 🌟 ${triviaActual.response}` });
                triviaActual = null;
                mensajeTriviaId = null;
            }
        }, 60000); // 1 minuto en milisegundos
    },
    verificarRespuesta: async (sock, mensaje, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text;

        if (!grupo.endsWith('@g.us') || !mensajeTriviaId || !triviaActual) {
            return;
        }

        // Verificar si la trivia ya fue resuelta
        if (triviaResuelta) {
            await sock.sendMessage(grupo, { text: 'Esta trivia ya fue resuelta.' });
            return;
        }

        // Verificar si el mensaje es una respuesta a la trivia
        if (mensaje.message.extendedTextMessage && mensaje.message.extendedTextMessage.contextInfo && mensaje.message.extendedTextMessage.contextInfo.stanzaId === mensajeTriviaId) {
            // Verificar si la respuesta es correcta
            if (texto && texto.toLowerCase() === triviaActual.response.toLowerCase()) {
                if (!users[remitente]) {
                    users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
                }

                // Otorgar dulces al usuario que respondió correctamente
                users[remitente].dulces += 8;
                const respuesta = `✅ ¡Correcto @${remitente.split('@')[0]}! Has ganado 8 dulces. Ahora tienes ${users[remitente].dulces} dulces.`;
                await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });

                // Marcar la trivia como resuelta
                triviaResuelta = true;

                // Resetear la trivia actual
                triviaActual = null;
                mensajeTriviaId = null;

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