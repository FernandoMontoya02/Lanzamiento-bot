module.exports = {
    match: (texto) => texto === '.menu',
    execute: async (sock, mensaje, texto, users) => {
        // Obtener el remitente del mensaje (grupo o privado)
        const remitente = mensaje.key.participant || mensaje.key.remoteJid;
        if (!remitente) {
            console.error("Error: 'remoteJid' no disponible.");
            return;
        }

        // Si no existe, asignar valores predeterminados
        if (!users[remitente]) {
            users[remitente] = { dulces: 0, xp: 0, nivel: 0, admin: false };
        }
        const user = users[remitente];

        // Obtener el nombre del contacto (si está disponible)
        let nombre;
        try {
            const contact = sock.store && sock.store.contacts ? sock.store.contacts[remitente] || {} : {};
            nombre = contact.notify || contact.vname || contact.name || remitente.split('@')[0];
        } catch (error) {
            console.error("Error al obtener el contacto:", error);
            nombre = remitente.split('@')[0];
        }

        // Crear el mensaje con la mención al usuario
        const respuesta = `
Hola @${remitente.split('@')[0]}, Este Es El Menu De BOT 🤖

╭──⬣ 「 🏆 INFO USUARIO 」 ⬣──  
│ 👤 Nombre: @${remitente.split('@')[0]}  
│ 🍬 Dulces: ${user.dulces}  
╰──────────────⬣  

╭──⚔️ 「 📌 ADMINISTRACIÓN 」 ⚔️──  
│ 📌 .del - Eliminar un mensaje  
│ 🚪 .kick @user - Expulsar usuario  
│ 📋 .inactivos - Ver inactivos  
│ 🔔 .n - Enviar notificación  
│ 👑 .owner @user - Dar admin  
│ 🛑 .revoke @user - Quitar admin  
│ 👥 .todos - Ver todos los usuarios  
│ 🚫 .dchat - Deshabilitar chat  
│ ✅ .hchat - Habilitar chat  
│ 🔄 .spam @user - Enviar spam  
│ 📊 .status - Ver estado  
╰──────────────⬣  

╭──🔎 「 🔍 BÚSQUEDAS 」 🔎──  
│ 🎵 .yt <texto> - Buscar en YouTube  
│ 🎶 .music <URL> - Descargar música  
╰──────────────⬣  

╭──🎮 「 🎲 JUEGOS 」 🎮──  
│ 🎰 .apostar <cantidad> - Adivina un número (1-10)  
│ 🤔 .acertijo - Resolver acertijos  
│ 🎬 .pelicula - Adivina la película  
│ 🔠 .ordena - Ordenar palabras  
│ 😘 .piropo @user - Enviar un piropo  
│ ❓ .trivia - Juego de preguntas  
│ 🏆 .tops <tema> - Ranking aleatorio  
╰──────────────⬣  

╭──⚔️ 「 🌟 RPG 」 ⚔️──  
│ 🎁 .claim - Reclamar recompensa  
│ 🕵️‍♂️ .crimen - Cometer un crimen  
│ 🍬 .dulces - Ver dulces  
│ ⛏ .minar - Minar dulces  
│ 💼 .work - Trabajar  
╰──────────────⬣  

╭──🏞 「 ✂️ STICKERS 」 🏞──  
│ 🖼 .img - Convertir sticker a imagen  
│ 🎭 .sticker - Convertir imagen a sticker  
╰──────────────⬣  

╭──📴 「 🔄 BOT CONTROL 」 📴──  
│ ✅ .enable - Habilitar el bot para todos menos comandos de admin 
│ 🚫 .disable - Solo admins podran usar comandos  
╰──────────────⬣  
`;

        // Enviar mensaje mencionando al remitente
        await sock.sendMessage(mensaje.key.remoteJid, {
            text: respuesta,
            mentions: [remitente] // Mencionamos al remitente con su identificador
        });
    }
};
