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
    // Evita que el bot se responda a sí mismo
    if (message.author.bot) return;

    const textoUsuario = message.content.toLowerCase();

    // Detecta la palabra clave
    if (textoUsuario === 'resumendown') {
        
        // MENSAJE INICIAL NUEVO PERSONALIZADO PARA LOS MODS 👇
        message.reply('En 1 hora te aviso, si no estas te violo');

        // Guardamos el usuario que ha puesto el mensaje para tagearle luego
        const usuarioId = message.author.id;

        // Lista de frases aleatorias para cuando pase la hora
        const frases = [
            "Rota resumen down",
            "Te gusta mucho el resumen o que",
            "Rotalo ya idiota",
            "Cuando quieras lo rotas, tienes todo el tiempo del mundo"
        ];

        // Espera 1 hora (1 hora = 60 minutos * 60 segundos * 1000 milisegundos)
        setTimeout(() => {
            // Elige una frase al azar de la lista
            const fraseAleatoria = frases[Math.floor(Math.random() * frases.length)];
            
            // Envía el mensaje al canal tageando a la persona
            message.channel.send(`<@${usuarioId}> ${fraseAleatoria}`);
            
        }, 1 * 60 * 60 * 1000); 
    }
});

client.login(process.env.TOKEN);