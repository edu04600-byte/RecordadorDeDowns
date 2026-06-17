const { Client, GatewayIntentBits } = require('discord.js');
require('dotenv').config({ path: './config.txt' });

const client = new Client({ 
    intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent
    ] 
});

client.once('ready', () => {
    console.log('¡El bot ya está despierto y listo!');
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;

    const texto = message.content.toLowerCase().trim();

    // COMANDO 1
    if (texto === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        const usuarioId = message.author.id;
        const frases = [
            "Rota resumen down",
            "Te gusta mucho el resumen o que",
            "Rotalo ya idiota",
            "Cuando quieras lo rotas, tienes todo el tiempo del mundo"
        ];
        setTimeout(() => {
            const frase = frases[Math.floor(Math.random() * frases.length)];
            message.channel.send(`<@${usuarioId}> ${frase}`);
        }, 1 * 60 * 60 * 1000); 
    }

    // COMANDO 2
    if (texto === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        const usuarioId = message.author.id;
        setTimeout(() => {
            message.channel.send(`<@${usuarioId}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30 * 1000);
    }
});

// Servidor para Render
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Bot activo');
}).listen(process.env.PORT || 3000);

client.login(process.env.TOKEN);
