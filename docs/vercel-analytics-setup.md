# Vercel Analytics Setup Guide

This guide explains how to enable Vercel Analytics for the Superwire production deployment without requiring code changes or npm packages.

## 🚀 Dashboard Setup (Recommended)

Vercel Analytics can be enabled directly through the Vercel dashboard without any code modifications. This is the simplest and most reliable approach.

### Step 1: Access Vercel Analytics

1. **Go to Vercel Dashboard**
   - Visit [vercel.com/dashboard](https://vercel.com/dashboard)
   - Select your Superwire project

2. **Navigate to Analytics**
   - Click on the **Analytics** tab in your project
   - Or go to `https://vercel.com/[username]/[project-name]/analytics`

### Step 2: Enable Analytics

1. **Enable Web Analytics**
   - Click **"Enable Analytics"** button
   - No code changes required - Vercel automatically injects tracking

2. **Configure Analytics Settings** (Optional)
   - Set up custom events if needed
   - Configure data retention preferences
   - Set up audience segments

### Step 3: Verify Analytics

1. **Deploy and Test**
   - Analytics will be automatically enabled on your next deployment
   - No rebuild required if already deployed

2. **Check Data Flow**
   - Visit your production site: `https://superwire-knzom9ptl-moomooskycow.vercel.app`
   - Navigate to different pages
   - Return to Analytics dashboard to see real-time data

## 📊 Analytics Features Available

### Automatic Tracking
- ✅ **Page Views**: All route changes automatically tracked
- ✅ **Unique Visitors**: User sessions and returning visitors
- ✅ **Referrer Sources**: Traffic sources and campaign tracking
- ✅ **Device Information**: Browser, OS, device type
- ✅ **Geographic Data**: Country and region analytics
- ✅ **Performance Metrics**: Page load times and Core Web Vitals

### Real-Time Data
- ✅ **Live Visitors**: Current active users
- ✅ **Popular Pages**: Most viewed routes
- ✅ **Traffic Sources**: Real-time referrer information
- ✅ **Geographic Distribution**: Live visitor locations

### Advanced Analytics
- ✅ **Audience Insights**: User behavior patterns
- ✅ **Conversion Tracking**: Goal and event tracking
- ✅ **A/B Testing**: Vercel's built-in experimentation
- ✅ **Custom Events**: API-based event tracking

## 🎯 Superwire-Specific Tracking

### Key Metrics to Monitor

1. **Episode Engagement**
   - Page views on `/` (main episode page)
   - Time spent on audio player
   - Archive page visits (`/archive`, `/archive/[date]`)

2. **API Usage**
   - RSS feed requests (`/api/rss`)
   - JSON feed requests (`/api/feed.json`)
   - Episode generation requests (`/api/episodes`)

3. **Content Performance**
   - Most popular episode dates
   - Geographic distribution of listeners
   - Device types (mobile vs desktop)

4. **User Journey**
   - Landing page → episode player flow
   - Archive browsing patterns
   - Return visitor rates

### Custom Events (Optional)

If you want to track specific actions beyond page views, you can use Vercel's Analytics API:

```javascript
// Track episode plays
analytics.track('episode_play', {
  episode_date: '2024-01-15',
  duration: 300 // seconds
});

// Track RSS subscriptions
analytics.track('rss_subscribe', {
  source: 'main_page'
});
```

## 🔧 Alternative: Script Injection Method

If dashboard enablement doesn't work, you can manually inject the analytics script:

### 1. Add Analytics Script to Head

Update `app/head.tsx` or add to `next.config.js`:

```javascript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Vercel-Analytics',
            value: 'enabled'
          }
        ]
      }
    ];
  }
};
```

### 2. Manual Script Injection

Add to `app/layout.tsx` or `pages/_app.tsx`:

```html
<script defer src="/_vercel/insights/script.js"></script>
```

## 🛡️ Privacy & GDPR Compliance

### Privacy-Friendly Features
- ✅ **No Cookies**: Vercel Analytics doesn't use tracking cookies
- ✅ **Anonymized Data**: No personal information collected
- ✅ **GDPR Compliant**: Meets European privacy requirements
- ✅ **Lightweight**: Minimal performance impact (~1KB)

### Data Processing
- All data processed within Vercel's infrastructure
- No third-party tracking or data sharing
- Aggregated analytics only
- User privacy maintained

## 📱 Mobile & Performance Impact

### Performance
- **Script Size**: ~1KB compressed
- **Load Time**: <50ms additional load time
- **Performance Score**: No impact on Lighthouse scores
- **Bandwidth**: Minimal data usage

### Mobile Optimization
- Responsive analytics dashboard
- Mobile-specific user behavior tracking
- Touch event and gesture analytics
- Mobile performance monitoring

## 🔍 Troubleshooting

### Common Issues

1. **Analytics Not Showing Data**
   ```bash
   # Check if analytics is enabled
   curl -I https://your-domain.com/_vercel/insights/script.js
   
   # Should return 200 status
   ```

2. **Deployment Required**
   - Analytics changes require a new deployment
   - Redeploy via Vercel dashboard or `vercel --prod`

3. **Custom Domain Issues**
   - Ensure custom domain is properly configured
   - Analytics may take 24-48 hours to appear with new domains

### Verification Steps

1. **Check Analytics Script**
   - View page source in production
   - Look for `/_vercel/insights/script.js`

2. **Network Tab Verification**
   - Open browser dev tools
   - Navigate to Network tab
   - Look for analytics requests to Vercel

3. **Real-Time Testing**
   - Visit your site in incognito mode
   - Check Analytics dashboard for live visitor

## 📊 Dashboard Overview

### Key Sections
- **Overview**: High-level metrics and trends
- **Pages**: Individual page performance
- **Referrers**: Traffic sources and campaigns
- **Countries**: Geographic distribution
- **Devices**: Browser and device analytics
- **Events**: Custom event tracking (if configured)

### Export & API Access
- CSV export for all analytics data
- API access for custom dashboards
- Integration with BI tools
- Automated reporting options

## ✅ Completion Checklist

- [ ] Access Vercel Dashboard Analytics section
- [ ] Enable Web Analytics for project
- [ ] Verify analytics script loads on production site
- [ ] Confirm real-time data appears in dashboard
- [ ] Test on multiple devices and browsers
- [ ] Review key metrics relevant to Superwire
- [ ] Set up custom events (optional)
- [ ] Configure alerts and notifications (optional)

---

**Result**: Vercel Analytics provides comprehensive, privacy-friendly traffic insights without requiring any code changes or npm packages. The dashboard method is the most reliable approach for the Superwire project.