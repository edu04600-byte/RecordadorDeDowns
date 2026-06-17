const { Client, GatewayIntentBits } = require('discord.js');
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('¡El bot ya está despierto y listo!');
});

// Esto mantiene al bot activo enviando un log cada 5 minutos
setInterval(() => {
    console.log('Bot activo y manteniendo conexión...');
}, 300000);

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

const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200, {'Content-Type': 'text/plain'});
    res.write('Bot en linea');
    res.end();
}).listen(PORT);

client.login(process.env.TOKEN);
