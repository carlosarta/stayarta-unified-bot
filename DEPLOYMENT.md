# STAYArta Unified Bot - Deployment Guide

## 🚀 Quick Deploy to Railway

### 1. Prerequisites

- GitHub repository with bot code
- Railway account (https://railway.app)
- Supabase project (already configured: `rbhytiogpyuoewuzfipt`)

### 2. Deploy Steps

#### Option A: Railway CLI

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
cd /Users/carlos/STAYArta/repos/stayarta-unified-bot
railway init

# Deploy
railway up
```

#### Option B: Railway Dashboard

1. Go to: https://railway.app/new
2. Select "Deploy from GitHub repo"
3. Connect GitHub account
4. Select repository: `stayarta-unified-bot`
5. Railway will auto-detect and deploy

### 3. Configure Environment Variables

In Railway Dashboard → Variables, add:

```env
BOT_TOKEN=8232435267:AAEzJw81GH5_U3XGFTg87nKiYIllONIGmLc
WEBHOOK_URL=https://stayarta-unified-bot.up.railway.app
SUPABASE_URL=https://rbhytiogpyuoewuzfipt.supabase.co
SUPABASE_SERVICE_KEY=<your-service-role-key>
COMMAND_GATEWAY_URL=https://cc.stayarta.com
LLM_GATEWAY_URL=https://api.stayarta.com
NODE_ENV=production
PORT=3000
```

### 4. Get SUPABASE_SERVICE_KEY

1. Go to: https://supabase.com/dashboard/project/rbhytiogpyuoewuzfipt/settings/api
2. Copy the `service_role` key (⚠️ Keep it secret!)
3. Paste in Railway environment variables

### 5. Set Webhook

After deployment, Railway will provide a URL (e.g., `https://stayarta-unified-bot.up.railway.app`)

Update webhook:

```bash
# Set Telegram webhook
curl -X POST "https://api.telegram.org/bot8232435267:AAEzJw81GH5_U3XGFTg87nKiYIllONIGmLc/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://stayarta-unified-bot.up.railway.app"}'

# Verify webhook
curl "https://api.telegram.org/bot8232435267:AAEzJw81GH5_U3XGFTg87nKiYIllONIGmLc/getWebhookInfo"
```

### 6. Verify Deployment

```bash
# Health check
curl https://stayarta-unified-bot.up.railway.app/health

# Stats
curl https://stayarta-unified-bot.up.railway.app/stats
```

Expected response:
```json
{
  "status": "healthy",
  "bot": "STAYArta Unified Bot",
  "version": "2.0.0",
  "uptime": 123,
  "webhook_configured": true,
  "supabase_connected": true
}
```

## 🔄 Update Deployment

### Method 1: Git Push (Auto-deploy)

```bash
git add .
git commit -m "Update bot configuration"
git push origin main
# Railway auto-deploys on push
```

### Method 2: Railway CLI

```bash
railway up
```

## 🗄️ Database Configuration

### Verify Supabase Connection

The bot uses these Supabase tables:

```sql
-- public.telegram_users
CREATE TABLE IF NOT EXISTS public.telegram_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.telegram_messages
CREATE TABLE IF NOT EXISTS public.telegram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.telegram_users(id),
    telegram_user_id BIGINT,
    message_text TEXT,
    command TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- public.licenses (already exists)
-- Used for /license <STL-KEY> validation
```

### Add Missing Tables

If tables don't exist, create them:

```bash
# Connect to Supabase
cd /Users/carlos/STAYArta/supabase

# Create migration
supabase migration new add_telegram_tables

# Edit migration file:
# supabase/migrations/YYYYMMDD_add_telegram_tables.sql
```

Add this SQL:

```sql
-- Telegram Users
CREATE TABLE IF NOT EXISTS public.telegram_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    last_name TEXT,
    language_code TEXT,
    is_bot BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_telegram_users_telegram_id ON public.telegram_users(telegram_id);

-- Telegram Messages
CREATE TABLE IF NOT EXISTS public.telegram_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.telegram_users(id) ON DELETE CASCADE,
    telegram_user_id BIGINT,
    chat_id BIGINT,
    message_id BIGINT,
    message_text TEXT,
    command TEXT,
    response TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_telegram_messages_user_id ON public.telegram_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_telegram_user_id ON public.telegram_messages(telegram_user_id);
CREATE INDEX IF NOT EXISTS idx_telegram_messages_command ON public.telegram_messages(command);

-- RLS Policies
ALTER TABLE public.telegram_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telegram_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage telegram users"
    ON public.telegram_users FOR ALL
    USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage telegram messages"
    ON public.telegram_messages FOR ALL
    USING (auth.role() = 'service_role');
```

Push migration:

```bash
supabase db push
```

## 🧪 Testing

### Test Locally

```bash
cd /Users/carlos/STAYArta/repos/stayarta-unified-bot

# Create .env with production values
cp .env.production .env
# Edit .env and add your SUPABASE_SERVICE_KEY

# Run locally
npm run dev

# Test in Telegram
# Send: /start
# Send: /ping
# Send: /status
```

### Test Production

After deploying to Railway:

1. Open Telegram
2. Find your bot: `@YourBotName`
3. Send: `/start`
4. Send: `/help`
5. Send: `/ping` (should ping all services)
6. Send: `/status` (should show bot health)

### Test License Validation

```bash
# In Supabase, create a test license
INSERT INTO public.licenses (
    stl_key,
    client_id,
    plan,
    status
) VALUES (
    'STL-TEST-12345',
    (SELECT id FROM public.clients LIMIT 1),
    'professional',
    'active'
);

# In Telegram, test:
/license STL-TEST-12345
```

## 📊 Monitoring

### Railway Logs

```bash
# View logs
railway logs

# Follow logs
railway logs --follow
```

### Supabase Logs

1. Go to: https://supabase.com/dashboard/project/rbhytiogpyuoewuzfipt/logs/explorer
2. Filter by table: `telegram_users`, `telegram_messages`
3. Check for errors

### Health Checks

Set up monitoring with Railway:

1. Railway Dashboard → Settings → Health Checks
2. Path: `/health`
3. Interval: 60 seconds
4. Timeout: 5 seconds

## 🔒 Security Checklist

- [x] Bot token is in environment variables (not in code)
- [x] Supabase service key is secret (Railway Variables)
- [x] Webhook uses HTTPS
- [x] RLS policies enabled on all tables
- [ ] Rate limiting configured (TODO)
- [ ] Error messages don't expose sensitive info

## 🐛 Troubleshooting

### Bot Not Responding

1. Check Railway logs: `railway logs`
2. Verify webhook:
   ```bash
   curl "https://api.telegram.org/bot<TOKEN>/getWebhookInfo"
   ```
3. Check Supabase connection:
   ```bash
   curl https://stayarta-unified-bot.up.railway.app/health
   ```

### Database Errors

1. Verify Supabase project is unpaused
2. Check service_role key is correct
3. Verify tables exist:
   ```sql
   SELECT table_name FROM information_schema.tables
   WHERE table_schema = 'public';
   ```

### Gateway Errors

1. Verify gateway URLs are correct
2. Test gateway directly:
   ```bash
   curl https://api.stayarta.com/health
   curl https://cc.stayarta.com/health
   ```

## 📚 Resources

- **Railway Dashboard**: https://railway.app/dashboard
- **Supabase Dashboard**: https://supabase.com/dashboard/project/rbhytiogpyuoewuzfipt
- **Telegram Bot API**: https://core.telegram.org/bots/api
- **Bot Commands**: See README.md

---

**Last Updated**: December 2025
