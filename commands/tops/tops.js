const levenshtein = require('fast-levenshtein'); // Instalar con: npm install fast-levenshtein

module.exports = {
    match: (texto) => texto && texto.startsWith('.top '),
    execute: async (sock, mensaje) => {
        const grupo = mensaje.key.remoteJid;

        try {
            // Obtener información del grupo
            const groupMetadata = await sock.groupMetadata(grupo);
            let participantes = groupMetadata.participants.map(p => p.id);

            // Obtener el texto después de ".top"
            let texto = mensaje.message?.conversation || mensaje.message?.extendedTextMessage?.text || '';
            texto = texto.replace(/^\.top\s*/, '').trim();

            if (!texto) {
                await sock.sendMessage(grupo, { text: '⚠️ Debes escribir un texto después de ".top"' });
                return;
            }

            // Diccionario de emojis según la palabra clave
            const emojis = {
                'gay': '🌈',
                'pendejos': '🤡',
                'inteligentes': '🧠',
                'guapos': '😎',
                'pro': '🔥',
                'locos': '🤪',
                'novios': '💑',
                'lindos': '💖',
                'cracks': '🏆',
                'tóxicos': '☠️',
                'dioses': '⚡'
            };

            // Función para encontrar la palabra más similar
            const encontrarPalabraSimilar = (input, opciones) => {
                let mejorCoincidencia = '';
                let menorDistancia = Infinity;
                for (const palabra of opciones) {
                    const distancia = levenshtein.get(input.toLowerCase(), palabra.toLowerCase());
                    if (distancia < menorDistancia) {
                        menorDistancia = distancia;
                        mejorCoincidencia = palabra;
                    }
                }
                return menorDistancia <= 2 ? mejorCoincidencia : input; // Si la diferencia es pequeña, corregir
            };

            // Buscar la palabra más parecida en el diccionario
            texto = encontrarPalabraSimilar(texto, Object.keys(emojis));
            const emoji = emojis[texto.toLowerCase()] || '🔥';

            // Mezclar aleatoriamente los participantes
            participantes = participantes.sort(() => Math.random() - 0.5);

            // Tomar solo 10 (si hay menos, tomarlos todos)
            const seleccionados = participantes.slice(0, 10);

            if (seleccionados.length === 0) {
                await sock.sendMessage(grupo, { text: '⚠️ No hay suficientes miembros en el grupo para hacer un top.' });
                return;
            }

            // Crear lista de menciones con formato 1. @usuario
            let mensajeTop = `${emoji} *TOP 9 ${texto.toUpperCase()} DEL GRUPO:* ${emoji}\n\n`;
            mensajeTop += seleccionados.map((id, index) => `${index + 1}. @${id.split('@')[0]}`).join('\n');

            // Enviar el mensaje
            await sock.sendMessage(grupo, {
                text: mensajeTop,
                mentions: seleccionados
            });

        } catch (error) {
            console.error('Error al ejecutar .top:', error);
            await sock.sendMessage(grupo, { text: '⚠️ Hubo un error al generar el top.' });
        }
    }
};
