const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

// CONFIGURACIÓN DEL PUERTO PARA RENDER
const PORT = process.env.PORT || 10000;

// SERVIDOR WEB OBLIGATORIO PARA MANTENER EL PROCESO VIVO
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot activo');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

// CONFIGURACIÓN DEL BOT
const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.once('ready', () => {
    console.log(`Bot conectado como ${client.user.tag}`);
});

client.on('messageCreate', (message) => {
    // Evita que el bot responda a sí mismo
    if (message.author.bot) return;
    
    const cmd = message.content.toLowerCase().trim();

    // COMANDO RESUMENDOWN (Actualizado a 1 hora exacta)
    if (cmd === 'resumedown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> Rota el resumen nigga`);
        }, 3600000); // 3,600,000 ms = 1 hora
    }

    if (cmd === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30000); 
    }

    // COMANDO POSTULAR
    if (cmd === 'postular') {
        message.reply(`Estas son unas preguntas que los moderadores decidimos saber antes de que quieras formar parte de esta moderación.

-1: ¿Qué edad tienes?

-2: ¿Qué te motiva a querer formar parte del equipo de moderación de este canal en particular?

-3: ¿Tienes experiencia previa como moderador en Twitch u otras plataformas similares? Si la respuesta es ¨si¨, en que canales has moderado?

-4: ¿Cómo manejarías las críticas o quejas de los espectadores sobre las decisiones de moderación tomadas por ti o por otros moderadores?

-5: ¿Dispones de PC?

-6: Adjunta nombre de usuario de Twitch y Kick.

-7: ¿Dispones de todo el stream para moderar? 

-8: Si estas tu solo moderando el chat y varios usuarios comenzaron a decir comentarios racistas, machistas e insultos hacía xParga, stremears, players, etc... ¿Cómo retomarías el control del chat, que acciones tomarías en contra de los responsables y como harías para que no se vuelva a repetir?

[Esto es mas un aviso que otra cosa, al adjuntar tu cuenta de Twitch y Kick, revisaremos la actividad que tienes, esto quiere decir que si tienes 3 mensajes y no eres tan activo en el canal bajan mas las probabilidades de entrar en la moderación, esto no quiere decir que no puedas pero la actividad se toma mucho en cuenta]
**Cuando respondas todas las preguntas escribe "ya esta"**`);
    }

    // --- COMANDOS DE CIERRE ---
    
    // 1. Sin acento
    if (cmd === 'postule') {
        message.reply(`🔴Gracias por postular los resultados se darán los próximos días por el canal de ⁠📢┃𝐀𝐧𝐮𝐧𝐜𝐢𝐨s 🔴`);
    }

    // --------------------------

}); // Cierre correcto de client.on

// INICIO DEL BOT
client.login(process.env.TOKEN);
