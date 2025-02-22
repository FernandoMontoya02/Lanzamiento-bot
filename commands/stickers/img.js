const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
const { downloadContentFromMessage } = require('@whiskeysockets/baileys');

module.exports = {
    match: (texto) => texto === '.img',
    execute: async (sock, mensaje, texto, users) => {
        try {
            const quotedMessage = mensaje.message?.extendedTextMessage?.contextInfo?.quotedMessage;
            if (!quotedMessage?.stickerMessage) {
                await sock.sendMessage(mensaje.key.remoteJid, { text: '❌ Responde a un sticker con el comando .img' }, { quoted: mensaje });
                return;
            }

            // 🔹 Enviar mensaje de "procesando" para respuesta inmediata
            const procesandoMsg = await sock.sendMessage(mensaje.key.remoteJid, { text: '⏳ Procesando sticker...' }, { quoted: mensaje });

            console.log('📥 Descargando sticker...');
            const stream = await downloadContentFromMessage(quotedMessage.stickerMessage, 'sticker');
            let buffer = Buffer.from([]);

            for await (const chunk of stream) {
                buffer = Buffer.concat([buffer, chunk]);
            }

            if (buffer.length === 0) {
                throw new Error('❌ No se pudo obtener el buffer del sticker.');
            }

            console.log('✅ Sticker descargado correctamente');

            // 🔹 Convertir WebP a PNG
            const imageBuffer = await sharp(buffer).png().toBuffer();

            // 🔹 Guardar la imagen en un archivo temporal
            const tempDir = path.join(__dirname, 'temp');
            if (!fs.existsSync(tempDir)) {
                fs.mkdirSync(tempDir, { recursive: true });
            }

            const imagePath = path.join(tempDir, `${Date.now()}.png`);
            await fs.promises.writeFile(imagePath, imageBuffer);

            console.log(`✅ Imagen guardada en: ${imagePath}`);

            // 🔹 Enviar imagen rápidamente
            await sock.sendMessage(mensaje.key.remoteJid, { 
                image: { url: imagePath }, 
                caption: '🖼️ Aquí está tu imagen' 
            }, { quoted: mensaje });

            // 🔹 Eliminar mensaje de "procesando" y borrar la imagen en paralelo
            await Promise.all([
                sock.sendMessage(mensaje.key.remoteJid, { delete: procesandoMsg.key }), // Borra el mensaje de "Procesando..."
                fs.promises.unlink(imagePath) // Borra la imagen después de enviarla
            ]);

            console.log(`🗑️ Imagen eliminada: ${imagePath}`);

        } catch (error) {
            console.error('❌ Error procesando el sticker:', error);
            await sock.sendMessage(mensaje.key.remoteJid, { text: '⚠️ Error al convertir el sticker a imagen. Inténtalo de nuevo.' }, { quoted: mensaje });
        }
    }
};
