const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    match: (texto) => texto === '.s',
    execute: async (sock, mensaje, texto, users) => {
        try {
            const quotedMessage = mensaje.message.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMessage) {
                await sock.sendMessage(mensaje.key.remoteJid, { text: 'Por favor, responde a una imagen o video con el comando .s' }, { quoted: mensaje });
                return;
            }

            const messageType = Object.keys(quotedMessage)[0];
            const isVideo = messageType.includes('video');
            const stream = await downloadContentFromMessage(quotedMessage[messageType], isVideo ? 'video' : 'image');

            // Convertir el stream en buffer
            let buffer = Buffer.from([]);
            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

            const inputPath = path.join(tempDir, `${Date.now()}.${isVideo ? 'mp4' : 'jpg'}`);
            fs.writeFileSync(inputPath, buffer);

            const outputPath = path.join(tempDir, `${Date.now()}.webp`);

            if (isVideo) {
                // Convertir video a sticker animado
                exec(`"${ffmpegPath}" -i "${inputPath}" -vf "scale=512:512:flags=lanczos" -c:v libwebp -preset default -loop 0 -an -vsync 0 -t 5 "${outputPath}"`, async (error) => {
                    fs.unlinkSync(inputPath); // Eliminar video original

                    if (error) {
                        console.error('❌ Error en la conversión:', error);
                        await sock.sendMessage(mensaje.key.remoteJid, { text: 'Error al convertir el video a sticker animado.' }, { quoted: mensaje });
                        return;
                    }

                    // Enviar el sticker animado
                    await sock.sendMessage(mensaje.key.remoteJid, { sticker: { url: outputPath } }, { quoted: mensaje });
                    fs.unlinkSync(outputPath); // Eliminar sticker después de enviarlo
                });

            } else {
                // Convertir imagen a sticker estático
                const stickerBuffer = await sharp(inputPath).resize(512, 512).webp().toBuffer();
                fs.unlinkSync(inputPath); // Eliminar imagen original

                await sock.sendMessage(mensaje.key.remoteJid, { sticker: stickerBuffer }, { quoted: mensaje });
            }

        } catch (error) {
            console.error('❌ Error procesando el archivo:', error);
            await sock.sendMessage(mensaje.key.remoteJid, { text: 'Hubo un error. Inténtalo de nuevo.' }, { quoted: mensaje });
        }
    }
};
