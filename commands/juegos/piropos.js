const fs = require('fs');
const path = require('path');

let piropos = [];

// Cargar los piropos desde el archivo JSON
const cargarPiropos = () => {
    const data = fs.readFileSync(path.join(__dirname, 'romanticos.json'), 'utf8');
    piropos = JSON.parse(data);
};

// Seleccionar un piropo aleatorio
const seleccionarPiropo = () => {
    const indice = Math.floor(Math.random() * piropos.length);
    return piropos[indice];
};

module.exports = {
    match: (texto) => texto.startsWith('.piropo'),
    execute: async (sock, mensaje, texto, users) => {
        const grupo = mensaje.key.remoteJid;
        if (!grupo.endsWith('@g.us')) {
            console.error("Error: no es un grupo.");
            return;
        }

        // Cargar los piropos si no se han cargado
        if (piropos.length === 0) {
            cargarPiropos();
        }

        // Seleccionar un piropo aleatorio
        const piropo = seleccionarPiropo();

        // Verificar si se menciona a alguien
        const mencion = texto.split(' ')[1];
        let respuesta;
        if (mencion && mencion.startsWith('@')) {
            const usuarioMencionado = mencion.replace('@', '') + '@s.whatsapp.net';
            respuesta = `@${usuarioMencionado.split('@')[0]}, ${piropo}`;
            await sock.sendMessage(grupo, { text: respuesta, mentions: [usuarioMencionado] });
        } else {
            respuesta = piropo;
            await sock.sendMessage(grupo, { text: respuesta });
        }
    }
};