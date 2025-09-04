/**
 * Notification system for Superwire error reporting and alerts
 * 
 * Provides email and webhook notifications for failures and critical events.
 * Uses established patterns from OpenRouter/ElevenLabs for HTTP requests and
 * integrates with the EnhancedError system from error-handler.ts.
 */

import { EnhancedError, ErrorCategory } from './error-handler';

/**
 * Notification result interface
 */
export interface NotificationResult {
  success: boolean;
  method: 'discord' | 'sendgrid' | 'none';
  error?: string;
  duration: number;
}

/**
 * Notification context for error reporting
 */
export interface NotificationContext {
  system: string;
  operation: string;
  timestamp: string;
  environment?: string;
  userId?: string;
  requestId?: string;
  version?: string;
  costs?: {
    estimated: number;
    actual?: number;
  };
  metadata?: Record<string, any>;
}

/**
 * Discord webhook payload structure
 */
interface DiscordWebhookPayload {
  embeds: Array<{
    title: string;
    description: string;
    color: number;
    fields: Array<{
      name: string;
      value: string;
      inline?: boolean;
    }>;
    timestamp: string;
  }>;
}

/**
 * SendGrid email payload structure
 */
interface SendGridEmailPayload {
  personalizations: Array<{
    to: Array<{ email: string; name?: string }>;
  }>;
  from: {
    email: string;
    name?: string;
  };
  subject: string;
  content: Array<{
    type: 'text/html';
    value: string;
  }>;
}

/**
 * Color codes for different error categories (Discord)
 */
const ERROR_COLORS: Record<ErrorCategory, number> = {
  [ErrorCategory.TIMEOUT]: 0xff9500, // Orange
  [ErrorCategory.RATE_LIMIT]: 0xffff00, // Yellow  
  [ErrorCategory.AUTHENTICATION]: 0xff0000, // Red
  [ErrorCategory.NETWORK]: 0x0099ff, // Blue
  [ErrorCategory.API_ERROR]: 0xff0000, // Red
  [ErrorCategory.VALIDATION]: 0xff6600, // Orange-red
  [ErrorCategory.QUOTA_EXCEEDED]: 0xff3300, // Dark red
  [ErrorCategory.UNKNOWN]: 0x666666, // Gray
};

/**
 * Send Discord webhook notification
 * Following fetch() patterns from OpenRouter/ElevenLabs
 */
async function sendDiscordWebhook(
  error: EnhancedError,
  context: NotificationContext
): Promise<NotificationResult> {
  const startTime = Date.now();
  const webhookUrl = process.env.DISCORD_WEBHOOK_URL;
  
  if (!webhookUrl) {
    return {
      success: false,
      method: 'discord',
      error: 'DISCORD_WEBHOOK_URL not configured',
      duration: Date.now() - startTime
    };
  }

  try {
    const payload: DiscordWebhookPayload = {
      embeds: [{
        title: `🚨 Superwire Error: ${error.category}`,
        description: error.message,
        color: ERROR_COLORS[error.category],
        timestamp: context.timestamp,
        fields: [
          {
            name: 'System',
            value: context.system,
            inline: true
          },
          {
            name: 'Operation', 
            value: context.operation,
            inline: true
          },
          {
            name: 'Attempts',
            value: error.attempt.toString(),
            inline: true
          },
          {
            name: 'Status Code',
            value: error.statusCode?.toString() || 'N/A',
            inline: true
          },
          {
            name: 'Retryable',
            value: error.isRetryable ? '✅ Yes' : '❌ No',
            inline: true
          },
          {
            name: 'Environment',
            value: context.environment || process.env.NODE_ENV || 'unknown',
            inline: true
          }
        ]
      }]
    };

    // Add cost information if available
    if (context.costs) {
      payload.embeds[0].fields.push({
        name: 'Estimated Cost',
        value: `$${context.costs.estimated.toFixed(4)}`,
        inline: true
      });
    }

    // Add metadata fields if present
    if (context.metadata) {
      const metadataString = Object.entries(context.metadata)
        .slice(0, 3) // Limit to prevent message being too long
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n');
      
      if (metadataString) {
        payload.embeds[0].fields.push({
          name: 'Metadata',
          value: metadataString,
          inline: false
        });
      }
    }

    // Following established fetch patterns from openrouter.ts
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Superwire/1.0 (Error Notification)',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Discord API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return {
      success: true,
      method: 'discord',
      duration: Date.now() - startTime
    };

  } catch (sendError) {
    return {
      success: false,
      method: 'discord',
      error: sendError instanceof Error ? sendError.message : 'Unknown Discord error',
      duration: Date.now() - startTime
    };
  }
}

/**
 * Send SendGrid email notification
 * Following fetch() patterns with Bearer token authentication
 */
async function sendSendGridEmail(
  error: EnhancedError,
  context: NotificationContext
): Promise<NotificationResult> {
  const startTime = Date.now();
  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail = process.env.SENDGRID_FROM_EMAIL || 'alerts@superwire.news';
  const toEmail = process.env.SENDGRID_TO_EMAIL || 'admin@superwire.news';
  
  if (!apiKey) {
    return {
      success: false,
      method: 'sendgrid',
      error: 'SENDGRID_API_KEY not configured',
      duration: Date.now() - startTime
    };
  }

  try {
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #d63031;">🚨 Superwire Error Alert</h1>
        <h2>Error Details</h2>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Category:</td><td style="padding: 8px; border: 1px solid #ddd;">${error.category}</td></tr>
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Message:</td><td style="padding: 8px; border: 1px solid #ddd;">${error.message}</td></tr>
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">System:</td><td style="padding: 8px; border: 1px solid #ddd;">${context.system}</td></tr>
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Operation:</td><td style="padding: 8px; border: 1px solid #ddd;">${context.operation}</td></tr>
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Timestamp:</td><td style="padding: 8px; border: 1px solid #ddd;">${context.timestamp}</td></tr>
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Attempts:</td><td style="padding: 8px; border: 1px solid #ddd;">${error.attempt}</td></tr>
          <tr><td style="font-weight: bold; padding: 8px; border: 1px solid #ddd;">Retryable:</td><td style="padding: 8px; border: 1px solid #ddd;">${error.isRetryable ? 'Yes' : 'No'}</td></tr>
        </table>
        
        ${context.costs ? `
          <h3>Cost Information</h3>
          <p>Estimated Cost: $${context.costs.estimated.toFixed(4)}</p>
        ` : ''}
        
        ${context.metadata ? `
          <h3>Additional Context</h3>
          <pre style="background: #f8f9fa; padding: 15px; border-radius: 4px; overflow: auto;">${JSON.stringify(context.metadata, null, 2)}</pre>
        ` : ''}
        
        <hr style="margin: 30px 0;">
        <p style="color: #636e72; font-size: 14px;">
          This is an automated alert from the Superwire content generation system.
        </p>
      </div>
    `;

    const payload: SendGridEmailPayload = {
      personalizations: [{
        to: [{ email: toEmail, name: 'Superwire Admin' }]
      }],
      from: {
        email: fromEmail,
        name: 'Superwire Alerts'
      },
      subject: `🚨 Superwire Error: ${error.category} in ${context.system}`,
      content: [{
        type: 'text/html',
        value: htmlContent
      }]
    };

    // Following established Bearer token pattern from openrouter.ts
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Superwire/1.0 (Error Notification)',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`SendGrid API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return {
      success: true,
      method: 'sendgrid',
      duration: Date.now() - startTime
    };

  } catch (sendError) {
    return {
      success: false,
      method: 'sendgrid',
      error: sendError instanceof Error ? sendError.message : 'Unknown SendGrid error',
      duration: Date.now() - startTime
    };
  }
}

/**
 * Main notification function - tries Discord first, falls back to email
 * 
 * @param error - Enhanced error object with categorization and context
 * @param context - Notification context with system information
 * @returns Promise with notification result
 */
export async function notifyFailure(
  error: EnhancedError,
  context: NotificationContext
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];
  
  console.log(`📢 Sending failure notification: ${error.category} - ${error.message}`);

  // Enhance context with default values
  const enhancedContext: NotificationContext = {
    ...context,
    timestamp: context.timestamp || new Date().toISOString(),
    environment: context.environment || process.env.NODE_ENV || 'unknown',
    version: context.version || process.env.npm_package_version || '1.0.0'
  };

  // Try Discord webhook first (faster, more reliable)
  const discordResult = await sendDiscordWebhook(error, enhancedContext);
  results.push(discordResult);

  if (discordResult.success) {
    console.log('✅ Discord notification sent successfully');
  } else {
    console.warn(`⚠️ Discord notification failed: ${discordResult.error}`);
    
    // Fall back to email if Discord fails
    const emailResult = await sendSendGridEmail(error, enhancedContext);
    results.push(emailResult);
    
    if (emailResult.success) {
      console.log('✅ Email notification sent successfully (fallback)');
    } else {
      console.error(`❌ All notifications failed. Email error: ${emailResult.error}`);
    }
  }

  return results;
}

/**
 * Quick notification for simple error strings
 */
export async function notifyError(
  errorMessage: string,
  system: string,
  operation: string,
  category: ErrorCategory = ErrorCategory.UNKNOWN
): Promise<NotificationResult[]> {
  const error = new EnhancedError(errorMessage, category);
  const context: NotificationContext = {
    system,
    operation,
    timestamp: new Date().toISOString()
  };
  
  return notifyFailure(error, context);
}

/**
 * Test notification system
 */
export async function testNotifications(): Promise<boolean> {
  console.log('🧪 Testing notification system...');
  
  const testError = new EnhancedError(
    'This is a test notification - please ignore',
    ErrorCategory.UNKNOWN,
    undefined,
    1,
    { test: true },
    undefined,
    false
  );
  
  const testContext: NotificationContext = {
    system: 'notification-test',
    operation: 'test_notifications',
    timestamp: new Date().toISOString(),
    environment: 'test',
    costs: { estimated: 0.001 },
    metadata: {
      testRun: true,
      timestamp: Date.now()
    }
  };

  const results = await notifyFailure(testError, testContext);
  const success = results.some(result => result.success);
  
  console.log(`📊 Notification test results:`);
  results.forEach(result => {
    console.log(`  ${result.method}: ${result.success ? 'SUCCESS' : 'FAILED'} (${result.duration}ms)`);
    if (!result.success) {
      console.log(`    Error: ${result.error}`);
    }
  });
  
  return success;
}

/**
 * Get notification configuration status
 */
export function getNotificationConfig(): {
  discord: boolean;
  sendgrid: boolean;
  configured: boolean;
} {
  const discord = !!process.env.DISCORD_WEBHOOK_URL;
  const sendgrid = !!(process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM_EMAIL);
  
  return {
    discord,
    sendgrid,
    configured: discord || sendgrid
  };
}