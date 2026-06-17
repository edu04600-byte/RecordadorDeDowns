const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('Bot conectado y escuchando...');
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    
    const cmd = message.content.toLowerCase().trim();

    if (cmd === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ¡Es hora del resumen!`);
        }, 3600000); // 1 hora
    }

    if (cmd === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30000); // 30 segundos
    }
});

// Servidor web para que Render no se queje
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.end('OK');
}).listen(PORT);

client.login(process.env.TOKEN);
