// SMS Service - Interface for SMS providers
// Supports multiple providers: Twilio, OVH SMS, etc.

interface SMSConfig {
  provider: 'twilio' | 'ovh' | 'mock';
  twilioAccountSid?: string;
  twilioAuthToken?: string;
  twilioFromNumber?: string;
  ovhAppKey?: string;
  ovhAppSecret?: string;
  ovhConsumerKey?: string;
  ovhServiceName?: string;
  ovhSender?: string;
}

interface SMSResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const config: SMSConfig = {
  provider: (process.env.SMS_PROVIDER as SMSConfig['provider']) || 'mock',
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID,
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN,
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER,
  ovhAppKey: process.env.OVH_APP_KEY,
  ovhAppSecret: process.env.OVH_APP_SECRET,
  ovhConsumerKey: process.env.OVH_CONSUMER_KEY,
  ovhServiceName: process.env.OVH_SERVICE_NAME,
  ovhSender: process.env.OVH_SENDER || 'SolutionGS',
};

// Format phone number for France
const formatPhoneNumber = (phone: string): string => {
  // Remove spaces and special characters
  let cleaned = phone.replace(/[\s\-\.]/g, '');

  // Convert French format to international
  if (cleaned.startsWith('0')) {
    cleaned = '+33' + cleaned.slice(1);
  }

  // Add + if missing
  if (!cleaned.startsWith('+')) {
    cleaned = '+' + cleaned;
  }

  return cleaned;
};

// Send SMS via Twilio
const sendViaTwilio = async (to: string, message: string): Promise<SMSResult> => {
  try {
    const twilio = require('twilio');
    const client = twilio(config.twilioAccountSid, config.twilioAuthToken);

    const result = await client.messages.create({
      body: message,
      from: config.twilioFromNumber,
      to: formatPhoneNumber(to),
    });

    return {
      success: true,
      messageId: result.sid,
    };
  } catch (error: any) {
    console.error('Twilio SMS error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Send SMS via OVH
const sendViaOVH = async (to: string, message: string): Promise<SMSResult> => {
  try {
    // OVH SMS API integration
    const https = require('https');
    const crypto = require('crypto');

    const timestamp = Math.round(Date.now() / 1000);
    const body = JSON.stringify({
      charset: 'UTF-8',
      class: 'phoneDisplay',
      coding: '7bit',
      message: message,
      noStopClause: false,
      priority: 'high',
      receivers: [formatPhoneNumber(to)],
      sender: config.ovhSender,
      validityPeriod: 2880,
    });

    const method = 'POST';
    const path = `/1.0/sms/${config.ovhServiceName}/jobs`;
    const url = `https://eu.api.ovh.com${path}`;

    // Generate signature
    const toSign = [
      config.ovhAppSecret,
      config.ovhConsumerKey,
      method,
      url,
      body,
      timestamp,
    ].join('+');

    const signature = '$1$' + crypto.createHash('sha1').update(toSign).digest('hex');

    // Make request
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'X-Ovh-Application': config.ovhAppKey!,
        'X-Ovh-Timestamp': timestamp.toString(),
        'X-Ovh-Signature': signature,
        'X-Ovh-Consumer': config.ovhConsumerKey!,
      },
      body,
    });

    const result = await response.json();

    if (result.ids && result.ids.length > 0) {
      return {
        success: true,
        messageId: result.ids[0].toString(),
      };
    }

    return {
      success: false,
      error: result.message || 'Unknown OVH error',
    };
  } catch (error: any) {
    console.error('OVH SMS error:', error);
    return {
      success: false,
      error: error.message,
    };
  }
};

// Mock SMS for development
const sendViaMock = async (to: string, message: string): Promise<SMSResult> => {
  console.log('=== MOCK SMS ===');
  console.log(`To: ${formatPhoneNumber(to)}`);
  console.log(`Message: ${message}`);
  console.log('================');

  return {
    success: true,
    messageId: `mock-${Date.now()}`,
  };
};

// Main send function
export const sendSMS = async (to: string, message: string): Promise<SMSResult> => {
  // Validate phone number
  if (!to || to.length < 10) {
    return { success: false, error: 'Invalid phone number' };
  }

  // Validate message
  if (!message || message.length === 0) {
    return { success: false, error: 'Empty message' };
  }

  // Truncate message if too long (160 chars for single SMS)
  const truncatedMessage = message.length > 160 ? message.slice(0, 157) + '...' : message;

  switch (config.provider) {
    case 'twilio':
      return sendViaTwilio(to, truncatedMessage);
    case 'ovh':
      return sendViaOVH(to, truncatedMessage);
    case 'mock':
    default:
      return sendViaMock(to, truncatedMessage);
  }
};

// SMS Templates
export const smsTemplates = {
  appointmentReminder: (data: {
    companyName: string;
    date: string;
    time: string;
    commercialName: string;
  }) => `Rappel RDV: Demain ${data.date} à ${data.time}, notre conseiller ${data.commercialName} vous rencontrera. Solution GS`,

  appointmentConfirmation: (data: {
    date: string;
    time: string;
    commercialName: string;
  }) => `Votre RDV est confirmé pour le ${data.date} à ${data.time}. ${data.commercialName} vous contactera. Solution GS`,

  quoteReady: (data: {
    companyName: string;
  }) => `Bonjour, votre devis Solution GS est prêt. Nous vous recontacterons bientôt. Merci de votre confiance!`,

  installationScheduled: (data: {
    date: string;
    time: string;
  }) => `L'installation de votre système de sécurité est prévue le ${data.date} à ${data.time}. Solution GS`,

  paymentReminder: (data: {
    amount: string;
    dueDate: string;
  }) => `Rappel: Paiement de ${data.amount}€ attendu avant le ${data.dueDate}. Merci. Solution GS`,
};

export default {
  sendSMS,
  smsTemplates,
  formatPhoneNumber,
};
