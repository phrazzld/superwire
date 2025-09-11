# Cloudflare CDN Setup Guide for Superwire

This guide explains how to enable and configure Cloudflare CDN for audio file delivery in Superwire.

## Overview

Superwire has **built-in Cloudflare CDN support** that automatically:
- Serves audio files through Cloudflare's global edge network
- Implements smart caching strategies optimized for podcast content
- Provides automatic fallback to direct URLs if CDN is unavailable
- Includes health checks and performance monitoring

## Quick Start

### Step 1: Set Environment Variables

Add these to your `.env.local` (development) or Vercel dashboard (production):

```bash
# Required: Your Cloudflare CDN domain
CLOUDFLARE_CDN_DOMAIN=cdn.your-domain.com

# Optional: For cache purging capabilities
CLOUDFLARE_API_TOKEN=your_cloudflare_api_token
CLOUDFLARE_ZONE_ID=your_cloudflare_zone_id
```

### Step 2: Configure Cloudflare

1. **Create a Cloudflare Account** (if you don't have one)
   - Visit [cloudflare.com](https://cloudflare.com)
   - Sign up for a free account

2. **Add Your Domain**
   - Add your domain to Cloudflare
   - Update your domain's nameservers to Cloudflare's

3. **Configure CDN Subdomain**
   - Create a CNAME record: `cdn` → `your-vercel-app.vercel.app`
   - Enable "Proxied" (orange cloud) for CDN benefits

4. **Configure Cache Rules** (Recommended)
   - Go to Rules → Page Rules
   - Create rule for `cdn.your-domain.com/*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 day
     - Browser Cache TTL: 4 hours

### Step 3: Verify Configuration

Test that CDN is working:

```bash
# Check if CDN is enabled
curl http://localhost:3000/api/stats

# Look for CDN configuration in response
# "cdnEnabled": true
```

## How It Works

### Automatic CDN Enhancement

When `CLOUDFLARE_CDN_DOMAIN` is set, Superwire automatically:

1. **Transforms URLs**: Converts Vercel Blob storage URLs to CDN URLs
2. **Applies Cache Headers**: Sets optimal cache times for audio files
3. **Health Monitoring**: Checks CDN availability every 5 minutes
4. **Fallback Logic**: Reverts to direct URLs if CDN fails

### Built-in Features

#### Smart Caching Strategy
- **Audio Files**: 1 day cache, 7 days stale-while-revalidate
- **Images**: 7 days cache
- **JSON/RSS**: 5 minutes cache for fresh content

#### URL Transformation
Original: `https://vsngpay3kxupz4wa.public.blob.vercel-storage.com/episodes/episode-2025-09-11.mp3`
CDN URL: `https://cdn.your-domain.com/audio/episodes/episode-2025-09-11.mp3`

#### Automatic Fallback
If CDN is down or returns errors, the system automatically:
- Detects failures via health checks
- Serves content directly from Vercel Blob
- Retries CDN after cooldown period

## Advanced Configuration

### Cache Purging

To enable cache purging capabilities:

1. **Get Cloudflare API Token**
   - Go to Cloudflare → My Profile → API Tokens
   - Create token with "Zone.Cache Purge" permission
   - Copy the token

2. **Get Zone ID**
   - Go to your domain's Cloudflare dashboard
   - Find Zone ID in the right sidebar
   - Copy the ID

3. **Add to Environment**
   ```bash
   CLOUDFLARE_API_TOKEN=your_api_token_here
   CLOUDFLARE_ZONE_ID=your_zone_id_here
   ```

### Custom Cache Rules

Modify cache behavior in `src/lib/cdn.ts`:

```typescript
const CacheStrategies = {
  AUDIO: 'public, max-age=86400, stale-while-revalidate=604800',  // 1d/7d
  IMAGE: 'public, max-age=604800, immutable',                      // 7 days
  JSON: 'public, max-age=300, must-revalidate'                     // 5 minutes
};
```

### Multiple CDN Support

The system supports multiple CDN providers:
- **Cloudflare** (recommended): Global edge network
- **Vercel Edge**: Built-in with Vercel Blob
- **Direct**: Bypass CDN for testing

## Performance Benefits

### With Cloudflare CDN Enabled

- **Reduced Latency**: Content served from nearest edge location
- **Lower Bandwidth Costs**: Cloudflare caches reduce origin requests
- **Better Reliability**: Multiple edge servers provide redundancy
- **Improved User Experience**: Faster audio playback start times

### Typical Performance Improvements

- **First Byte Time**: 50-200ms → 10-50ms
- **Audio Load Time**: 500ms-2s → 100-500ms
- **Geographic Performance**: Consistent globally vs variable

## Monitoring & Troubleshooting

### Check CDN Status

```typescript
// The CDN service includes built-in health checks
// Check logs for CDN status messages:
"CDN Health Check - Status: healthy"
"CDN Transformation: Applied Cloudflare CDN"
"CDN Fallback: Using direct URL due to CDN issues"
```

### Common Issues

#### CDN Not Working
- Verify `CLOUDFLARE_CDN_DOMAIN` is set correctly
- Check Cloudflare DNS records are proxied (orange cloud)
- Ensure domain is active in Cloudflare

#### Cache Not Updating
- Use cache purge API if configured
- Wait for TTL to expire (1 day for audio)
- Check Cloudflare cache rules

#### Fallback Activated
- Check CDN health endpoint
- Verify Cloudflare is not in "Under Attack" mode
- Check for rate limiting

## Cost Considerations

### Cloudflare Free Tier Includes
- Unlimited bandwidth
- Global CDN
- Basic DDoS protection
- SSL certificates

### When to Upgrade
Consider Cloudflare Pro ($20/month) for:
- Image optimization (Polish)
- Advanced cache analytics
- Priority support
- Enhanced security features

## Testing CDN Integration

### Development Testing

```bash
# Set environment variable
export CLOUDFLARE_CDN_DOMAIN=cdn.example.com

# Start development server
yarn dev

# Test audio playback
# Check network tab for CDN URLs
```

### Production Verification

1. Deploy to Vercel with CDN variables set
2. Check audio URLs in browser DevTools
3. Verify cache headers: `Cache-Control: public, max-age=86400`
4. Test from different geographic locations

## Integration Points

The CDN is automatically integrated with:

- **AudioPlayer Component**: Uses `getCDNUrlWithFallback()`
- **Episode API**: Returns CDN-enhanced URLs
- **RSS Feed**: Includes CDN URLs for podcast apps
- **Vercel Blob Storage**: Seamless URL transformation

## Best Practices

1. **Always Enable Fallback**: Keep `fallbackToDirectUrl: true`
2. **Monitor Health Checks**: Check logs for CDN issues
3. **Test Geographic Performance**: Use VPN to test different regions
4. **Set Appropriate TTLs**: Balance freshness vs performance
5. **Use Cache Purging Sparingly**: Only for critical updates

## Summary

Cloudflare CDN for Superwire is:
- ✅ **Already Implemented**: Full integration in codebase
- ✅ **Easy to Enable**: Just set `CLOUDFLARE_CDN_DOMAIN`
- ✅ **Production Ready**: Health checks, fallbacks, and monitoring
- ✅ **Cost Effective**: Free tier sufficient for most podcasts
- ✅ **Performance Optimized**: Smart caching for audio content

Simply add your Cloudflare domain to environment variables and enjoy faster global audio delivery!