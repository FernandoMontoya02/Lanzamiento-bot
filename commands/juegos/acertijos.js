const fs = require('fs');
const path = require('path');

let acertijos = [];
let acertijoActual = null;
let mensajeAcertijoId = null;
let acertijoResuelto = false;
let temporizador = null;

// Cargar los acertijos desde el archivo JSON
const cargarAcertijos = () => {
    const data = fs.readFileSync(path.join(__dirname, 'acertijos.json'), 'utf8');
    acertijos = JSON.parse(data);
};

// Seleccionar un acertijo aleatorio
const seleccionarAcertijo = () => {
    const indice = Math.floor(Math.random() * acertijos.length);
    return acertijos[indice];
};

// Calcular la distancia de Levenshtein entre dos cadenas
const distanciaLevenshtein = (a, b) => {
    const matrix = [];

    for (let i = 0; i <= b.length; i++) {
        matrix[i] = [i];
    }

    for (let j = 0; j <= a.length; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b.charAt(i - 1) === a.charAt(j - 1)) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, Math.min(matrix[i][j - 1] + 1, matrix[i - 1][j] + 1));
            }
        }
    }

    return matrix[b.length][a.length];
};

// Verificar si la respuesta es similar a la correcta
const esRespuestaSimilar = (respuesta, correcta) => {
    const distancia = distanciaLevenshtein(respuesta.toLowerCase(), correcta.toLowerCase());
    const longitudMaxima = Math.max(respuesta.length, correcta.length);
    const umbral = Math.floor(longitudMaxima * 0.3); // Permitir hasta un 30% de diferencia
    return distancia <= umbral;
};

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

module.exports = {
    match: (texto) => texto === '.acertijo',
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        // Cargar los acertijos si no se han cargado
        if (acertijos.length === 0) {
            cargarAcertijos();
        }

        // Seleccionar un acertijo aleatorio
        acertijoActual = seleccionarAcertijo();
        acertijoResuelto = false;

        // Enviar el acertijo al grupo
        const respuesta = `*Acertijo:*\n${acertijoActual.question}`;
        const mensajeEnviado = await sock.sendMessage(grupo, { text: respuesta });

        // Guardar el ID del mensaje del acertijo
        mensajeAcertijoId = mensajeEnviado.key.id;

        // Iniciar el temporizador de un minuto
        if (temporizador) {
            clearTimeout(temporizador);
        }
        temporizador = setTimeout(async () => {
            if (!acertijoResuelto) {
                await sock.sendMessage(grupo, { text: `*El tiempo para responder el acertijo ha terminado.*\n*La respuesta correcta es:* 🌟 ${acertijoActual.response}` });
                acertijoActual = null;
                mensajeAcertijoId = null;
            }
        }, 60000); // 1 minuto en milisegundos
    },
    verificarRespuesta: async (sock, mensaje, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text;

        if (!grupo.endsWith('@g.us') || !mensajeAcertijoId || !acertijoActual) {
            return;
        }

        // Verificar si el acertijo ya fue resuelto
        if (acertijoResuelto) {
            await sock.sendMessage(grupo, { text: 'Este acertijo ya fue resuelto.' });
            return;
        }

        // Verificar si el mensaje es una respuesta al acertijo
        if (mensaje.message.extendedTextMessage && mensaje.message.extendedTextMessage.contextInfo && mensaje.message.extendedTextMessage.contextInfo.stanzaId === mensajeAcertijoId) {
            // Verificar si la respuesta es correcta o similar
            if (texto && (texto.toLowerCase() === acertijoActual.response.toLowerCase() || esRespuestaSimilar(texto, acertijoActual.response))) {
                if (!users[remitente]) {
                    users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
                }

                // Otorgar dulces al usuario que respondió correctamente
                users[remitente].dulces += 8;
                const respuesta = `✅ ¡Correcto @${remitente.split('@')[0]}! Has ganado 8 dulces. Ahora tienes ${users[remitente].dulces} dulces.`;
                await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });

                // Marcar el acertijo como resuelto
                acertijoResuelto = true;

                // Resetear el acertijo actual
                acertijoActual = null;
                mensajeAcertijoId = null;

                // Limpiar el temporizador
                if (temporizador) {
                    clearTimeout(temporizador);
                    temporizador = null;
                }
            } else {
                // Respuesta incorrecta
                await delay(1000); // Agregar un pequeño retraso para evitar el límite de tasa
                await sock.sendMessage(grupo, { text: `❌ Incorrecto intentalo de nuevo.` });
            }
        }
    }
};