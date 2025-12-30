require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const express = require('express');
const { createClient } = require('@supabase/supabase-js');

// ===========================================
// CONFIGURATION
// ===========================================

const BOT_TOKEN = process.env.BOT_TOKEN;
if (!BOT_TOKEN) {
  console.error('❌ Missing BOT_TOKEN environment variable. Set BOT_TOKEN and restart the service.');
  process.exit(1);
}
const PORT = process.env.PORT || 3000;
const WEBHOOK_URL = process.env.WEBHOOK_URL;
const COMMAND_GATEWAY_URL = process.env.COMMAND_GATEWAY_URL || 'http://localhost:3300';
const LLM_GATEWAY_URL = process.env.LLM_GATEWAY_URL || 'http://localhost:3200';
const LLM_GATEWAY_API_KEY = process.env.LLM_GATEWAY_API_KEY || '';
const NOVA_API_URL = process.env.NOVA_API_URL || '';
const NOVA_API_KEY = process.env.NOVA_API_KEY || '';
const NOVA_DEFAULT_PROVIDER = process.env.NOVA_DEFAULT_PROVIDER || 'nova';

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_KEY;

const supabase = SUPABASE_KEY ? createClient(SUPABASE_URL, SUPABASE_KEY) : null;

// ===========================================
// BRANDING
// ===========================================

const BRAND = {
  name: 'STAYArta Unified Bot',
  company: 'STAYArta',
  tagline: 'Hack the Ordinary',
  user: 'carlos',
  system: 'macOS',
  version: '2.0.0',
  features: [
    '✨ Nova AI Integration',
    '📋 Task Management',
    '🚀 Deployment Control',
    '📦 Order Tracking',
    '🔑 License Validation',
    '📊 Analytics & Stats',
    '⚙️ Automation Hub',
    '💬 Content Creation'
  ]
};

// ===========================================
// EXPRESS SERVER
// ===========================================

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>${BRAND.name}</title>
      <style>
        body { font-family: 'SF Pro Display', -apple-system, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        h1 { color: #2c3e50; }
        .status { color: #27ae60; font-weight: bold; }
        .feature { margin: 5px 0; }
        a { color: #3498db; text-decoration: none; }
        .badge { background: #3498db; color: white; padding: 2px 8px; border-radius: 3px; font-size: 12px; }
      </style>
    </head>
    <body>
      <h1>🤖 ${BRAND.name}</h1>
      <h2>by ${BRAND.company}</h2>
      <p><span class="badge">v${BRAND.version}</span> <span class="status">✅ Online</span></p>

      <h3>⭐ Features:</h3>
      ${BRAND.features.map(f => `<div class="feature">${f}</div>`).join('')}

      <h3>ℹ️ Info:</h3>
      <p><strong>User:</strong> ${BRAND.user}</p>
      <p><strong>System:</strong> ${BRAND.system}</p>
      <p><strong>Tagline:</strong> ${BRAND.tagline}</p>

      <h3>🔗 Links:</h3>
      <p><a href="/health">Health Check</a></p>
      <p><a href="/stats">Statistics</a></p>

      <p style="margin-top: 30px; color: #7f8c8d; font-size: 12px;">
        🍎 Deployed from ${BRAND.system} by ${BRAND.user}
      </p>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    bot: BRAND.name,
    version: BRAND.version,
    company: BRAND.company,
    user: BRAND.user,
    system: BRAND.system,
    uptime: Math.floor(process.uptime()),
    webhook_configured: !!WEBHOOK_URL,
    supabase_connected: !!supabase,
    timestamp: new Date().toISOString()
  });
});

app.get('/stats', async (req, res) => {
  let stats = {
    bot: BRAND.name,
    version: BRAND.version,
    uptime_seconds: Math.floor(process.uptime()),
    users: 0,
    messages: 0,
    commands_executed: 0
  };

  if (supabase) {
    try {
      const { count: userCount } = await supabase.from('telegram_users').select('*', { count: 'exact', head: true });
      const { count: msgCount } = await supabase.from('telegram_messages').select('*', { count: 'exact', head: true });
      stats.users = userCount || 0;
      stats.messages = msgCount || 0;
    } catch (error) {
      stats.error = 'Could not fetch stats from database';
    }
  }

  res.json(stats);
});

app.post('/webhook', (req, res) => {
  bot.handleUpdate(req.body);
  res.sendStatus(200);
});

// ===========================================
// TELEGRAM BOT
// ===========================================

const bot = new Telegraf(BOT_TOKEN);

// ===========================================
// MENUS & KEYBOARDS
// ===========================================

const mainMenu = Markup.keyboard([
  ['📋 Tasks', '📦 Orders', '🚀 Deploy'],
  ['🤖 Nova AI', '🔑 License', '📊 Stats'],
  ['⚙️ Automation', '💻 Terminal', '📱 Dashboard'],
  ['🧩 MiniApps', '🛠️ Tools', '🏢 Command Center'],
  ['📸 Content', '📞 Contacto', '💰 Precios'],
  ['❓ Help', '⚡ Status']
]).resize().persistent();

const contentMenu = Markup.keyboard([
  ['📸 Foto', '💬 Texto', '🔗 Botón'],
  ['👁️ Preview', '✅ Enviar'],
  ['🔙 Back']
]).resize();

// ===========================================
// HELPER FUNCTIONS
// ===========================================

async function logMessage(ctx, direction = 'incoming') {
  if (!supabase) return;

  try {
    // Get or create user
    let telegramUser = null;
    const { data: existingUser } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', ctx.from.id)
      .single();

    if (existingUser) {
      telegramUser = existingUser;
      const isCommand = !!(ctx.message.text && ctx.message.text.startsWith('/'));
      await supabase
        .from('telegram_users')
        .update({
          last_seen_at: new Date().toISOString(),
          message_count: (existingUser.message_count || 0) + 1,
          command_count: (existingUser.command_count || 0) + (isCommand ? 1 : 0),
          last_command: isCommand ? ctx.message.text.split(' ')[0] : existingUser.last_command
        })
        .eq('id', existingUser.id);
    } else {
      const { data: newUser } = await supabase
        .from('telegram_users')
        .insert({
          telegram_id: ctx.from.id,
          username: ctx.from.username,
          first_name: ctx.from.first_name,
          last_name: ctx.from.last_name,
          language_code: ctx.from.language_code,
          message_count: 1,
          command_count: ctx.message.text?.startsWith('/') ? 1 : 0,
          last_command: ctx.message.text?.startsWith('/') ? ctx.message.text.split(' ')[0] : null,
          last_seen_at: new Date().toISOString()
        })
        .select()
        .single();
      telegramUser = newUser;
    }

    // Log message
    if (telegramUser) {
      const isCommand = !!(ctx.message.text && ctx.message.text.startsWith('/'));
      await supabase.from('telegram_messages').insert({
        user_id: telegramUser.id,
        telegram_user_id: ctx.from.id,
        chat_id: ctx.chat.id,
        message_id: ctx.message.message_id,
        message_text: ctx.message.text,
        message_type: isCommand ? 'command' : 'text',
        command: isCommand ? ctx.message.text.split(' ')[0] : null,
        command_args: isCommand ? ctx.message.text.split(' ').slice(1) : null,
        is_command: isCommand,
        metadata: {
          chat_type: ctx.chat.type,
          date: ctx.message.date,
          direction
        }
      });
    }
  } catch (error) {
    console.error('Error logging message:', error.message);
  }
}

async function callCommandGateway(endpoint, data = {}) {
  try {
    const response = await fetch(`${COMMAND_GATEWAY_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer stayarta_command_bot`
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error(`Gateway error (${endpoint}):`, error.message);
    throw error;
  }
}

async function callLLMGateway(message, model = 'ollama/llama3.1:8b') {
  try {
    const response = await fetch(`${LLM_GATEWAY_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(LLM_GATEWAY_API_KEY ? { 'X-API-Key': LLM_GATEWAY_API_KEY } : {})
      },
      body: JSON.stringify({
        provider: model.split('/')[0],
        model: model.split('/')[1] || model,
        messages: [{ role: 'user', content: message }],
        stream: false
      })
    });

    if (!response.ok) {
      throw new Error(`LLM Gateway returned ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || data.response || 'No response';
  } catch (error) {
    console.error('LLM Gateway error:', error.message);
    throw error;
  }
}

async function callNovaAPI(prompt, confirmed = false) {
  if (!NOVA_API_URL) {
    throw new Error('Nova API not configured');
  }
  const headers = { 'Content-Type': 'application/json' };
  if (NOVA_API_KEY) headers['x-api-key'] = NOVA_API_KEY;
  const response = await fetch(NOVA_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({ prompt, provider: NOVA_DEFAULT_PROVIDER, confirmed })
  });
  if (!response.ok) {
    throw new Error(`Nova API error ${response.status}`);
  }
  const data = await response.json();
  return data?.data || data;
}

const pendingConfirmations = new Map();

// ===========================================
// COMMAND HANDLERS
// ===========================================

// /start - Welcome message
bot.start(async (ctx) => {
  await logMessage(ctx);

  const welcome = `🤖 *${BRAND.name}*\n\n` +
    `🏢 *${BRAND.company}*\n` +
    `⭐ ${BRAND.tagline}\n\n` +
    `✨ *Version ${BRAND.version}*\n\n` +
    `🎯 *Unified Features:*\n` +
    BRAND.features.join('\n') + '\n\n' +
    `📱 *Platform Info:*\n` +
    `👤 User: ${BRAND.user}\n` +
    `🍎 System: ${BRAND.system}\n` +
    `🌐 Deployed: Railway\n` +
    `⚡ Status: Online 24/7\n\n` +
    `Use the menu below or type /help for commands:`;

  await ctx.reply(welcome, { parse_mode: 'Markdown', ...mainMenu });
});

// /help - Help system
bot.command('help', async (ctx) => {
  await logMessage(ctx);

  const help = `📚 *${BRAND.name} - Help*\n\n` +
    `*Project Management:*\n` +
    `/tasks - View TaskBoard status\n` +
    `/projects - List all projects\n` +
    `/orders - Track orders\n` +
    `/deploy - Deployment info\n\n` +
    `*AI & Intelligence:*\n` +
    `/nova <message> - Chat with Nova AI\n` +
    `/confirm - Confirm action\n` +
    `/cancel - Cancel action\n` +
    `/models - Available LLM models\n` +
    `/history - Conversation history\n\n` +
    `*Licenses:*\n` +
    `/license <key> - Validate STL-Key\n` +
    `/mylicenses - View your licenses\n\n` +
    `/validar <clave> - Validar licencia\n` +
    `/licencias - Gestión de licencias\n\n` +
    `*Información:*\n` +
    `/servicios - Servicios STAYArta\n` +
    `/precios - Tabla de precios\n` +
    `/contacto - Contacto oficial\n` +
    `/registrar <email> - Vincular email\n\n` +
    `*Command Center:*\n` +
    `/automation - Automation Hub status\n` +
    `/dashboard - Dashboard resources\n` +
    `/commandcenter - Command Center resources\n` +
    `/terminal - SSH access info\n` +
    `/miniapps - MiniApps inventory\n` +
    `/tools - AI tools available\n\n` +
    `*Content:*\n` +
    `/content - Content creation menu\n` +
    `/photo - Send photo\n` +
    `/text - Send text\n\n` +
    `*System:*\n` +
    `/status - Bot status\n` +
    `/stats - Usage statistics\n` +
    `/menu - Show main menu\n` +
    `/ping - Ping services\n\n` +
    `Use buttons below for quick access!`;

  await ctx.reply(help, { parse_mode: 'Markdown', ...mainMenu });
});

// /status - Bot status
bot.command('status', async (ctx) => {
  await logMessage(ctx);

  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  const status = `📊 *${BRAND.name} Status*\n\n` +
    `✅ *Online and Running*\n\n` +
    `🏢 Company: ${BRAND.company}\n` +
    `👤 User: ${BRAND.user}\n` +
    `🍎 System: ${BRAND.system}\n` +
    `📦 Version: ${BRAND.version}\n\n` +
    `⏰ Uptime: ${hours}h ${minutes}m\n` +
    `🌐 Webhook: ${WEBHOOK_URL ? '✅ Configured' : '⚠️ Polling mode'}\n` +
    `💾 Database: ${supabase ? '✅ Connected' : '⚠️ Disconnected'}\n` +
    `🔗 Command Gateway: ${COMMAND_GATEWAY_URL}\n` +
    `🤖 LLM Gateway: ${LLM_GATEWAY_URL}\n\n` +
    `🚀 Ready for automation!`;

  await ctx.reply(status, { parse_mode: 'Markdown', ...mainMenu });
});

// /menu - Show main menu
bot.command('menu', async (ctx) => {
  await logMessage(ctx);
  await ctx.reply('📱 Main Menu:', mainMenu);
});

// /tasks - TaskBoard status
bot.command('tasks', async (ctx) => {
  await logMessage(ctx);

  try {
    await ctx.reply('🔄 Fetching tasks...', Markup.removeKeyboard());

    const response = await callCommandGateway('/commands/tasks/status');
    const statuses = Object.entries(response.data || {});

    if (statuses.length === 0) {
      await ctx.reply('📋 No tasks found.', mainMenu);
      return;
    }

    const formatted = statuses
      .map(([column, items]) => `• ${column}: *${items.length}*`)
      .join('\n');

    await ctx.reply(`📋 *TaskBoard Status*\n\n${formatted}`, {
      parse_mode: 'Markdown',
      ...mainMenu
    });
  } catch (error) {
    await ctx.reply(`❌ Error fetching tasks: ${error.message}`, mainMenu);
  }
});

// /orders - Order tracking
bot.command('orders', async (ctx) => {
  await logMessage(ctx);

  try {
    await ctx.reply('🔄 Fetching orders...', Markup.removeKeyboard());

    const args = ctx.message.text.split(' ').slice(1);
    const status = args[0] || null;

    const response = await callCommandGateway('/commands/orders/list', status ? { status } : {});

    const message = `📦 *Orders*\n\n` +
      `Total: *${response.count || 0}*\n` +
      (status ? `Status: ${status}\n` : '') +
      `\nUse: /orders <status> to filter`;

    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
  } catch (error) {
    await ctx.reply(`❌ Error fetching orders: ${error.message}`, mainMenu);
  }
});

// /deploy - Deployment info
bot.command('deploy', async (ctx) => {
  await logMessage(ctx);

  try {
    const args = ctx.message.text.split(' ').slice(1);
    const phase = args[0] || null;

    const response = await callCommandGateway('/commands/deploy', phase ? { phase } : {});
    const actions = (response.actions || []).map(a => `• ${a}`).join('\n');

    const message = `🚀 *Deployment: ${response.phase || 'All Phases'}*\n\n${actions}`;

    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
  } catch (error) {
    await ctx.reply(`❌ Error: ${error.message}`, mainMenu);
  }
});

// /nova - Chat with Nova AI
bot.command('nova', async (ctx) => {
  await logMessage(ctx);

  const args = ctx.message.text.split(' ').slice(1).join(' ');

  if (!args) {
    await ctx.reply(
      '🤖 *Nova AI Assistant*\n\n' +
      'Usage: `/nova <your message>`\n\n' +
      'Example: `/nova explain quantum computing`',
      { parse_mode: 'Markdown', ...mainMenu }
    );
    return;
  }

  try {
    await ctx.reply('🤖 Nova is thinking...', Markup.removeKeyboard());
    if (NOVA_API_URL) {
      const result = await callNovaAPI(args, false);
      if (result?.meta?.requiresConfirmation) {
        pendingConfirmations.set(ctx.chat.id, { prompt: args });
        await ctx.reply(
          `Necesito confirmación antes de ejecutar: ${result.meta.reasons?.join(', ') || 'acción sensible'}.\nResponde /confirm o /cancel.`,
          mainMenu
        );
        return;
      }
      await ctx.reply(`🤖 *Nova AI:*\n\n${result.response || 'Listo.'}`, { parse_mode: 'Markdown', ...mainMenu });
      return;
    }
    const response = await callLLMGateway(args);
    await ctx.reply(`🤖 *Nova AI:*\n\n${response}`, { parse_mode: 'Markdown', ...mainMenu });
  } catch (error) {
    await ctx.reply(`❌ Nova error: ${error.message}`, mainMenu);
  }
});

// /confirm - Confirm sensitive action
bot.command('confirm', async (ctx) => {
  const pending = pendingConfirmations.get(ctx.chat.id);
  if (!pending) {
    return ctx.reply('No hay acciones pendientes para confirmar.', mainMenu);
  }
  pendingConfirmations.delete(ctx.chat.id);
  try {
    const result = await callNovaAPI(pending.prompt, true);
    return ctx.reply(result.response || 'Confirmación recibida. ¿Siguiente paso?', mainMenu);
  } catch (error) {
    return ctx.reply(`❌ Error confirmando: ${error.message}`, mainMenu);
  }
});

// /cancel - Cancel sensitive action
bot.command('cancel', async (ctx) => {
  pendingConfirmations.delete(ctx.chat.id);
  return ctx.reply('Acción cancelada.', mainMenu);
});

// /license - Validate STL-Key
async function handleLicense(ctx, stlKeyOverride) {
  await logMessage(ctx);

  const stlKey = stlKeyOverride || ctx.message.text.split(' ').slice(1)[0];

  if (!stlKey) {
    await ctx.reply(
      '🔑 *STL-Key Validator*\n\n' +
      'Usage: `/license <STL-KEY>`\n\n' +
      'Example: `/license STL-A3F2-8B1C-D4E5-9F7A`',
      { parse_mode: 'Markdown', ...mainMenu }
    );
    return;
  }

  if (!supabase) {
    await ctx.reply('❌ Database not connected. Cannot validate license.', mainMenu);
    return;
  }

  try {
    await ctx.reply('🔄 Validating license...', Markup.removeKeyboard());

    const { data, error } = await supabase.rpc('validate_stl_key', {
      p_stl_key: stlKey,
      p_domain: null
    });

    if (error) throw error;

    const result = Array.isArray(data) ? data[0] : data;

    if (result.valid) {
      const features = Object.entries(result.features || {})
        .filter(([_, v]) => v)
        .map(([k]) => `• ${k.replace(/_/g, ' ')}`)
        .join('\n');

      const message = `✅ *License Valid!*\n\n` +
        `🔑 Key: \`${stlKey}\`\n` +
        `📦 Plan: *${result.plan}*\n` +
        `⏰ Expires: ${result.expires_at ? new Date(result.expires_at).toLocaleDateString() : 'Never'}\n\n` +
        `🎯 *Features:*\n${features || 'Standard features'}`;

      await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
    } else {
      await ctx.reply(
        `❌ *License Invalid*\n\n` +
        `🔑 Key: \`${stlKey}\`\n` +
        `⚠️ Reason: ${result.message}`,
        { parse_mode: 'Markdown', ...mainMenu }
      );
    }
  } catch (error) {
    await ctx.reply(`❌ Validation error: ${error.message}`, mainMenu);
  }
}

bot.command('license', handleLicense);

// /validar - alias for /license
bot.command('validar', async (ctx) => {
  const key = ctx.message.text.split(' ').slice(1)[0];
  return handleLicense(ctx, key);
});

bot.command('ayuda', async (ctx) => {
  ctx.message.text = '/help';
  return bot.handleUpdate(ctx.update);
});

// /licencias - License help
bot.command('licencias', async (ctx) => {
  await logMessage(ctx);
  const message = `🔑 *Licencias STAYArta*\n\n` +
    `• Usa /license <STL-KEY> para validar\n` +
    `• Usa /validar <clave> como alias\n` +
    `• Usa /mylicenses para ver tus licencias vinculadas\n`;
  await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
});

// /mylicenses - Attempt to show linked licenses
bot.command('mylicenses', async (ctx) => {
  await logMessage(ctx);
  if (!supabase) {
    return ctx.reply('⚠️ Base de datos no configurada.', mainMenu);
  }
  try {
    const { data, error } = await supabase
      .from('license_validations')
      .select('stl_key, result, validated_at, metadata')
      .eq('metadata->>telegram_id', String(ctx.from.id))
      .order('validated_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    if (!data || data.length === 0) {
      return ctx.reply('No hay licencias vinculadas a tu usuario. Usa /license <STL-KEY> para validar.', mainMenu);
    }
    const lines = data.map((row) => `• ${row.stl_key} — ${row.result} (${new Date(row.validated_at).toLocaleDateString()})`);
    await ctx.reply(`🔑 *Tus últimas validaciones*\n\n${lines.join('\n')}`, { parse_mode: 'Markdown', ...mainMenu });
  } catch (error) {
    await ctx.reply(`❌ Error consultando licencias: ${error.message}`, mainMenu);
  }
});

// /servicios - Services info
bot.command('servicios', async (ctx) => {
  await logMessage(ctx);
  const message = `🧩 *Servicios STAYArta*\n\n` +
    `• NOVA IA & Automatización\n` +
    `• Command Center\n` +
    `• MiniApps & Integraciones\n` +
    `• E‑commerce & Growth\n\n` +
    `Más info: https://stayarta.com`;
  await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
});

// /precios - Pricing info
bot.command('precios', async (ctx) => {
  await logMessage(ctx);
  const message = `💰 *Precios STAYArta*\n\n` +
    `Consulta planes y opciones actualizadas en:\n` +
    `https://stayarta.com`;
  await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
});

// /contacto - Contact info
bot.command('contacto', async (ctx) => {
  await logMessage(ctx);
  const email = process.env.STAYARTA_CONTACT_EMAIL || 'hola@stayarta.com';
  const phone = process.env.STAYARTA_CONTACT_PHONE || '+34 662 652 300';
  const message = `📞 *Contacto STAYArta*\n\n` +
    `Email: ${email}\n` +
    `Tel: ${phone}\n` +
    `Web: https://stayarta.com`;
  await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
});

// /registrar - Link email to telegram user
bot.command('registrar', async (ctx) => {
  await logMessage(ctx);
  const args = ctx.message.text.split(' ').slice(1);
  const email = args[0];
  if (!email) {
    return ctx.reply('Uso: /registrar correo@dominio.com', mainMenu);
  }
  if (!supabase) {
    return ctx.reply('⚠️ Base de datos no configurada.', mainMenu);
  }
  try {
    const { data: existingUser } = await supabase
      .from('telegram_users')
      .select('*')
      .eq('telegram_id', ctx.from.id)
      .single();
    if (existingUser) {
      await supabase
        .from('telegram_users')
        .update({ metadata: { ...(existingUser.metadata || {}), email } })
        .eq('id', existingUser.id);
    }
    await ctx.reply(`✅ Email registrado: ${email}`, mainMenu);
  } catch (error) {
    await ctx.reply(`❌ Error registrando email: ${error.message}`, mainMenu);
  }
});

// /stats - Statistics
bot.command('stats', async (ctx) => {
  await logMessage(ctx);

  const uptime = Math.floor(process.uptime());
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);

  let stats = `📊 *Bot Statistics*\n\n` +
    `🤖 Bot: ${BRAND.name}\n` +
    `👤 Your name: ${ctx.from.first_name}\n` +
    `🆔 Your ID: \`${ctx.from.id}\`\n` +
    `⏰ Uptime: ${hours}h ${minutes}m\n` +
    `🍎 System: ${BRAND.system}\n` +
    `🕐 ${new Date().toLocaleString('es-ES', { timeZone: 'Europe/Madrid' })}\n\n`;

  if (supabase) {
    try {
      const { count: userCount } = await supabase.from('telegram_users').select('*', { count: 'exact', head: true });
      const { count: msgCount } = await supabase.from('telegram_messages').select('*', { count: 'exact', head: true });

      stats += `📈 *Global Stats:*\n` +
        `👥 Total users: ${userCount || 0}\n` +
        `💬 Total messages: ${msgCount || 0}\n`;
    } catch (error) {
      stats += `⚠️ Could not fetch database stats\n`;
    }
  }

  stats += `\n🏢 ${BRAND.company}`;

  await ctx.reply(stats, { parse_mode: 'Markdown', ...mainMenu });
});

// /ping - Ping services
bot.command('ping', async (ctx) => {
  await logMessage(ctx);

  let status = '🏓 *Ping Services*\n\n';

  // Ping Command Gateway
  try {
    const start = Date.now();
    await callCommandGateway('/health');
    const latency = Date.now() - start;
    status += `✅ Command Gateway: ${latency}ms\n`;
  } catch (error) {
    status += `❌ Command Gateway: Offline\n`;
  }

  // Ping LLM Gateway
  try {
    const start = Date.now();
    await fetch(`${LLM_GATEWAY_URL}/health`);
    const latency = Date.now() - start;
    status += `✅ LLM Gateway: ${latency}ms\n`;
  } catch (error) {
    status += `❌ LLM Gateway: Offline\n`;
  }

  // Ping Database
  if (supabase) {
    try {
      const start = Date.now();
      await supabase.from('telegram_users').select('count', { count: 'exact', head: true });
      const latency = Date.now() - start;
      status += `✅ Database: ${latency}ms\n`;
    } catch (error) {
      status += `❌ Database: Error\n`;
    }
  } else {
    status += `⚠️ Database: Not configured\n`;
  }

  await ctx.reply(status, { parse_mode: 'Markdown', ...mainMenu });
});

// /commandcenter, /dashboard, /miniapps, /tools, /terminal
async function handleResourceCommand(ctx, key) {
  await logMessage(ctx);
  try {
    const response = await callCommandGateway(`/commands/${key}`);
    const payload = response.data || response;
    const message = typeof payload === 'string'
      ? payload
      : (payload.url ? `${key}: ${payload.url}` : JSON.stringify(payload, null, 2));
    await ctx.reply(message, { parse_mode: 'Markdown', ...mainMenu });
  } catch (error) {
    await ctx.reply(`❌ Error: ${error.message}`, mainMenu);
  }
}

bot.command('commandcenter', (ctx) => handleResourceCommand(ctx, 'commandcenter'));
bot.command('dashboard', (ctx) => handleResourceCommand(ctx, 'dashboard'));
bot.command('miniapps', (ctx) => handleResourceCommand(ctx, 'miniapps'));
bot.command('tools', (ctx) => handleResourceCommand(ctx, 'tools'));
bot.command('terminal', (ctx) => handleResourceCommand(ctx, 'terminal'));

// /automation - Automation Hub
bot.command('automation', async (ctx) => {
  await logMessage(ctx);

  try {
    await callCommandGateway('/commands/automation/ping');
    await ctx.reply('⚙️ *Automation Hub*\n\n✅ Online and responding', {
      parse_mode: 'Markdown',
      ...mainMenu
    });
  } catch (error) {
    await ctx.reply(`❌ Automation Hub: ${error.message}`, mainMenu);
  }
});

// /content - Content creation menu
bot.command('content', async (ctx) => {
  await logMessage(ctx);

  const message = `📸 *Content Creation*\n\n` +
    `Create and publish content for your channels.\n\n` +
    `Use the menu below:`;

  await ctx.reply(message, { parse_mode: 'Markdown', ...contentMenu });
});

// Button handlers
bot.hears('📋 Tasks', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/tasks'));
bot.hears('📦 Orders', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/orders'));
bot.hears('🚀 Deploy', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/deploy'));
bot.hears('🤖 Nova AI', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/nova'));
bot.hears('🔑 License', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/license'));
bot.hears('📊 Stats', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/stats'));
bot.hears('⚙️ Automation', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/automation'));
bot.hears('❓ Help', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/help'));
bot.hears('⚡ Status', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/status'));
bot.hears('📸 Content', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/content'));
bot.hears('🏢 Command Center', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/commandcenter'));
bot.hears('📱 Dashboard', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/dashboard'));
bot.hears('🧩 MiniApps', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/miniapps'));
bot.hears('🛠️ Tools', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/tools'));
bot.hears('💻 Terminal', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/terminal'));
bot.hears('📞 Contacto', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/contacto'));
bot.hears('💰 Precios', (ctx) => ctx.telegram.sendMessage(ctx.chat.id, '/precios'));

bot.hears('🔙 Back', async (ctx) => {
  await ctx.reply('📱 Main Menu:', mainMenu);
});

// Content handlers
bot.hears('📸 Foto', async (ctx) => {
  await ctx.reply('📸 Send me a photo:', contentMenu);
});

bot.hears('💬 Texto', async (ctx) => {
  await ctx.reply('💬 Write your message:', contentMenu);
});

bot.hears('🔗 Botón', (ctx) => ctx.reply('⚙️ Formato: `Texto | URL`', { parse_mode: 'Markdown', ...contentMenu }));
bot.hears('👁️ Preview', (ctx) => ctx.reply('👁️ Preview no configurado aún.', contentMenu));
bot.hears('✅ Enviar', (ctx) => ctx.reply('✅ Envío no configurado aún.', contentMenu));

// General text handler (NOVA/LLM)
bot.on('text', async (ctx) => {
  if (ctx.message.text.startsWith('/')) return;
  await logMessage(ctx);
  try {
    if (NOVA_API_URL) {
      const result = await callNovaAPI(ctx.message.text, false);
      if (result?.meta?.requiresConfirmation) {
        pendingConfirmations.set(ctx.chat.id, { prompt: ctx.message.text });
        return ctx.reply(
          `Necesito confirmación antes de ejecutar: ${result.meta.reasons?.join(', ') || 'acción sensible'}.\nResponde /confirm o /cancel.`,
          mainMenu
        );
      }
      return ctx.reply(result.response || 'Listo.', mainMenu);
    }
    const response = await callLLMGateway(ctx.message.text);
    return ctx.reply(response || 'Listo.', mainMenu);
  } catch (error) {
    console.error('❌ Nova/LLM error:', error);
    return ctx.reply('⚙️ Error técnico contactando a NOVA.', mainMenu);
  }
});

bot.hears('🍎 Mac', async (ctx) => {
  await logMessage(ctx);

  const macInfo = `🍎 *macOS Deployment Info*\n\n` +
    `👤 User: ${BRAND.user}\n` +
    `💻 System: ${BRAND.system}\n` +
    `📦 Node.js: ${process.version}\n` +
    `🚀 Platform: Railway\n` +
    `⏰ Uptime: ${Math.floor(process.uptime())}s\n\n` +
    `✨ Deployed with Mac power! 🍎`;

  await ctx.reply(macInfo, { parse_mode: 'Markdown', ...mainMenu });
});

// Error handling
bot.catch((err, ctx) => {
  console.error('❌ Bot error:', err);
  if (ctx) {
    ctx.reply('⚙️ Technical error. Please try again.', mainMenu)
      .catch(e => console.error('Failed to send error message:', e));
  }
});

// ===========================================
// START BOT
// ===========================================

const startBot = async () => {
  try {
    console.log(`🚀 Starting ${BRAND.name} v${BRAND.version}...`);

    // Test Supabase connection
    if (supabase) {
      try {
        const { error } = await supabase.from('telegram_users').select('count', { count: 'exact', head: true });
        if (error) throw error;
        console.log('✅ Supabase connected');
      } catch (error) {
        console.warn('⚠️ Supabase connection failed:', error.message);
      }
    } else {
      console.warn('⚠️ Supabase not configured (optional)');
    }

    let serverStarted = false;

    const startServer = () => {
      if (serverStarted) return;
      app.listen(PORT, '0.0.0.0', () => {
        console.log(`✅ ${BRAND.name} running on port ${PORT}`);
        console.log(`🔗 Health: ${WEBHOOK_URL ? WEBHOOK_URL : `http://localhost:${PORT}`}/health`);
        console.log(`🔗 Stats: ${WEBHOOK_URL ? WEBHOOK_URL : `http://localhost:${PORT}`}/stats`);
        if (WEBHOOK_URL) console.log(`🔗 Webhook: ${WEBHOOK_URL}/webhook`);
      });
      serverStarted = true;
    };

    const startTelegram = async () => {
      try {
        if (WEBHOOK_URL) {
          await bot.telegram.setWebhook(`${WEBHOOK_URL}/webhook`);
          startServer();
        } else {
          startServer();
        }
        await bot.launch();
        console.log(`✅ ${BRAND.name} running in ${WEBHOOK_URL ? 'webhook' : 'polling'} mode`);
      } catch (error) {
        console.error('❌ Telegram init failed, retrying in 30s:', error.message);
        startServer();
        setTimeout(startTelegram, 30000);
      }
    };

    await startTelegram();

    console.log(`\n🎯 ${BRAND.tagline}`);
    console.log(`🏢 ${BRAND.company}\n`);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

startBot();
