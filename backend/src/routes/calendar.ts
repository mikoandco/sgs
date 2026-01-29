import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import googleCalendar from '../services/googleCalendar';

const prisma = new PrismaClient();
const router = Router();

// ============================================
// GOOGLE CALENDAR OAUTH
// ============================================

// Initiate Google OAuth flow
router.get('/google/connect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // Check if already connected
    const existing = await prisma.calendarIntegration.findUnique({
      where: { userId },
    });

    if (existing) {
      return res.status(400).json({ error: 'Google Calendar already connected' });
    }

    const authUrl = googleCalendar.getAuthUrl(userId);
    res.json({ url: authUrl });
  } catch (error) {
    console.error('Error initiating Google OAuth:', error);
    res.status(500).json({ error: 'Failed to initiate Google OAuth' });
  }
});

// OAuth callback from Google
router.get('/google/callback', async (req: Request, res: Response) => {
  try {
    const { code, state: userId, error: oauthError } = req.query;

    if (oauthError) {
      console.error('OAuth error:', oauthError);
      return res.redirect(`${process.env.FRONTEND_URL}/settings?error=oauth_denied`);
    }

    if (!code || !userId) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?error=missing_params`);
    }

    // Exchange code for tokens
    const tokens = await googleCalendar.getTokensFromCode(code as string);

    if (!tokens.access_token) {
      return res.redirect(`${process.env.FRONTEND_URL}/settings?error=no_token`);
    }

    // Get user email from Google
    const { google } = require('googleapis');
    const oauth2Client = googleCalendar.createOAuth2Client();
    oauth2Client.setCredentials(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const userInfo = await oauth2.userinfo.get();

    // Save integration
    await prisma.calendarIntegration.upsert({
      where: { userId: userId as string },
      update: {
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleEmail: userInfo.data.email,
      },
      create: {
        userId: userId as string,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token || undefined,
        expiresAt: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
        googleEmail: userInfo.data.email,
      },
    });

    // Setup webhook for real-time sync
    try {
      await googleCalendar.setupWebhook(userId as string);
    } catch (webhookError) {
      console.error('Error setting up webhook:', webhookError);
      // Non-blocking - continue even if webhook fails
    }

    // Sync existing appointments to Google
    await syncExistingAppointments(userId as string);

    res.redirect(`${process.env.FRONTEND_URL}/settings?tab=calendar&success=connected`);
  } catch (error) {
    console.error('Error in Google OAuth callback:', error);
    res.redirect(`${process.env.FRONTEND_URL}/settings?error=callback_failed`);
  }
});

// Disconnect Google Calendar
router.post('/google/disconnect', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    await googleCalendar.disconnectGoogle(userId);

    // Remove googleEventId from appointments
    await prisma.appointment.updateMany({
      where: {
        OR: [
          { commercialId: userId },
          { sdrId: userId },
        ],
      },
      data: { googleEventId: null },
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting Google Calendar:', error);
    res.status(500).json({ error: 'Failed to disconnect' });
  }
});

// Get integration status
router.get('/google/status', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const integration = await prisma.calendarIntegration.findUnique({
      where: { userId },
      select: {
        id: true,
        provider: true,
        googleEmail: true,
        syncEnabled: true,
        lastSyncAt: true,
        createdAt: true,
      },
    });

    if (!integration) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      ...integration,
    });
  } catch (error) {
    console.error('Error getting Google Calendar status:', error);
    res.status(500).json({ error: 'Failed to get status' });
  }
});

// Manual sync trigger
router.post('/google/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    const integration = await prisma.calendarIntegration.findUnique({
      where: { userId },
    });

    if (!integration) {
      return res.status(400).json({ error: 'Google Calendar not connected' });
    }

    // Sync from Google to CRM
    await googleCalendar.syncFromGoogle(userId);

    // Sync from CRM to Google
    await syncExistingAppointments(userId);

    res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error syncing with Google Calendar:', error);
    res.status(500).json({ error: 'Sync failed' });
  }
});

// Toggle sync enabled
router.put('/google/settings', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { syncEnabled } = req.body;

    const integration = await prisma.calendarIntegration.update({
      where: { userId },
      data: { syncEnabled },
    });

    res.json({ syncEnabled: integration.syncEnabled });
  } catch (error) {
    console.error('Error updating calendar settings:', error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============================================
// GOOGLE WEBHOOK
// ============================================

// Webhook endpoint for Google Calendar push notifications
router.post('/google/webhook', async (req: Request, res: Response) => {
  try {
    // Google sends verification headers
    const channelId = req.headers['x-goog-channel-id'];
    const resourceState = req.headers['x-goog-resource-state'];
    const token = req.headers['x-goog-channel-token']; // userId

    console.log('Google webhook received:', { channelId, resourceState, token });

    // Acknowledge immediately (Google requires fast response)
    res.status(200).send('OK');

    // Skip sync notification (initial setup)
    if (resourceState === 'sync') {
      return;
    }

    // Process in background
    if (token && typeof token === 'string') {
      setImmediate(async () => {
        try {
          await googleCalendar.syncFromGoogle(token);
        } catch (error) {
          console.error('Error processing webhook:', error);
        }
      });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(200).send('OK'); // Always return 200 to prevent retries
  }
});

// ============================================
// ICAL FEED (for external calendars)
// ============================================

// Generate iCal feed URL
router.get('/ical/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const { token } = req.query;

    // Simple token validation (in production, use proper JWT)
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return res.status(404).send('Calendar not found');
    }

    // Get user's appointments
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { commercialId: userId },
          { sdrId: userId },
        ],
        scheduledAt: {
          gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // Next 90 days
        },
      },
      include: {
        prospect: {
          select: {
            companyName: true,
            address: true,
            city: true,
            decisionMakerName: true,
          },
        },
      },
      orderBy: { scheduledAt: 'asc' },
    });

    // Generate iCal
    const ical = generateICal(appointments, user);

    res.set({
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': 'attachment; filename="calendar.ics"',
    });
    res.send(ical);
  } catch (error) {
    console.error('Error generating iCal:', error);
    res.status(500).send('Failed to generate calendar');
  }
});

// ============================================
// HELPER FUNCTIONS
// ============================================

// Sync existing CRM appointments to Google Calendar
async function syncExistingAppointments(userId: string): Promise<void> {
  try {
    const appointments = await prisma.appointment.findMany({
      where: {
        OR: [
          { commercialId: userId },
          { sdrId: userId },
        ],
        googleEventId: null,
        status: { in: ['SCHEDULED', 'CONFIRMED'] },
        scheduledAt: { gte: new Date() },
      },
      include: {
        prospect: {
          select: {
            companyName: true,
            address: true,
            city: true,
            decisionMakerName: true,
            decisionMakerMobile: true,
          },
        },
      },
    });

    for (const appointment of appointments) {
      const googleEventId = await googleCalendar.createGoogleEvent(userId, {
        id: appointment.id,
        scheduledAt: appointment.scheduledAt,
        duration: appointment.duration,
        prospect: appointment.prospect,
        notes: appointment.notes,
      });

      if (googleEventId) {
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { googleEventId },
        });
      }
    }

    console.log(`Synced ${appointments.length} appointments to Google for user:`, userId);
  } catch (error) {
    console.error('Error syncing existing appointments:', error);
  }
}

// Generate iCal format
function generateICal(appointments: any[], user: { firstName: string; lastName: string }): string {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Solution GS//CRM Calendar//FR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:RDV - ${user.firstName} ${user.lastName}`,
    'X-WR-TIMEZONE:Europe/Paris',
  ];

  for (const apt of appointments) {
    const start = new Date(apt.scheduledAt);
    const end = new Date(start.getTime() + apt.duration * 60000);

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${apt.id}@solutionsg.fr`);
    lines.push(`DTSTAMP:${formatICalDate(new Date())}`);
    lines.push(`DTSTART:${formatICalDate(start)}`);
    lines.push(`DTEND:${formatICalDate(end)}`);
    lines.push(`SUMMARY:RDV - ${apt.prospect.companyName}`);
    lines.push(`LOCATION:${apt.prospect.address}, ${apt.prospect.city}`);
    lines.push(`DESCRIPTION:Contact: ${apt.prospect.decisionMakerName}${apt.notes ? '\\n' + apt.notes : ''}`);
    lines.push(`STATUS:${apt.status === 'CANCELLED' ? 'CANCELLED' : 'CONFIRMED'}`);
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function formatICalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

export default router;
