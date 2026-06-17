const { Client, GatewayIntentBits } = require('discord.js');

const client = new Client({ 
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] 
});

client.once('ready', () => {
    console.log('Bot conectado y listo.');
});

client.on('messageCreate', (message) => {
    if (message.author.bot) return;
    
    const cmd = message.content.toLowerCase().trim();

    if (cmd === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> Rota resumen retrasado`);
        }, 3600000); 
    }

    if (cmd === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> ¡La prueba de 30 segundos ha terminado!`);
        }, 30000); 
    }
});

client.login(process.env.TOKEN);
