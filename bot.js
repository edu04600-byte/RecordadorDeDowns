const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('¡El bot ya está despierto y listo!');
});

// Forzar reconexión si el bot se queda mudo
client.on('error', (error) => {
    console.error('Error detectado, intentando reconectar...', error);
    client.login(process.env.TOKEN);
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    const texto = message.content.toLowerCase().trim();

    if (texto === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        const channel = message.channel;
        const userId = message.author.id;
        setTimeout(() => {
            channel.send(`<@${userId}> ¡La prueba de 30 segundos ha terminado!`).catch(console.error);
        }, 30000);
    }
});

const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot activo');
}).listen(PORT);

client.login(process.env.TOKEN);
