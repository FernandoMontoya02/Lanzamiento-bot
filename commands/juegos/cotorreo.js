const fs = require('fs');
const path = require('path');

let cotorreos = [];

// Cargar los mensajes graciosos desde el archivo JSON
const cargarCotorreos = () => {
    const data = fs.readFileSync(path.join(__dirname, 'cotorreo.json'), 'utf8');
    cotorreos = JSON.parse(data);
};

// Seleccionar un mensaje gracioso aleatorio
const seleccionarCotorreo = () => {
    const indice = Math.floor(Math.random() * cotorreos.length);
    return cotorreos[indice];
};

module.exports = {
    match: (texto) => texto.startsWith('.cotorreo'),
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        // Cargar los mensajes graciosos si no se han cargado
        if (cotorreos.length === 0) {
            cargarCotorreos();
        }

        // Seleccionar un mensaje gracioso aleatorio
        const cotorreo = seleccionarCotorreo();

        // Verificar si se menciona a alguien
        const mencion = texto.split(' ')[1];
        let respuesta;
        if (mencion && mencion.startsWith('@')) {
            const usuarioMencionado = mencion.replace('@', '') + '@s.whatsapp.net';
            respuesta = `@${usuarioMencionado.split('@')[0]}, ${cotorreo}`;
            await sock.sendMessage(grupo, { text: respuesta, mentions: [usuarioMencionado] });
        } else {
            respuesta = cotorreo;
            await sock.sendMessage(grupo, { text: respuesta });
        }
    }
};