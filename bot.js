const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('¡El bot ya está despierto y listo!');
});

// ESTO MANTIENE AL BOT VIVO (Auto-Ping)
setInterval(() => {
    http.get('http://recordadordedowns.onrender.com'); 
    console.log('Auto-ping realizado para evitar inactividad.');
}, 240000); // Cada 4 minutos

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    const texto = message.content.toLowerCase().trim();

    if (texto === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        const channel = message.channel;
        const userId = message.author.id;
        setTimeout(() => {
            channel.send(`<@${userId}> ¡Es hora del resumen!`);
        }, 3600000); 
    }

    if (texto === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        const channel = message.channel;
        const userId = message.author.id;
        setTimeout(() => {
            channel.send(`<@${userId}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30000);
    }
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot activo');
}).listen(PORT);

client.login(process.env.TOKEN);
