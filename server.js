const express = require('express');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode-terminal');
const { readUsers, writeUsers } = require('./utils');

const app = express();
const port = process.env.PORT || 3000; // Usa el puerto de Render o 3000 localmente

// Variables para almacenar las páginas HTML como texto
const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bot WhatsApp</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
        }
        #qr-code {
            margin: 20px auto;
        }
        #status {
            margin: 20px auto;
            font-size: 1.2em;
            color: green;
        }
    </style>
</head>
<body>
    <h1>Bot WhatsApp</h1>
    <div id="status">Estado: Desconectado</div>
    <div id="qr-code">
        <p>Escanea el código QR para iniciar sesión:</p>
        <img id="qr-image" src="" alt="Código QR">
    </div>
    <button onclick="cerrarSesion()">Cerrar Sesión</button>

    <script>
        async function obtenerQR() {
            const response = await fetch('/qr');
            const qrCode = await response.text();
            if (qrCode) {
                document.getElementById('qr-image').src = \`https://api.qrserver.com/v1/create-qr-code/?data=\${encodeURIComponent(qrCode)}&size=200x200\`;
                document.getElementById('status').innerText = 'Estado: Desconectado';
                document.getElementById('status').style.color = 'red';
            } else {
                document.getElementById('status').innerText = 'Estado: Conectado';
                document.getElementById('status').style.color = 'green';
            }
        }

        async function obtenerEstado() {
            const response = await fetch('/status');
            const status = await response.text();
            document.getElementById('status').innerText = \`Estado: \${status}\`;
            document.getElementById('status').style.color = status === 'Conectado' ? 'green' : (status === 'Reconectando...' ? 'orange' : 'red');
        }

        async function cerrarSesion() {
            await fetch('/logout');
            alert('Sesión cerrada. Escanea el nuevo código QR.');
            obtenerQR();
        }

        obtenerQR();
        obtenerEstado();
        setInterval(obtenerQR, 60000); // Actualizar el QR cada 60 segundos
        setInterval(obtenerEstado, 5000); // Actualizar el estado cada 5 segundos
    </script>
</body>
</html>`;

const statusHtml = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Estado del Bot WhatsApp</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            text-align: center;
            margin-top: 50px;
        }
        #status {
            margin: 20px auto;
            font-size: 1.2em;
        }
    </style>
</head>
<body>
    <h1>Estado del Bot WhatsApp</h1>
    <div id="status">Estado: Desconectado</div>

    <script>
        async function obtenerEstado() {
            const response = await fetch('/status');
            const status = await response.text();
            document.getElementById('status').innerText = \`Estado: \${status}\`;
            document.getElementById('status').style.color = status === 'Conectado' ? 'green' : (status === 'Reconectando...' ? 'orange' : 'red');
        }

        obtenerEstado();
        setInterval(obtenerEstado, 5000); // Actualizar el estado cada 5 segundos
    </script>
</body>
</html>`;

let users = readUsers();
let gruposDeshabilitados = [];
let sock;
let qrCodeData = '';
let connectionStatus = 'Desconectado';

// Ruta para servir la página de inicio HTML
app.get('/', (req, res) => {
    res.send(indexHtml);
});

// Ruta para servir la página de estado
app.get('/estado', (req, res) => {
    res.send(statusHtml);
});

// Ruta para obtener el código QR y el estado
app.get('/qr', (req, res) => {
    res.send(qrCodeData);
});

app.get('/status', (req, res) => {
    res.send(connectionStatus);
});

// Ruta para cerrar sesión y reiniciar el bot
app.get('/logout', (req, res) => {
    const sessionPath = path.join(__dirname, 'session');
    fs.rmSync(sessionPath, { recursive: true, force: true });
    qrCodeData = '';
    connectionStatus = 'Desconectado';
    iniciarBot();
    res.send('Sesión cerrada. Escanea el nuevo código QR.');
});

// Función para iniciar el bot de WhatsApp
async function iniciarBot() {
    const { state, saveCreds } = await useMultiFileAuthState('session');
    sock = makeWASocket({ auth: state });

    sock.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect, qr } = update;
        if (qr) {
            qrcode.generate(qr, { small: true });
            qrCodeData = qr;
            connectionStatus = 'Desconectado';
        }
        if (connection === 'open') {
            console.log('✅ Bot conectado a WhatsApp');
            qrCodeData = '';
            connectionStatus = 'Conectado';
        }
        if (connection === 'close') {
            const shouldReconnect = lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut;
            console.log('❌ Desconectado. Reconectando...', shouldReconnect);
            connectionStatus = 'Reconectando...';
            if (shouldReconnect) {
                setTimeout(iniciarBot, 5000); // Intentar reconectar después de 5 segundos
            }
        }
    });

    sock.ev.on('creds.update', saveCreds);
    sock.ev.on('messages.upsert', async (msg) => {
        try {
            const mensaje = msg.messages[0];
            if (!mensaje.message) return;

            const remitente = mensaje.key.participant || mensaje.key.remoteJid;
            const grupo = mensaje.key.remoteJid;
            const texto = mensaje.message.conversation || mensaje.message.extendedTextMessage?.text;

            if (!texto) return;

            require('./commands/admin/fantasmas').monitorActividad(sock, mensaje);

            if (!users[remitente]) {
                users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
            }

            if (gruposDeshabilitados.includes(grupo)) {
                const groupMetadata = await sock.groupMetadata(grupo);
                const admins = groupMetadata.participants
                    .filter(participant => participant.admin === 'admin' || participant.admin === 'superadmin')
                    .map(participant => participant.id);

                if (!admins.includes(remitente)) {
                    return;
                }
            }

            const commandDirs = ['info', 'busquedas', 'juegos', 'rpg', 'stickers', 'admin', 'onoff', 'tops'];
            for (const dir of commandDirs) {
                const commandFiles = fs.readdirSync(path.join(__dirname, 'commands', dir)).filter(file => file.endsWith('.js'));
                for (const file of commandFiles) {
                    const command = require(`./commands/${dir}/${file}`);
                    if (command.match && command.execute && command.match(texto)) {
                        await command.execute(sock, mensaje, texto, users, gruposDeshabilitados);
                        break;
                    }
                }
            }

            const acertijosCommand = require('./commands/juegos/acertijos');
            await acertijosCommand.verificarRespuesta(sock, mensaje, users);

            const ordenaCommand = require('./commands/juegos/ordena');
            await ordenaCommand.verificarRespuesta(sock, mensaje, users);

            const peliculasCommand = require('./commands/juegos/peliculas');
            await peliculasCommand.verificarRespuesta(sock, mensaje, users);

            const triviaCommand = require('./commands/juegos/trivia');
            await triviaCommand.verificarRespuesta(sock, mensaje, users);

            const apostarCommand = require('./commands/juegos/apostar');
            await apostarCommand.verificarRespuesta(sock, mensaje, users);

            writeUsers(users); // Guardar los datos de los usuarios
        } catch (error) {
            console.error('Error procesando mensaje:', error);
        }
    });
}

// Iniciar el bot
iniciarBot();

// Iniciar el servidor en el puerto especificado
app.listen(port, () => {
    console.log(`Servidor web iniciado en http://localhost:${port}`);
});
