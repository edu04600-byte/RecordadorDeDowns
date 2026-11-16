const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');
const fs = require('fs');

// ================== CONFIGURACIÓN ==================
const PORT = process.env.PORT || 10000;

const DATOS_FILE = './tareas.json';
const HORA_AVISO = 20;     // hora del aviso (hora de España)
const MINUTO_AVISO = 0;    // minuto del aviso (20:00)

// Robos que avisan a las 20:00 y a los cuántos días. Avisan UNA sola vez por cada vez que los tiras.
const ROBOS = {
    gun: 7,
    pawnshop: 7,
    subteraneo: 7,
    cayo: 7,
    ayawaska: 7,
    yate: 7,
    portaaviones: 7
};

// Robos con horas exactas desde que los tiras. Avisan solo a quien los tiró (una vez).
const TEMPORIZADORES = {
    mercachifle: 24 * 60 * 60 * 1000,
    bigtoni: 24 * 60 * 60 * 1000
};

// Si ya había robos guardados con los nombres antiguos, se pasan solos a los nuevos
const RENOMBRES = {
    robo1: 'gun',
    robo4: 'pawnshop',
    robo5: 'subteraneo',
    robo6: 'cayo'
};

// ================== FUNCIONES ==================
function esRobo(nombre) {
    return Object.prototype.hasOwnProperty.call(ROBOS, nombre);
}

function esTemporizador(nombre) {
    return Object.prototype.hasOwnProperty.call(TEMPORIZADORES, nombre);
}

function ahoraMadrid() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
}

// Fecha de hoy en España como "YYYY-MM-DD"
function hoyStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

// Días que hay entre dos fechas "YYYY-MM-DD"
function diasEntre(a, b) {
    const [ya, ma, da] = a.split('-').map(Number);
    const [yb, mb, db] = b.split('-').map(Number);
    return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

// Convierte milisegundos en "5h 12min"
function formatearTiempo(ms) {
    const totalMin = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

// Convierte un momento (ms) en "16/11 16:03" (hora de España)
function formatearHora(ms) {
    const p = {};
    new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(new Date(ms)).forEach(x => { p[x.type] = x.value; });
    return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

// Estructura: { usuarios: { "idDelUsuario": { gun: { ultima: "YYYY-MM-DD", tirado: 1700000000000, activa: true, canal: "id" }, mercachifle: { proximo: 1700000000000, activa: true, canal: "id" } } } }
// Cada persona del servidor tiene sus propios robos.
function cargarDatos() {
    try {
        const d = JSON.parse(fs.readFileSync(DATOS_FILE, 'utf8'));
        const usuarios = d.usuarios || {};
        for (const misRobos of Object.values(usuarios)) {
            for (const [viejo, nuevo] of Object.entries(RENOMBRES)) {
                if (misRobos[viejo]) {
                    if (!misRobos[nuevo]) misRobos[nuevo] = misRobos[viejo];
                    delete misRobos[viejo];
                }
            }
        }
        return { usuarios };
    } catch {
        return { usuarios: {} };
    }
}

function guardarDatos(datos) {
    fs.writeFileSync(DATOS_FILE, JSON.stringify(datos, null, 2));
}

function esperar(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ================== SERVIDOR WEB (RENDER) ==================
const server = http.createServer((req, res) => {
    res.writeHead(200);
    res.end('Bot activo');
});

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor web escuchando en el puerto ${PORT}`);
});

// ================== BOT ==================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

client.once('ready', () => {
    console.log(`¡CONECTADO CON ÉXITO! Bot logueado como: ${client.user.tag}`);

    // AVISO A LAS 20:00: avisa UNA vez de cada robo que ya toca, en el canal donde lo tiraste, con @everyone
    let ultimoAviso = null;
    setInterval(async () => {
        const ahora = ahoraMadrid();
        const hoy = hoyStr();
        const esHora = ahora.getHours() === HORA_AVISO && ahora.getMinutes() === MINUTO_AVISO;

        if (!esHora || ultimoAviso === hoy) return;
        ultimoAviso = hoy;

        const datos = cargarDatos();

        // Junta los robos pendientes de todos, agrupados por canal, y los marca como avisados (paran solos)
        const porCanal = {};
        let cambios = false;
        for (const misRobos of Object.values(datos.usuarios)) {
            for (const [nombre, r] of Object.entries(misRobos)) {
                if (!esRobo(nombre) || !r.activa || !r.canal) continue;
                if (diasEntre(r.ultima, hoy) < ROBOS[nombre]) continue;
                (porCanal[r.canal] = porCanal[r.canal] || new Set()).add(nombre);
                r.activa = false; // ya no vuelve a avisar hasta que lo tires otra vez
                cambios = true;
            }
        }
        if (cambios) guardarDatos(datos);

        // Un mensaje por cada robo pendiente: "Hoy tienes que hacer el gun @everyone"
        for (const [canalId, nombres] of Object.entries(porCanal)) {
            for (const nombre of Object.keys(ROBOS).filter(n => nombres.has(n))) {
                try {
                    const canal = await client.channels.fetch(canalId);
                    await canal.send({
                        content: `Hoy tienes que hacer el ${nombre} @everyone`,
                        allowedMentions: { parse: ['everyone'] }
                    });
                } catch (e) {
                    console.error(`No pude avisar en el canal ${canalId}:`, e.message);
                }
                await esperar(1000); // pausa para no saturar a Discord
            }
        }
    }, 20000); // revisa cada 20 s; ultimoAviso evita enviarlo dos veces el mismo día

    // AVISO TEMPORIZADORES (mercachifle, bigtoni): horas exactas desde que se tiró, etiqueta SOLO a quien lo tiró (una vez)
    setInterval(async () => {
        const datos = cargarDatos();
        const ahora = Date.now();
        const pendientes = [];

        for (const [userId, misRobos] of Object.entries(datos.usuarios)) {
            for (const nombre of Object.keys(TEMPORIZADORES)) {
                const r = misRobos[nombre];
                if (!r || !r.activa || !r.proximo || !r.canal) continue;
                if (ahora < r.proximo) continue;
                r.activa = false; // se marca antes de enviar para que no se repita
                pendientes.push({ userId, nombre, canalId: r.canal });
            }
        }

        if (pendientes.length === 0) return;
        guardarDatos(datos);

        for (const { userId, nombre, canalId } of pendientes) {
            try {
                const canal = await client.channels.fetch(canalId);
                await canal.send({
                    content: `<@${userId}> Ya puedes hacer el ${nombre}`,
                    allowedMentions: { users: [userId] }
                });
            } catch (e) {
                console.error(`No pude avisar del ${nombre} en el canal ${canalId}:`, e.message);
            }
            await esperar(1000);
        }
    }, 10000); // revisa cada 10 s
});

client.on('messageCreate', (message) => {
    // Evita que el bot responda a sí mismo o a otros bots
    if (message.author.bot) return;

    const texto = message.content.trim();
    const tieneBang = texto.startsWith('!');
    const cmd = (tieneBang ? texto.slice(1) : texto).trim().toLowerCase();

    // --- ROBOS (cada persona tiene los suyos; solo con "!") ---
    if (tieneBang) {
        const userId = message.author.id;

        // !robos -> ✅ Disponible o ❌ con el CD que le falta, y a la derecha la hora a la que lo tiraste
        if (cmd === 'robos') {
            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};
            const hoy = hoyStr();

            const lineas = Object.keys(ROBOS).map(nombre => {
                const r = misRobos[nombre];
                const hora = r && r.tirado ? ` | tirado ${formatearHora(r.tirado)}` : '';
                if (!r || !r.activa) return `✅ ${nombre}: Disponible${hora}`;
                const d = diasEntre(r.ultima, hoy);
                if (d >= ROBOS[nombre]) return `✅ ${nombre}: Disponible${hora}`;
                const faltan = ROBOS[nombre] - d;
                return `❌ ${nombre}: CD ${faltan} ${faltan === 1 ? 'día' : 'días'}${hora}`;
            });

            // Temporizadores de horas (mercachifle, bigtoni). La hora a la que se tiró = proximo - duración
            for (const [nombre, dur] of Object.entries(TEMPORIZADORES)) {
                const t = misRobos[nombre];
                const horaT = t && t.proximo ? ` | tirado ${formatearHora(t.proximo - dur)}` : '';
                if (!t || !t.activa || !t.proximo || Date.now() >= t.proximo) {
                    lineas.push(`✅ ${nombre}: Disponible${horaT}`);
                } else {
                    lineas.push(`❌ ${nombre}: CD ${formatearTiempo(t.proximo - Date.now())}${horaT}`);
                }
            }

            return message.reply(lineas.join('\n'));
        }

        // !clear gun -> cancela ese aviso (no te avisa hasta que escribas !gun otra vez)
        if (cmd.startsWith('clear ')) {
            const nombre = cmd.slice(6).trim().replace(/^!/, '');
            const todos = [...Object.keys(ROBOS), ...Object.keys(TEMPORIZADORES)];
            if (!todos.includes(nombre)) return message.reply(`Ese robo no existe. Usa: ${todos.join(', ')}`);

            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};
            if (!misRobos[nombre] || !misRobos[nombre].activa) return message.reply(`${nombre} ya estaba parado`);

            misRobos[nombre].activa = false;
            datos.usuarios[userId] = misRobos;
            guardarDatos(datos);
            return message.reply(`El temporizador de !${nombre} se ha eliminado, tíralo de nuevo para que funcione`);
        }

        // !mercachifle, !bigtoni -> empieza a contar las horas exactas y te etiqueta a ti cuando pasen (una vez)
        if (esTemporizador(cmd)) {
            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};
            const yaActivo = misRobos[cmd] && misRobos[cmd].activa;
            const horas = TEMPORIZADORES[cmd] / 3600000;

            misRobos[cmd] = {
                proximo: Date.now() + TEMPORIZADORES[cmd],
                activa: true,
                canal: message.channel.id
            };
            datos.usuarios[userId] = misRobos;
            guardarDatos(datos);

            return message.reply(yaActivo
                ? `Hecho ✅ ${cmd}. Reinicio el contador, te aviso en ${horas} horas exactas`
                : `En ${horas} horas exactas te aviso para el ${cmd} (solo te aviso 1 vez, cuando lo vuelvas a hacer tira !${cmd} otra vez)`);
        }

        // !gun, !yate... -> apunta que has hecho ese robo HOY y te avisa UNA vez cuando toque (en este mismo canal)
        if (esRobo(cmd)) {
            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};
            const yaActivo = misRobos[cmd] && misRobos[cmd].activa;

            misRobos[cmd] = {
                ultima: hoyStr(),
                tirado: Date.now(), // momento exacto en que lo tiraste
                activa: true,
                canal: message.channel.id
            };
            datos.usuarios[userId] = misRobos;
            guardarDatos(datos);

            return message.reply(yaActivo
                ? `Hecho ✅ ${cmd}. Reinicio el contador, te aviso en ${ROBOS[cmd]} días`
                : `En ${ROBOS[cmd]} días te aviso para el ${cmd} (solo te aviso 1 vez, cuando lo vuelvas a hacer tira !${cmd} otra vez, o !clear ${cmd} para cancelar)`);
        }
    }

    // --- PRUEBADOWN (prueba de 30 segundos, avisa a @everyone) ---
    if (cmd === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');
        setTimeout(() => {
            message.channel.send({
                content: '¡La prueba de 30 segundos ha terminado!',
                allowedMentions: { parse: ['everyone'] }
            });
        }, 30000); // 30 segundos
    }

    // --- RESUMENDOWN (1 hora) ---
    if (cmd === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');
        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> Rota el resumen nigga`);
        }, 3600000); // 3,600,000 ms = 1h
    }

    // --- POSTULAR ---
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
**Cuando respondas todas las preguntas escribe "postule"**`);
    }

    // --- POSTULE (cierre) ---
    if (cmd === 'postule') {
        message.reply(`🔴Gracias por postular los resultados se darán los próximos días por el canal de ⁠📢┃𝐀𝐧𝐮𝐧𝐜𝐢𝐨s 🔴`);
    }
});

// ================== INICIO ==================
client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
