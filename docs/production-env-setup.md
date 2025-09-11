# Production Environment Variables Setup Guide

This guide explains how to configure all required environment variables in the Vercel dashboard for production deployment of Superwire.

## 🚀 Vercel Dashboard Configuration Steps

1. **Access Vercel Dashboard**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your Superwire project
   - Navigate to **Settings** → **Environment Variables**

2. **Add Production Variables**
   - Click **Add New**
   - Enter the variable name and value
   - Select **Production** environment
   - Click **Save**

## 📋 Required Environment Variables

### Core API Keys (Critical - App won't work without these)

```bash
# OpenRouter API Key (AI Content Generation)
OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key_here

# OpenAI API Key (Text-to-Speech)
OPENAI_API_KEY=sk-proj-your_openai_api_key_here

# News API Key (Content Ingestion)
NEWS_API_KEY=your_news_api_key_here

# Vercel Blob Storage Token (Episode Storage)
BLOB_READ_WRITE_TOKEN=vercel_blob_rw_your_blob_token_here
```

### Database Configuration (Critical)

```bash
# Convex Database (Production)
NEXT_PUBLIC_CONVEX_URL=https://loyal-antelope-201.convex.cloud
CONVEX_DEPLOYMENT=prod:loyal-antelope-201
```

### Site Configuration (Required)

```bash
# Site URL (Production Domain)
SITE_URL=https://superwire-knzom9ptl-moomooskycow.vercel.app
```

## 🔧 Optional Environment Variables

### Notification Services (For Error Monitoring)

```bash
# Discord Notifications (Optional)
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# SendGrid Email Notifications (Optional)  
SENDGRID_API_KEY=SG.your_sendgrid_api_key_here
SENDGRID_FROM_EMAIL=notifications@your-domain.com
SENDGRID_TO_EMAIL=admin@your-domain.com
```

### Cloudflare CDN (Optional - Performance Enhancement)

```bash
# Cloudflare CDN Configuration (Optional)
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
CLOUDFLARE_CDN_DOMAIN=your-cdn-domain.com

# Audio CDN Domain (Optional)
VERCEL_AUDIO_DOMAIN=your-audio-cdn.com
```

### Fallback Services

```bash
# ElevenLabs TTS (Fallback for OpenAI TTS)
ELEVEN_LABS_API_KEY=your_elevenlabs_api_key_here
```

### Security Configuration

```bash
# Cron Job Security (Recommended)
CRON_SECRET=your_secure_random_string_here
```

## 🎯 Production-Specific Values

### Update These Values for Production:

1. **SITE_URL**: Change from `http://localhost:3000` to your production domain
2. **Convex URLs**: Ensure using production Convex deployment
3. **CRON_SECRET**: Generate a secure random string for cron job authentication

### Generate Secure CRON_SECRET:
```bash
# Run this command to generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

## 📱 Vercel Dashboard UI Steps

### Step-by-Step Configuration:

1. **Navigate to Environment Variables**
   ```
   Vercel Dashboard → Your Project → Settings → Environment Variables
   ```

2. **For Each Variable:**
   - Click **"Add New"**
   - **Name**: Enter variable name (e.g., `OPENROUTER_API_KEY`)
   - **Value**: Enter the actual value
   - **Environments**: Select **"Production"** only
   - Click **"Save"**

3. **Verify Configuration**
   - All required variables should show ✅ status
   - Check that sensitive values are hidden in the UI
   - Ensure no development/local values leaked to production

## ⚠️  Security Best Practices

### API Key Security:
- ✅ Never commit API keys to git
- ✅ Use production-specific keys (not development keys)
- ✅ Rotate keys regularly
- ✅ Monitor API usage for anomalies

### Environment Separation:
- ✅ Use separate keys for production vs development
- ✅ Configure variables only for production environment
- ✅ Test with development keys first

## 🧪 Environment Validation

### After Configuration, Test:

1. **Deploy and Verify**
   ```bash
   # Trigger deployment
   git push origin main
   
   # Check production endpoints
   curl https://your-domain.com/api/stats
   curl https://your-domain.com/api/rss
   ```

2. **Monitor Logs**
   - Check Vercel deployment logs for errors
   - Verify no "environment variable undefined" messages
   - Test API endpoints return expected data

3. **Cost Monitoring**
   - Monitor OpenRouter usage dashboard
   - Check OpenAI API usage
   - Verify News API quota usage

## 🔍 Troubleshooting

### Common Issues:

1. **"Environment variable undefined"**
   - Check spelling of variable names
   - Ensure variable is set for Production environment
   - Verify no extra spaces in variable names

2. **API Authentication Errors**
   - Verify API keys are valid and not expired
   - Check API key permissions/scopes
   - Test keys in development first

3. **Database Connection Issues**
   - Verify Convex deployment URL is correct
   - Check Convex project is in production mode
   - Ensure NEXT_PUBLIC_CONVEX_URL is accessible

## 📊 Configuration Checklist

- [ ] Core API Keys configured (OpenRouter, OpenAI, News API, Blob Token)
- [ ] Database connection configured (Convex production)
- [ ] Site URL updated to production domain
- [ ] CRON_SECRET generated and configured
- [ ] Optional services configured as needed
- [ ] All variables set to "Production" environment only
- [ ] Deployment successful with no environment errors
- [ ] API endpoints returning expected data
- [ ] Cost monitoring dashboards configured

## 📞 Support

If you encounter issues:
- Check Vercel deployment logs first
- Verify API keys in respective provider dashboards  
- Test individual API endpoints
- Monitor cost usage to catch issues early

---

**Next Steps**: After configuring these variables, proceed to test the production deployment and enable monitoring services.