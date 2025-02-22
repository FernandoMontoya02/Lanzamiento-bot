const { exec } = require("child_process");
const axios = require("axios");
const fs = require("fs");
const path = require("path");
const ffmpegPath = require("ffmpeg-static");

const tempFolder = path.join(__dirname, "commands", "stickers", "temp");
const ytDlpPath = path.resolve(__dirname, "yt-dlp.exe").replace(/\\/g, "/");

// Crear carpeta temporal si no existe
if (!fs.existsSync(tempFolder)) fs.mkdirSync(tempFolder, { recursive: true });

const actualizarMensaje = async (sock, chatId, mensaje, mensajeInicial, progreso) => {
    if (!mensaje?.key?.id) return; 
    for (let i = 0; i < progreso.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        await sock.sendMessage(chatId, { edit: mensaje.key, text: `${mensajeInicial}\n⏳ ${progreso[i]}` });
    }
};

module.exports = {
    match: (texto) => texto && (texto.startsWith(".music") || texto.startsWith(".yt")),
    execute: async (sock, mensaje, texto) => {
        const chatId = mensaje.key.remoteJid;
        const args = texto.split(" ");
        const command = args[0];

        if (command === ".music") {
            if (args.length < 2) return await sock.sendMessage(chatId, { text: "❌ *Uso incorrecto.*\nEjemplo: *.music <URL de YouTube>*" });
            
            const url = args[1];
            const infoMsg = await sock.sendMessage(chatId, { text: "⏳ *Obteniendo información de la canción...*" });

            // COMANDO MEJORADO PARA EVITAR ERRORES
            const ytDlpCommand = `"${ytDlpPath}" --print "%(title)s|%(duration)s" "${url}"`;
            console.log("Ejecutando comando:", ytDlpCommand);

            exec(ytDlpCommand, async (error, stdout, stderr) => {
                if (error || !stdout.trim()) {
                    console.error("Error en yt-dlp:", stderr || error);
                    return await sock.sendMessage(chatId, { text: "❌ *Error al obtener la información de la canción.*" });
                }
                
                const [titulo, duracion] = stdout.trim().split("|");
                const duracionSegundos = parseFloat(duracion);
                const outputFile = path.join(tempFolder, `${titulo.replace(/[<>:"/\\|?*]+/g, "")}.mp3`);
                
                let mensajeDescarga = `🎶 Descargando: ${titulo}`;
                const progreso = ["[▒▒▒▒▒▒▒▒▒▒] 0%", "[██▒▒▒▒▒▒▒▒] 20%", "[██████▒▒▒▒] 50%", "[████████▒▒] 90%"];
                const descargaMsg = await sock.sendMessage(chatId, { text: `${mensajeDescarga}\n⏳ ${progreso[0]}` });
                await actualizarMensaje(sock, chatId, descargaMsg, mensajeDescarga, progreso);

                // COMANDO PARA DESCARGAR LA CANCIÓN
                const downloadCommand = `"${ytDlpPath}" -x --audio-format mp3 --ffmpeg-location "${ffmpegPath}" -o "${outputFile}" "${url}" --quiet`;
                console.log("Ejecutando descarga:", downloadCommand);

                exec(downloadCommand, async (error) => {
                    if (error || !fs.existsSync(outputFile)) {
                        console.error("Error en descarga:", error);
                        return await sock.sendMessage(chatId, { text: "❌ *Error al descargar la música.*" });
                    }

                    await sock.sendMessage(chatId, { edit: descargaMsg.key, text: `${mensajeDescarga}\n✅ Descarga completa, enviando archivo...` });
                    const message = duracionSegundos <= 480 ? { audio: fs.readFileSync(outputFile), mimetype: "audio/mp4", ptt: false } : { document: fs.readFileSync(outputFile), mimetype: "audio/mpeg", fileName: `${titulo}.mp3` };
                    await sock.sendMessage(chatId, message);
                    fs.unlink(outputFile, (err) => { if (err) console.error("Error al eliminar el archivo:", err); });
                });
            });
        } else if (command === ".yt") {
            const query = texto.replace(".yt ", "").trim();
            if (!query) return await sock.sendMessage(chatId, { text: "❌ *Uso incorrecto.*\nEjemplo: *.yt Despacito*" });
            
            await sock.sendMessage(chatId, { text: `🔍 *Buscando:* ${query}` });
            try {
                const response = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`);
                const match = response.data.match(/"videoId":"(.*?)"/);
                const videoUrl = match ? `https://www.youtube.com/watch?v=${match[1]}` : "❌ *No se encontraron resultados.*";
                await sock.sendMessage(chatId, { text: `🎶 *Resultado encontrado:*\n${videoUrl}` });
            } catch (error) {
                console.error("Error en la búsqueda de YouTube:", error);
                await sock.sendMessage(chatId, { text: "❌ *Error al realizar la búsqueda.*" });
            }
        }
    }
};
