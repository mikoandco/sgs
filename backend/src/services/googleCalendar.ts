import { google, calendar_v3 } from 'googleapis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Google OAuth2 Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3001/api/calendar/google/callback';

// Create OAuth2 client
export const createOAuth2Client = () => {
  return new google.auth.OAuth2(
    GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET,
    GOOGLE_REDIRECT_URI
  );
};

// Generate authorization URL
export const getAuthUrl = (userId: string): string => {
  const oauth2Client = createOAuth2Client();

  const scopes = [
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/calendar.events',
  ];

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: userId, // Pass userId to identify user after callback
    prompt: 'consent', // Force consent to get refresh token
  });
};

// Exchange code for tokens
export const getTokensFromCode = async (code: string) => {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  return tokens;
};

// Get authenticated OAuth2 client for a user
export const getAuthenticatedClient = async (userId: string) => {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId },
  });

  if (!integration) {
    throw new Error('No Google Calendar integration found for user');
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({
    access_token: integration.accessToken,
    refresh_token: integration.refreshToken,
    expiry_date: integration.expiresAt?.getTime(),
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.access_token) {
      await prisma.calendarIntegration.update({
        where: { userId },
        data: {
          accessToken: tokens.access_token,
          expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        },
      });
    }
  });

  return oauth2Client;
};

// Get Google Calendar API instance
export const getCalendarApi = async (userId: string): Promise<calendar_v3.Calendar> => {
  const auth = await getAuthenticatedClient(userId);
  return google.calendar({ version: 'v3', auth });
};

// Create event in Google Calendar
export const createGoogleEvent = async (
  userId: string,
  appointment: {
    id: string;
    scheduledAt: Date;
    duration: number;
    prospect: {
      companyName: string;
      address: string;
      city: string;
      decisionMakerName: string;
      decisionMakerMobile: string;
    };
    notes?: string | null;
  }
): Promise<string | null> => {
  try {
    const calendar = await getCalendarApi(userId);

    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + appointment.duration * 60000);

    const event: calendar_v3.Schema$Event = {
      summary: `RDV - ${appointment.prospect.companyName}`,
      description: `
Client: ${appointment.prospect.companyName}
Contact: ${appointment.prospect.decisionMakerName}
Téléphone: ${appointment.prospect.decisionMakerMobile}
${appointment.notes ? `Notes: ${appointment.notes}` : ''}

---
Créé depuis CRM Solution GS
ID: ${appointment.id}
      `.trim(),
      location: `${appointment.prospect.address}, ${appointment.prospect.city}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Paris',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Paris',
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'email', minutes: 1440 }, // 24h before
        ],
      },
      extendedProperties: {
        private: {
          crmAppointmentId: appointment.id,
          source: 'solution-gs-crm',
        },
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return response.data.id || null;
  } catch (error) {
    console.error('Error creating Google Calendar event:', error);
    return null;
  }
};

// Update event in Google Calendar
export const updateGoogleEvent = async (
  userId: string,
  googleEventId: string,
  appointment: {
    scheduledAt: Date;
    duration: number;
    prospect: {
      companyName: string;
      address: string;
      city: string;
      decisionMakerName: string;
      decisionMakerMobile: string;
    };
    notes?: string | null;
    status: string;
  }
): Promise<boolean> => {
  try {
    const calendar = await getCalendarApi(userId);

    const startTime = new Date(appointment.scheduledAt);
    const endTime = new Date(startTime.getTime() + appointment.duration * 60000);

    const event: calendar_v3.Schema$Event = {
      summary: `RDV - ${appointment.prospect.companyName}`,
      description: `
Client: ${appointment.prospect.companyName}
Contact: ${appointment.prospect.decisionMakerName}
Téléphone: ${appointment.prospect.decisionMakerMobile}
Statut: ${appointment.status}
${appointment.notes ? `Notes: ${appointment.notes}` : ''}

---
Mis à jour depuis CRM Solution GS
      `.trim(),
      location: `${appointment.prospect.address}, ${appointment.prospect.city}`,
      start: {
        dateTime: startTime.toISOString(),
        timeZone: 'Europe/Paris',
      },
      end: {
        dateTime: endTime.toISOString(),
        timeZone: 'Europe/Paris',
      },
    };

    await calendar.events.update({
      calendarId: 'primary',
      eventId: googleEventId,
      requestBody: event,
    });

    return true;
  } catch (error) {
    console.error('Error updating Google Calendar event:', error);
    return false;
  }
};

// Delete event from Google Calendar
export const deleteGoogleEvent = async (
  userId: string,
  googleEventId: string
): Promise<boolean> => {
  try {
    const calendar = await getCalendarApi(userId);

    await calendar.events.delete({
      calendarId: 'primary',
      eventId: googleEventId,
    });

    return true;
  } catch (error) {
    console.error('Error deleting Google Calendar event:', error);
    return false;
  }
};

// Setup webhook for Google Calendar push notifications
export const setupWebhook = async (userId: string): Promise<void> => {
  try {
    const calendar = await getCalendarApi(userId);
    const webhookUrl = process.env.GOOGLE_WEBHOOK_URL || `${process.env.BACKEND_URL}/api/calendar/google/webhook`;

    // Create a unique channel ID
    const channelId = `crm-${userId}-${Date.now()}`;

    // Watch for changes
    const response = await calendar.events.watch({
      calendarId: 'primary',
      requestBody: {
        id: channelId,
        type: 'web_hook',
        address: webhookUrl,
        token: userId, // Used to identify user in webhook
        expiration: String(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Store channel info for later management
    await prisma.calendarIntegration.update({
      where: { userId },
      data: {
        webhookChannelId: response.data.id,
        webhookResourceId: response.data.resourceId,
        webhookExpiration: response.data.expiration ? new Date(parseInt(response.data.expiration)) : null,
      },
    });

    console.log('Google Calendar webhook setup successful for user:', userId);
  } catch (error) {
    console.error('Error setting up Google Calendar webhook:', error);
  }
};

// Sync events from Google Calendar to CRM
export const syncFromGoogle = async (userId: string): Promise<void> => {
  try {
    const calendar = await getCalendarApi(userId);
    const integration = await prisma.calendarIntegration.findUnique({
      where: { userId },
    });

    if (!integration) return;

    // Get events modified since last sync
    const params: calendar_v3.Params$Resource$Events$List = {
      calendarId: 'primary',
      singleEvents: true,
      orderBy: 'updated',
      maxResults: 100,
    };

    if (integration.lastSyncToken) {
      params.syncToken = integration.lastSyncToken;
    } else {
      // First sync - get events from now
      params.timeMin = new Date().toISOString();
    }

    const response = await calendar.events.list(params);
    const events = response.data.items || [];

    for (const event of events) {
      // Skip events not created by CRM
      const crmId = event.extendedProperties?.private?.crmAppointmentId;

      if (event.status === 'cancelled') {
        // Event was deleted in Google
        if (crmId) {
          await prisma.appointment.update({
            where: { id: crmId },
            data: { status: 'CANCELLED' },
          });
        }
        continue;
      }

      // If event was created in Google (not from CRM), we could create it in CRM
      // For now, we only sync CRM-created events
      if (crmId) {
        const startTime = event.start?.dateTime || event.start?.date;
        if (startTime) {
          await prisma.appointment.update({
            where: { id: crmId },
            data: {
              scheduledAt: new Date(startTime),
              notes: event.description || undefined,
            },
          });
        }
      }
    }

    // Save sync token for incremental sync
    if (response.data.nextSyncToken) {
      await prisma.calendarIntegration.update({
        where: { userId },
        data: {
          lastSyncToken: response.data.nextSyncToken,
          lastSyncAt: new Date(),
        },
      });
    }

    console.log(`Synced ${events.length} events from Google Calendar for user:`, userId);
  } catch (error: any) {
    // If sync token is invalid, reset and do full sync
    if (error.code === 410) {
      await prisma.calendarIntegration.update({
        where: { userId },
        data: { lastSyncToken: null },
      });
      await syncFromGoogle(userId);
      return;
    }
    console.error('Error syncing from Google Calendar:', error);
  }
};

// Get user's Google Calendar info
export const getCalendarInfo = async (userId: string) => {
  try {
    const calendar = await getCalendarApi(userId);
    const response = await calendar.calendars.get({ calendarId: 'primary' });
    return response.data;
  } catch (error) {
    console.error('Error getting calendar info:', error);
    return null;
  }
};

// Disconnect Google Calendar
export const disconnectGoogle = async (userId: string): Promise<void> => {
  const integration = await prisma.calendarIntegration.findUnique({
    where: { userId },
  });

  if (integration) {
    // Stop webhook if exists
    if (integration.webhookChannelId && integration.webhookResourceId) {
      try {
        const calendar = await getCalendarApi(userId);
        await calendar.channels.stop({
          requestBody: {
            id: integration.webhookChannelId,
            resourceId: integration.webhookResourceId,
          },
        });
      } catch (error) {
        console.error('Error stopping webhook:', error);
      }
    }

    // Revoke tokens
    try {
      const oauth2Client = createOAuth2Client();
      oauth2Client.setCredentials({ access_token: integration.accessToken });
      await oauth2Client.revokeCredentials();
    } catch (error) {
      console.error('Error revoking tokens:', error);
    }

    // Delete integration record
    await prisma.calendarIntegration.delete({
      where: { userId },
    });
  }
};

export default {
  createOAuth2Client,
  getAuthUrl,
  getTokensFromCode,
  createGoogleEvent,
  updateGoogleEvent,
  deleteGoogleEvent,
  setupWebhook,
  syncFromGoogle,
  getCalendarInfo,
  disconnectGoogle,
};
