const { Client, GatewayIntentBits } = require('discord.js');
// IMPORTANTE: Ya no usaremos config.txt, usaremos las variables que pusiste en Render
const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('¡El bot ya está despierto y listo!');
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    const texto = message.content.toLowerCase().trim();

    if (texto === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        const usuarioId = message.author.id;
        setTimeout(() => {
            message.channel.send(`<@${usuarioId}> ¡Es hora del resumen!`);
        }, 3600000); 
    }

    if (texto === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        const usuarioId = message.author.id;
        setTimeout(() => {
            message.channel.send(`<@${usuarioId}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30000);
    }
});

// ESTO ES LO QUE ARREGLA EL ERROR DE "NO OPEN PORTS"
const http = require('http');
const PORT = process.env.PORT || 3000;
http.createServer((req, res) => {
  res.write('Bot activo');
  res.end();
}).listen(PORT, () => {
  console.log('Servidor web escuchando en el puerto ' + PORT);
});

client.login(process.env.TOKEN);
