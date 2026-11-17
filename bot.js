const { Client, GatewayIntentBits } = require('discord.js');
const http = require('http');
const fs = require('fs');

// ================== CONFIGURACIÓN ==================
const PORT = process.env.PORT || 10000;

// Si en Render tienes un Persistent Disk, pon DATA_FILE=/ruta/del/disco/tareas.json
const DATOS_FILE = process.env.DATA_FILE || './tareas.json';
const HORA_AVISO = 20;
const MINUTO_AVISO = 0;

// Robos que avisan a las 20:00 cada 7 días
const ROBOS = {
    gun: 7,
    mecanico: 7,
    pawnshop: 7,
    subteraneo: 7,
    ayawaska: 7,
    yate: 7,
    portaaviones: 7,
    obreros: 7
};

// Robos con temporizadores de horas exactas
const TEMPORIZADORES = {
    mercachifle: 24 * 60 * 60 * 1000,
    bigtoni: 24 * 60 * 60 * 1000,
    weedrun: 8 * 60 * 60 * 1000
};

// Avisos aparte (NO salen en !robos)
const RECORDATORIOS = {
    cosecha: {
        cadaMs: 2 * 60 * 60 * 1000,
        veces: 4,
        everyoneAlFinal: true,
        de: 'de la cosecha',
        inicio: 'Cosecha iniciada. Te aviso cada 2 horas durante 8 horas (4 avisos).'
    },
    duplicado: {
        cadaMs: 3 * 60 * 60 * 1000,
        veces: 1,
        everyoneAlFinal: false,
        de: 'del duplicado',
        inicio: 'Duplicado iniciado. Te aviso en 3 horas.'
    },
    duplicado2h: {
        cadaMs: 2 * 60 * 60 * 1000,
        veces: 1,
        everyoneAlFinal: false,
        de: 'del duplicado de 2h',
        inicio: 'Duplicado de 2h iniciado. Te aviso en 2 horas.'
    }
};

// Otros nombres con los que se puede escribir un comando
const ALIAS = {
    cosechado: 'cosecha'
};

// Nombres antiguos
const RENOMBRES = {
    robo1: 'gun',
    robo4: 'pawnshop',
    robo5: 'subteraneo'
};

// ================== EVITAR QUE EL BOT SE CAIGA POR ERRORES ==================
process.on('unhandledRejection', (e) => {
    console.error('[unhandledRejection]', e);
});
process.on('uncaughtException', (e) => {
    console.error('[uncaughtException]', e);
});

// ================== FUNCIONES ==================
function esRobo(nombre) {
    return Object.prototype.hasOwnProperty.call(ROBOS, nombre);
}

function esTemporizador(nombre) {
    return Object.prototype.hasOwnProperty.call(TEMPORIZADORES, nombre);
}

function esRecordatorio(nombre) {
    return Object.prototype.hasOwnProperty.call(RECORDATORIOS, nombre);
}

function nombreReal(nombre) {
    return Object.prototype.hasOwnProperty.call(ALIAS, nombre) ? ALIAS[nombre] : nombre;
}

function ahoraMadrid() {
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Europe/Madrid' }));
}

function hoyStr() {
    return new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/Madrid' });
}

function diasEntre(a, b) {
    const [ya, ma, da] = a.split('-').map(Number);
    const [yb, mb, db] = b.split('-').map(Number);
    return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000);
}

function formatearTiempo(ms) {
    const totalMin = Math.max(1, Math.ceil(ms / 60000));
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return h > 0 ? `${h}h ${m}min` : `${m}min`;
}

function formatearHora(ms) {
    const p = {};
    new Intl.DateTimeFormat('es-ES', {
        timeZone: 'Europe/Madrid',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    }).formatToParts(new Date(ms)).forEach(x => {
        p[x.type] = x.value;
    });
    return `${p.day}/${p.month} ${p.hour}:${p.minute}`;
}

// ================== ALMACENAMIENTO PERSISTENTE (UPSTASH REDIS) ==================
// Si defines UPSTASH_REDIS_REST_URL y UPSTASH_REDIS_REST_TOKEN, los datos se guardan
// en Upstash y sobreviven a los reinicios de Render. Si no, se usa el archivo local.
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const USA_UPSTASH = Boolean(UPSTASH_URL && UPSTASH_TOKEN);
const CLAVE_REDIS = 'tareas';

let DATOS = { usuarios: {} };
let colaGuardado = Promise.resolve();

async function upstash(comando) {
    const res = await fetch(UPSTASH_URL, {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(comando)
    });
    if (!res.ok) throw new Error(`Upstash respondió ${res.status}`);
    const json = await res.json();
    if (json.error) throw new Error(json.error);
    return json.result;
}

function normalizarDatos(d) {
    const usuarios = (d && d.usuarios) || {};

    for (const misRobos of Object.values(usuarios)) {
        for (const [viejo, nuevo] of Object.entries(RENOMBRES)) {
            if (misRobos[viejo]) {
                if (!misRobos[nuevo]) misRobos[nuevo] = misRobos[viejo];
                delete misRobos[viejo];
            }
        }
    }

    return { usuarios };
}

// Se llama UNA vez al arrancar, antes de conectar el bot
async function cargarInicial() {
    try {
        if (USA_UPSTASH) {
            const raw = await upstash(['GET', CLAVE_REDIS]);
            DATOS = normalizarDatos(raw ? JSON.parse(raw) : {});
            console.log('[datos] Cargados desde Upstash');
        } else {
            DATOS = normalizarDatos(JSON.parse(fs.readFileSync(DATOS_FILE, 'utf8')));
            console.log('[datos] Cargados desde archivo local (ATENCIÓN: se pierden si Render reinicia)');
        }
    } catch (e) {
        if (e.code !== 'ENOENT') {
            console.error('[datos] Error cargando datos:', e.message);
        }
        DATOS = { usuarios: {} };
    }
}

// Siempre devuelve los datos en memoria (síncrono)
function cargarDatos() {
    return DATOS;
}

// Guarda en memoria al instante y persiste en segundo plano
function guardarDatos(datos) {
    DATOS = datos;
    const copia = JSON.stringify(datos, null, 2);

    colaGuardado = colaGuardado.then(async () => {
        try {
            if (USA_UPSTASH) {
                await upstash(['SET', CLAVE_REDIS, copia]);
            } else {
                fs.writeFileSync(DATOS_FILE, copia);
            }
        } catch (e) {
            console.error('[guardarDatos] NO se pudo guardar:', e.message);
        }
    });

    return true;
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

client.on('error', (e) => console.error('[client error]', e));

// Enviar mensaje a un canal (con fallback por si no está en caché)
async function enviarACanal(canalId, mensaje) {
    const canal = await client.channels.fetch(canalId);
    if (!canal) throw new Error('Canal no encontrado');
    await canal.send(mensaje);
}

let iniciado = false;

function iniciarBot() {
    if (iniciado) return;
    iniciado = true;

    console.log(`¡CONECTADO CON ÉXITO! Bot logueado como: ${client.user.tag}`);
    console.log(`Archivo de datos: ${DATOS_FILE}`);

    // ============ AVISOS DE ROBOS CADA 7 DÍAS A LAS 20:00 ============
    let ultimoAviso = null;

    setInterval(async () => {
        try {
            const ahora = ahoraMadrid();
            const hoy = hoyStr();

            const esHora = ahora.getHours() === HORA_AVISO &&
                ahora.getMinutes() === MINUTO_AVISO;

            if (!esHora || ultimoAviso === hoy) return;
            ultimoAviso = hoy;

            const datos = cargarDatos();
            const porCanal = {};
            let cambios = false;

            for (const misRobos of Object.values(datos.usuarios)) {
                for (const [nombre, r] of Object.entries(misRobos)) {
                    if (!esRobo(nombre) || !r.activa || !r.canal) continue;
                    if (diasEntre(r.ultima, hoy) < ROBOS[nombre]) continue;

                    (porCanal[r.canal] = porCanal[r.canal] || new Set()).add(nombre);

                    r.activa = false;
                    cambios = true;
                }
            }

            if (cambios) guardarDatos(datos);

            for (const [canalId, nombres] of Object.entries(porCanal)) {
                for (const nombre of Object.keys(ROBOS).filter(n => nombres.has(n))) {
                    try {
                        await enviarACanal(canalId, {
                            content: `Hoy tienes que hacer el ${nombre} @everyone`,
                            allowedMentions: { parse: ['everyone'] }
                        });
                    } catch (e) {
                        console.error(`No pude avisar en el canal ${canalId}:`, e.message);
                    }

                    await esperar(1000);
                }
            }
        } catch (e) {
            console.error('[intervalo robos] Error:', e);
        }
    }, 20000);

    // ============ AVISO DE TEMPORIZADORES ============
    // Mercachifle y Bigtoni: etiqueta al usuario
    // Weedrun: etiqueta a @everyone
    setInterval(async () => {
        try {
            const datos = cargarDatos();
            const ahora = Date.now();
            const pendientes = [];

            for (const [userId, misRobos] of Object.entries(datos.usuarios)) {
                for (const nombre of Object.keys(TEMPORIZADORES)) {
                    const r = misRobos[nombre];

                    if (!r || !r.activa || !r.proximo || !r.canal) continue;
                    if (ahora < r.proximo) continue;

                    r.activa = false;

                    pendientes.push({
                        userId,
                        nombre,
                        canalId: r.canal
                    });
                }
            }

            if (pendientes.length === 0) return;

            guardarDatos(datos);

            for (const { userId, nombre, canalId } of pendientes) {
                try {
                    if (nombre === 'weedrun') {
                        await enviarACanal(canalId, {
                            content: 'Ya puedes hacer el weedrun @everyone',
                            allowedMentions: { parse: ['everyone'] }
                        });
                    } else {
                        await enviarACanal(canalId, {
                            content: `<@${userId}> Ya puedes hacer el ${nombre}`,
                            allowedMentions: { users: [userId] }
                        });
                    }
                    console.log(`[aviso] ${nombre} enviado a ${userId}`);
                } catch (e) {
                    console.error(`No pude avisar del ${nombre} en el canal ${canalId}:`, e.message);
                }

                await esperar(1000);
            }
        } catch (e) {
            console.error('[intervalo temporizadores] Error:', e);
        }
    }, 10000);

    // ============ AVISOS DE COSECHA Y DUPLICADOS ============
    // Los avisos normales etiquetan al usuario que tiró el comando
    // El último aviso de la cosecha etiqueta a everyone
    setInterval(async () => {
        try {
            const datos = cargarDatos();
            const ahora = Date.now();
            const pendientes = [];

            for (const [userId, misRobos] of Object.entries(datos.usuarios)) {
                for (const [nombre, conf] of Object.entries(RECORDATORIOS)) {
                    const r = misRobos[nombre];

                    if (!r || !r.activa || !r.proximo || !r.canal) continue;
                    if (ahora < r.proximo) continue;

                    r.enviados = (r.enviados || 0) + 1;
                    const esUltimo = r.enviados >= conf.veces;

                    if (esUltimo) {
                        r.activa = false;
                    } else {
                        // Si el bot estuvo apagado, no mandar todos los avisos atrasados de golpe
                        r.proximo = Math.max(r.proximo + conf.cadaMs, ahora + 60000);
                    }

                    pendientes.push({ userId, nombre, canalId: r.canal, n: r.enviados, esUltimo });
                }
            }

            if (pendientes.length === 0) return;

            guardarDatos(datos);

            for (const { userId, nombre, canalId, n, esUltimo } of pendientes) {
                const conf = RECORDATORIOS[nombre];
                const horas = (n * conf.cadaMs) / 3600000;

                let mensaje;
                if (esUltimo && conf.everyoneAlFinal) {
                    mensaje = {
                        content: `@everyone Último aviso ${conf.de} (${n}/${conf.veces}, han pasado ${horas}h)`,
                        allowedMentions: { parse: ['everyone'] }
                    };
                } else if (conf.veces > 1) {
                    mensaje = {
                        content: `<@${userId}> Aviso ${n}/${conf.veces} ${conf.de} (han pasado ${horas}h)`,
                        allowedMentions: { users: [userId] }
                    };
                } else {
                    mensaje = {
                        content: `<@${userId}> Han pasado ${horas} horas ${conf.de}`,
                        allowedMentions: { users: [userId] }
                    };
                }

                try {
                    await enviarACanal(canalId, mensaje);
                    console.log(`[aviso] ${nombre} enviado a ${userId}`);
                } catch (e) {
                    console.error(`No pude avisar ${conf.de} en el canal ${canalId}:`, e.message);
                }

                await esperar(1000);
            }
        } catch (e) {
            console.error('[intervalo recordatorios] Error:', e);
        }
    }, 10000);
}

// Compatible con discord.js v14 ('ready') y v14.17+/v15 ('clientReady')
client.once('clientReady', iniciarBot);
client.once('ready', iniciarBot);

// ================== COMANDOS ==================
client.on('messageCreate', (message) => {

    // Evita que el bot responda a sí mismo o a otros bots
    if (message.author.bot) return;

    const texto = message.content.trim();
    const tieneBang = texto.startsWith('!');
    const cmd = (tieneBang ? texto.slice(1) : texto).trim().toLowerCase();

    // ================== COMANDOS DE ROBOS ==================
    if (tieneBang) {
        const userId = message.author.id;

        // !COMANDOS
        if (cmd === 'comandos') {
            return message.reply(`
**📋 COMANDOS DE ROBOS**
    
\`!gun\` - Gun Store
\`!mecanico\` - Robo al mecanico del norte
\`!pawnshop\` - Pawnshop
\`!subteraneo\` - Subteraneo
\`!ayawaska\` - Ayawaska
\`!yate\` - Yate
\`!portaaviones\` - Portaaviones
\`!obreros\` - Obreros
\`!mercachifle\` - mercachifle
\`!bigtoni\` - bigtoni
\`!weedrun\` - weedrun

**🌱 AVISOS APARTE**
\`!cosecha\` - Avisa cada 2h 4 veces
\`!duplicado\` - Para el duplicado normal
\`!duplicado2h\` - Para el duplicado de 2 horas

**📊 OTROS COMANDOS**
\`!robos\` - Muestra el estado de todos tus robos y sus cooldowns.
\`!clear nombre\` - Cancela el temporizador de un robo.

            `);
        }

        // !ROBOS
        if (cmd === 'robos') {
            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};
            const hoy = hoyStr();

            const lineas = Object.keys(ROBOS).map(nombre => {
                const r = misRobos[nombre];
                const hora = r && r.tirado
                    ? ` | tirado ${formatearHora(r.tirado)}`
                    : '';

                if (!r || !r.activa) {
                    return `✅ ${nombre}: Disponible${hora}`;
                }

                const d = diasEntre(r.ultima, hoy);

                if (d >= ROBOS[nombre]) {
                    return `✅ ${nombre}: Disponible${hora}`;
                }

                const faltan = ROBOS[nombre] - d;

                return `❌ ${nombre}: CD ${faltan} ${faltan === 1 ? 'día' : 'días'}${hora}`;
            });

            // Temporizadores de horas
            for (const [nombre, dur] of Object.entries(TEMPORIZADORES)) {
                const t = misRobos[nombre];

                const horaT = t && t.proximo
                    ? ` | tirado ${formatearHora(t.proximo - dur)}`
                    : '';

                if (!t || !t.activa || !t.proximo || Date.now() >= t.proximo) {
                    lineas.push(`✅ ${nombre}: Disponible${horaT}`);
                } else {
                    lineas.push(`❌ ${nombre}: CD ${formatearTiempo(t.proximo - Date.now())}${horaT}`);
                }
            }

            return message.reply(lineas.join('\n'));
        }

        // !CLEAR NOMBRE
        if (cmd.startsWith('clear ')) {
            const nombre = nombreReal(cmd.slice(6).trim().replace(/^!/, ''));

            const todos = [
                ...Object.keys(ROBOS),
                ...Object.keys(TEMPORIZADORES),
                ...Object.keys(RECORDATORIOS)
            ];

            if (!todos.includes(nombre)) {
                return message.reply(`Ese robo no existe. Usa: ${todos.join(', ')}`);
            }

            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};

            if (!misRobos[nombre] || !misRobos[nombre].activa) {
                return message.reply(`${nombre} ya estaba parado`);
            }

            misRobos[nombre].activa = false;
            datos.usuarios[userId] = misRobos;

            guardarDatos(datos);

            return message.reply(
                `El temporizador de !${nombre} se ha eliminado, tíralo de nuevo para que funcione`
            );
        }

        // !COSECHA (también !cosechado), !DUPLICADO, !DUPLICADO2H
        const nombreRec = nombreReal(cmd);
        if (esRecordatorio(nombreRec)) {
            const conf = RECORDATORIOS[nombreRec];
            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};
            const yaActivo = misRobos[nombreRec] && misRobos[nombreRec].activa;

            misRobos[nombreRec] = {
                proximo: Date.now() + conf.cadaMs,
                enviados: 0,
                activa: true,
                canal: message.channel.id
            };

            datos.usuarios[userId] = misRobos;
            const ok = guardarDatos(datos);

            if (!ok) {
                return message.reply('⚠️ No he podido guardar el temporizador (error de disco). Avisa al admin del bot.');
            }

            return message.reply(`${yaActivo ? 'Reinicio el contador. ' : ''}${conf.inicio}`);
        }

        // !MERCACHIFLE, !BIGTONI, !WEEDRUN
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
            const ok = guardarDatos(datos);

            if (!ok) {
                return message.reply('⚠️ No he podido guardar el temporizador (error de disco). Avisa al admin del bot.');
            }

            return message.reply(yaActivo
                ? `Hecho ✅ ${cmd}. Reinicio el contador, te aviso en ${horas} horas exactas`
                : `En ${horas} horas exactas te aviso para el ${cmd}. Cuando lo vuelvas a hacer tira !${cmd} otra vez para reiniciar el contador.`);
        }

        // !GUN, !MECANICO, !YATE, ETC.
        if (esRobo(cmd)) {
            const datos = cargarDatos();
            const misRobos = datos.usuarios[userId] || {};

            const yaActivo = misRobos[cmd] && misRobos[cmd].activa;

            misRobos[cmd] = {
                ultima: hoyStr(),
                tirado: Date.now(),
                activa: true,
                canal: message.channel.id
            };

            datos.usuarios[userId] = misRobos;
            const ok = guardarDatos(datos);

            if (!ok) {
                return message.reply('⚠️ No he podido guardar el temporizador (error de disco). Avisa al admin del bot.');
            }

            return message.reply(yaActivo
                ? `Hecho ✅ ${cmd}. Reinicio el contador, te aviso en ${ROBOS[cmd]} días`
                : `En ${ROBOS[cmd]} días te aviso para el ${cmd}. Cuando lo vuelvas a hacer tira !${cmd} otra vez, o !clear ${cmd} para cancelar.`);
        }
    }

    // ================== PRUEBADOWN ==================
    if (cmd === 'pruebadown') {
        message.reply('Prueba iniciada, te aviso en 30 segundos...');

        setTimeout(() => {
            message.channel.send({
                content: '¡La prueba de 30 segundos ha terminado!',
                allowedMentions: { parse: ['everyone'] }
            });
        }, 30000);
    }

    // ================== RESUMENDOWN ==================
    if (cmd === 'resumendown') {
        message.reply('En 1 hora te aviso, si no estas te violo');

        setTimeout(() => {
            message.channel.send(`<@${message.author.id}> Rota el resumen nigga`);
        }, 3600000);
    }

    // ================== POSTULAR ==================
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

    // ================== POSTULE ==================
    if (cmd === 'postule') {
        message.reply(`🔴Gracias por postular los resultados se darán los próximos días por el canal de ⁠📢┃𝐀𝐧𝐮𝐧𝐜𝐢𝐨s 🔴`);
    }
});

// ================== INICIO ==================
(async () => {
    await cargarInicial();
    await client.login(process.env.DISCORD_TOKEN || process.env.TOKEN);
})();
