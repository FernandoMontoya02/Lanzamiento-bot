const fs = require('fs');
const path = require('path');

let peliculas = [];
let peliculaActual = null;
let mensajePeliculaId = null;
let peliculaResuelta = false;
let temporizador = null;

// Cargar las películas desde el archivo JSON
const cargarPeliculas = () => {
    const data = fs.readFileSync(path.join(__dirname, 'peliculas.json'), 'utf8');
    peliculas = JSON.parse(data);
};

// Seleccionar una película aleatoria
const seleccionarPelicula = () => {
    const indice = Math.floor(Math.random() * peliculas.length);
    return peliculas[indice];
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
    match: (texto) => texto === '.pelicula',
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        // Cargar las películas si no se han cargado
        if (peliculas.length === 0) {
            cargarPeliculas();
        }

        // Seleccionar una película aleatoria
        peliculaActual = seleccionarPelicula();
        peliculaResuelta = false;

        // Enviar la película al grupo
        const respuesta = `*Adivina la película:*\n${peliculaActual.question}`;
        const mensajeEnviado = await sock.sendMessage(grupo, { text: respuesta });

        // Guardar el ID del mensaje de la película
        mensajePeliculaId = mensajeEnviado.key.id;

        // Iniciar el temporizador de un minuto
        if (temporizador) {
            clearTimeout(temporizador);
        }
        temporizador = setTimeout(async () => {
            if (!peliculaResuelta) {
                await sock.sendMessage(grupo, { text: `*El tiempo para responder la película ha terminado.*\n*La respuesta correcta es:* 🌟 ${peliculaActual.response}` });
                peliculaActual = null;
                mensajePeliculaId = null;
            }
        }, 60000); // 1 minuto en milisegundos
    },
    verificarRespuesta: async (sock, mensaje, users) => {
        const grupo = mensaje.key.remoteJid;
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text;

        if (!grupo.endsWith('@g.us') || !mensajePeliculaId || !peliculaActual) {
            return;
        }

        // Verificar si la película ya fue resuelta
        if (peliculaResuelta) {
            await sock.sendMessage(grupo, { text: 'Esta película ya fue resuelta.' });
            return;
        }

        // Verificar si el mensaje es una respuesta a la película
        if (mensaje.message.extendedTextMessage && mensaje.message.extendedTextMessage.contextInfo && mensaje.message.extendedTextMessage.contextInfo.stanzaId === mensajePeliculaId) {
            // Verificar si la respuesta es correcta o similar
            if (texto && (texto.toLowerCase() === peliculaActual.response.toLowerCase() || esRespuestaSimilar(texto, peliculaActual.response))) {
                if (!users[remitente]) {
                    users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
                }

                // Otorgar dulces al usuario que respondió correctamente
                users[remitente].dulces += 8;
                const respuesta = `✅ ¡Correcto @${remitente.split('@')[0]}! Has ganado 8 dulces. Ahora tienes ${users[remitente].dulces} dulces.`;
                await sock.sendMessage(grupo, { text: respuesta, mentions: [remitente] });

                // Marcar la película como resuelta
                peliculaResuelta = true;

                // Resetear la película actual
                peliculaActual = null;
                mensajePeliculaId = null;

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