# 🤖 STAYArta Unified Bot

**Version**: 2.0.0
**Platform**: Telegram
**Framework**: Telegraf

---

## ✨ Features

This is the **unified** Telegram bot for the STAYArta ecosystem, combining the best features from:
- **NovaSTAYBot** (content automation, branding)
- **Command Bot** (project management, integrations)

### Capabilities

✅ **Project Management**
- Task tracking (TaskBoard integration)
- Order management
- Deployment control

✅ **AI Integration**
- Nova AI chat assistant
- Multiple LLM models
- Conversation history

✅ **License Management**
- STL-Key validation
- License status checking
- Feature verification

✅ **Command Center**
- Automation Hub status
- Dashboard resources
- Terminal/SSH info
- MiniApps inventory

✅ **Content Creation**
- Photo/text posts
- Button creation
- Preview & publish

✅ **Analytics**
- Usage statistics
- User tracking
- Message logging

---

## 🚀 Quick Start

### 1. Install Dependencies

```bash
cd /Users/carlos/stayarta/repos/stayarta-unified-bot
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 3. Run Locally

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

### 4. Deploy to Railway

1. Push to GitHub
2. Connect to Railway
3. Configure environment variables
4. Deploy!

---

## 📋 Commands

### Basic Commands
- `/start` - Welcome message & main menu
- `/help` - Full command list with descriptions
- `/menu` - Show main menu
- `/status` - Bot status and health
- `/ping` - Ping all services

### Project Management
- `/tasks` - View TaskBoard status
- `/tasks <status>` - Filter tasks by status
- `/projects` - List all projects
- `/orders` - Track orders
- `/orders <status>` - Filter orders
- `/deploy` - Deployment phases info
- `/deploy <phase>` - Specific phase info

### AI & Intelligence
- `/nova <message>` - Chat with Nova AI
- `/models` - List available LLM models
- `/history` - View conversation history

### Licenses
- `/license <STL-KEY>` - Validate license
- `/mylicenses` - View your licenses

### Command Center
- `/automation` - Automation Hub status
- `/dashboard` - Dashboard resources
- `/terminal` - SSH access info
- `/miniapps` - MiniApps inventory
- `/tools` - AI tools list

### Content
- `/content` - Content creation menu
- `/photo` - Send photo
- `/text` - Send text message

### System
- `/stats` - Usage statistics
- `/mac` - macOS deployment info

---

## 🔗 Integrations

### Supabase (Database)
**Tables used**:
- `telegram_users` - User tracking
- `telegram_messages` - Message logging
- `licenses` - License validation

**Functions used**:
- `validate_stl_key(key, domain)` - License validation

### Command Gateway
**Base URL**: `http://localhost:3300` (or production URL)

**Endpoints**:
- `/commands/tasks/status` - TaskBoard
- `/commands/orders/list` - Orders
- `/commands/deploy` - Deployment
- `/commands/automation/ping` - Automation Hub

### LLM Gateway
**Base URL**: `http://localhost:3200` (or production URL)

**Endpoints**:
- `/api/chat` - Chat with AI models
- `/api/models` - List models
- `/health` - Health check

---

## 🛠️ Configuration

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `BOT_TOKEN` | Yes | - | Telegram bot token |
| `PORT` | No | 3000 | Server port |
| `WEBHOOK_URL` | No | - | Webhook URL (production) |
| `SUPABASE_URL` | No | localhost | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | No | - | Supabase service role key |
| `COMMAND_GATEWAY_URL` | No | localhost:3300 | Command Gateway URL |
| `LLM_GATEWAY_URL` | No | localhost:3200 | LLM Gateway URL |

### Railway Deployment

**Environment Variables to Set**:
```
BOT_TOKEN=8232435267:AAEzJw81GH5_U3XGFTg87nKiYIllONIGmLc
WEBHOOK_URL=https://your-app.railway.app
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=your-service-role-key
COMMAND_GATEWAY_URL=https://cc.stayarta.com
LLM_GATEWAY_URL=https://api.stayarta.com
```

**Start Command**: `npm start`

---

## 📊 Health Checks

### GET /health
```json
{
  "status": "healthy",
  "bot": "STAYArta Unified Bot",
  "version": "2.0.0",
  "uptime": 3600,
  "webhook_configured": true,
  "supabase_connected": true
}
```

### GET /stats
```json
{
  "bot": "STAYArta Unified Bot",
  "version": "2.0.0",
  "uptime_seconds": 3600,
  "users": 25,
  "messages": 150,
  "commands_executed": 75
}
```

---

## 🔒 Security

- All messages are logged to Supabase (if configured)
- License validation uses secure RPC calls
- No sensitive data stored in bot memory
- Webhook endpoint secured with token verification

---

## 🐛 Debugging

### Check Logs
```bash
# Local
npm start

# Railway
railway logs
```

### Test Commands Locally
```bash
# Start in development mode
npm run dev

# Open Telegram and send commands to your bot
```

### Common Issues

**Bot not responding**:
- Check BOT_TOKEN is correct
- Verify bot is running: `GET /health`
- Check Telegram bot settings

**Database errors**:
- Verify SUPABASE_URL and SUPABASE_SERVICE_KEY
- Check table permissions (RLS policies)
- Run migrations: `supabase db push`

**Gateway errors**:
- Check COMMAND_GATEWAY_URL is accessible
- Verify LLM_GATEWAY_URL is accessible
- Test with `/ping` command

---

## 📝 License

SEE LICENSE IN LICENSE

© 2025 STAYArta. All rights reserved.

---

## 🎯 Roadmap

### Done ✅
- Unified bot codebase
- 25+ commands
- Supabase integration
- Command Gateway integration
- LLM Gateway integration
- License validation
- Message logging

### Coming Soon 🚀
- WhatsApp integration
- Advanced analytics dashboard
- Multi-language support
- Custom webhooks
- Admin panel

---

**Stay Arta and Hack the Ordinary** 🚀

*Deployed with 🍎 by carlos*
