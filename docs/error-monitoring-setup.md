# Error Monitoring Setup Guide

This guide covers setting up comprehensive error monitoring for the Superwire production deployment using Sentry (recommended) and alternative solutions.

## 🚀 Recommended: Sentry Setup

Sentry provides excellent error tracking, performance monitoring, and integrates seamlessly with Next.js and Vercel.

### Step 1: Create Sentry Account

1. **Sign up for Sentry**
   - Go to [sentry.io](https://sentry.io/)
   - Create free account (5,000 errors/month included)
   - Create new project for "Next.js"

2. **Get Project Configuration**
   - Copy your DSN (Data Source Name)
   - Note your Organization slug and Project name
   - Save Auth Token for CLI access

### Step 2: Install Sentry SDK

```bash
# Install Sentry for Next.js
yarn add @sentry/nextjs

# Install Sentry CLI for build-time configuration
yarn add --dev @sentry/cli
```

### Step 3: Configure Sentry

Create `sentry.client.config.js` in project root:
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  
  // Adjust this value in production, or use tracesSampler for greater control
  tracesSampleRate: 1.0,
  
  // Capture 100% of the transactions, reduce in production!
  debug: false,
  
  // Enable performance monitoring
  integrations: [
    new Sentry.BrowserTracing({
      // Set sampling rate for performance monitoring
      tracingOrigins: ["localhost", /^https:\/\/yourapp\.vercel\.app\/api/],
    }),
  ],
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV || 'development',
});
```

Create `sentry.server.config.js` in project root:
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
  
  // Release tracking
  release: process.env.VERCEL_GIT_COMMIT_SHA,
  environment: process.env.VERCEL_ENV || 'development',
});
```

Create `sentry.edge.config.js` in project root:
```javascript
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 1.0,
  debug: false,
});
```

### Step 4: Environment Variables

Add to Vercel environment variables:
```bash
# Sentry Configuration (Production)
SENTRY_DSN=https://your-dsn@sentry.io/project-id
NEXT_PUBLIC_SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ORG=your-org-slug
SENTRY_PROJECT=your-project-name
SENTRY_AUTH_TOKEN=your-auth-token

# Optional: Error reporting configuration
SENTRY_IGNORE_API_RESOLUTION_ERROR=1
```

### Step 5: Next.js Configuration

Update `next.config.js`:
```javascript
const { withSentryConfig } = require('@sentry/nextjs');

const moduleExports = {
  // Your existing config
  experimental: {
    appDir: true,
  },
};

const sentryWebpackPluginOptions = {
  // Additional config options for the Sentry Webpack plugin
  silent: true, // Suppresses source map uploading logs during build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
};

// Make sure adding Sentry options is the last code to run before exporting
module.exports = withSentryConfig(moduleExports, sentryWebpackPluginOptions);
```

## 🔧 API Error Monitoring

### Automatic API Route Monitoring

Sentry automatically captures unhandled errors in API routes. For custom error tracking:

```javascript
// pages/api/episodes.ts (example)
import * as Sentry from '@sentry/nextjs';

export default async function handler(req, res) {
  try {
    // Your API logic here
    const result = await generateEpisode();
    res.json(result);
  } catch (error) {
    // Automatically captured by Sentry
    Sentry.captureException(error, {
      tags: {
        api_route: 'episodes',
        method: req.method,
      },
      extra: {
        request_body: req.body,
        user_agent: req.headers['user-agent'],
      },
    });
    
    res.status(500).json({ error: 'Episode generation failed' });
  }
}
```

### Custom Error Context

Add context to errors for better debugging:

```javascript
// Add user context
Sentry.setUser({
  id: userId,
  email: userEmail,
});

// Add tags for filtering
Sentry.setTag('feature', 'episode_generation');
Sentry.setTag('model', 'gpt-5-mini');

// Add extra context
Sentry.setExtra('episode_date', '2024-01-15');
Sentry.setExtra('cost_tracking', costData);
```

## 📊 Performance Monitoring

### Web Vitals Tracking

Sentry automatically tracks Core Web Vitals. For custom performance monitoring:

```javascript
// Measure API response times
import { startTransaction } from '@sentry/nextjs';

const transaction = startTransaction({
  name: 'Episode Generation',
  op: 'task',
});

try {
  const episode = await generateEpisode();
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

### Custom Performance Metrics

```javascript
// Track episode generation performance
Sentry.addBreadcrumb({
  message: 'Episode generation started',
  category: 'generation',
  level: 'info',
  data: {
    story_count: stories.length,
    estimated_cost: estimatedCost,
  },
});
```

## 🎯 Superwire-Specific Monitoring

### Critical Error Scenarios

1. **Episode Generation Failures**
```javascript
// Monitor OpenRouter API failures
Sentry.captureException(error, {
  tags: {
    service: 'openrouter',
    model: modelName,
    task_type: taskType,
  },
  extra: {
    prompt_length: prompt.length,
    cost_so_far: dailyCost,
  },
});
```

2. **News Ingestion Errors**
```javascript
// Monitor News API failures
Sentry.captureException(error, {
  tags: {
    service: 'news_api',
    source: sourceName,
  },
  extra: {
    articles_fetched: articlesCount,
    rss_url: rssUrl,
  },
});
```

3. **Storage Upload Failures**
```javascript
// Monitor Vercel Blob storage issues
Sentry.captureException(error, {
  tags: {
    service: 'vercel_blob',
    operation: 'upload',
  },
  extra: {
    file_size: audioBuffer.length,
    episode_date: episodeDate,
  },
});
```

4. **Cost Budget Overruns**
```javascript
// Monitor budget threshold breaches
if (dailyCost > budgetThreshold) {
  Sentry.captureMessage('Daily budget threshold exceeded', {
    level: 'warning',
    tags: {
      category: 'budget',
      severity: 'high',
    },
    extra: {
      daily_cost: dailyCost,
      budget_limit: budgetThreshold,
      services_used: servicesBreakdown,
    },
  });
}
```

## 🔔 Alerting & Notifications

### Slack Integration

1. **Setup Slack Webhook**
   - Create Slack app for your workspace
   - Add webhook URL to Sentry project settings

2. **Configure Alert Rules**
   ```javascript
   // High-priority alerts
   - Episode generation failures (immediate)
   - API authentication failures (immediate)
   - Budget overruns (15 minutes)
   - Storage failures (immediate)
   
   // Medium-priority alerts  
   - News ingestion errors (1 hour)
   - Performance degradation (30 minutes)
   - High error rates (15 minutes)
   ```

### Email Notifications

Configure email alerts for:
- Critical errors affecting episode generation
- Budget threshold warnings
- API quota approaching limits
- Storage issues

## 🚀 Alternative Solutions

### Option 2: Rollbar

If you prefer Rollbar over Sentry:

```bash
# Install Rollbar
yarn add rollbar
```

```javascript
// lib/rollbar.js
import Rollbar from 'rollbar';

const rollbar = new Rollbar({
  accessToken: process.env.ROLLBAR_ACCESS_TOKEN,
  environment: process.env.VERCEL_ENV || 'development',
  captureUncaught: true,
  captureUnhandledRejections: true,
});

export default rollbar;
```

### Option 3: LogRocket (With Session Replay)

For comprehensive debugging with session replay:

```bash
yarn add logrocket
```

```javascript
// Initialize LogRocket
import LogRocket from 'logrocket';

LogRocket.init(process.env.NEXT_PUBLIC_LOGROCKET_APP_ID);
```

### Option 4: Vercel Built-in Monitoring

Check Vercel dashboard for:
- Function logs and errors
- Build-time error reporting
- Runtime error tracking
- Performance monitoring

## 🛠️ Implementation Steps

### Production Deployment

1. **Environment Setup**
   ```bash
   # Add to Vercel environment variables
   SENTRY_DSN=your-production-dsn
   NEXT_PUBLIC_SENTRY_DSN=your-production-dsn
   SENTRY_ORG=your-org
   SENTRY_PROJECT=superwire
   SENTRY_AUTH_TOKEN=your-auth-token
   ```

2. **Build Configuration**
   ```bash
   # Verify Sentry CLI access
   yarn sentry-cli --version
   
   # Test build with source maps
   yarn build
   ```

3. **Deploy and Verify**
   ```bash
   # Deploy to Vercel
   vercel --prod
   
   # Test error tracking
   curl https://your-domain.com/api/test-error
   ```

### Testing Error Monitoring

1. **Create Test Error Route**
```javascript
// pages/api/test-error.js
export default function handler(req, res) {
  throw new Error('Test error for monitoring verification');
}
```

2. **Verify Error Appears in Sentry**
   - Visit `/api/test-error` in production
   - Check Sentry dashboard for error report
   - Verify source maps and stack traces

3. **Test Performance Monitoring**
   - Navigate through the app
   - Check Sentry performance tab
   - Verify transaction tracking

## 📊 Monitoring Dashboard

### Key Metrics to Track

1. **Error Rates**
   - API endpoint error rates
   - Episode generation success rate
   - News ingestion failure rate

2. **Performance Metrics**
   - Page load times
   - API response times
   - Episode generation duration

3. **Budget Monitoring**
   - Daily cost tracking
   - API quota usage
   - Error-induced cost spikes

4. **User Experience**
   - Core Web Vitals scores
   - Page load performance
   - Audio playback errors

## 🔍 Troubleshooting

### Common Issues

1. **Source Maps Not Uploading**
   ```bash
   # Verify Sentry CLI authentication
   yarn sentry-cli info
   
   # Manual source map upload
   yarn sentry-cli releases files $VERSION upload-sourcemaps .next/static
   ```

2. **High Error Volume**
   ```javascript
   // Implement error sampling
   beforeSend(event, hint) {
     // Sample errors in production
     if (Math.random() > 0.1) {
       return null; // Drop 90% of errors
     }
     return event;
   }
   ```

3. **Performance Impact**
   ```javascript
   // Reduce sampling in production
   tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
   ```

## ✅ Completion Checklist

- [ ] Create Sentry account and project
- [ ] Install @sentry/nextjs package
- [ ] Configure Sentry client/server/edge configs
- [ ] Add environment variables to Vercel
- [ ] Update next.config.js with Sentry integration
- [ ] Add custom error tracking to API routes
- [ ] Configure alerting rules and notifications
- [ ] Test error reporting in production
- [ ] Verify source maps and stack traces
- [ ] Set up performance monitoring
- [ ] Configure budget and quota alerts
- [ ] Document error response procedures

---

**Result**: Comprehensive error monitoring provides real-time visibility into production issues, enabling rapid response to episodes generation problems, API failures, and budget overruns.