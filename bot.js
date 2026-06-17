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

    if (cmd === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ¡Es hora del resumen!`);
        }, 3600000); 
    }

    if (cmd === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30000); 
    }
});

// INICIO DEL BOT
client.login(process.env.TOKEN);
