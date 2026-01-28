import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import { sendEmail, emailTemplates } from '../services/email';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// In-memory notification store (in production, use Redis or database)
interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}

const notifications: Notification[] = [];

// ---------------------------------------------------------------------------
// Helper: Create notification
// ---------------------------------------------------------------------------
export async function createNotification(data: {
  userId: string;
  type: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
  sendEmail?: boolean;
}): Promise<Notification> {
  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    read: false,
    metadata: data.metadata,
    createdAt: new Date(),
  };

  notifications.push(notification);

  // Keep only last 1000 notifications per user
  const userNotifs = notifications.filter(n => n.userId === data.userId);
  if (userNotifs.length > 1000) {
    const toRemove = userNotifs.slice(0, userNotifs.length - 1000);
    toRemove.forEach(n => {
      const idx = notifications.indexOf(n);
      if (idx > -1) notifications.splice(idx, 1);
    });
  }

  // Send email notification if requested
  if (data.sendEmail) {
    const user = await prisma.user.findUnique({ where: { id: data.userId } });
    if (user) {
      await sendEmail({
        to: user.email,
        subject: data.title,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #2563eb;">Solution GS</h1>
            <h2>${data.title}</h2>
            <p>${data.message}</p>
            <p style="color: #666; margin-top: 30px;">
              Connectez-vous au CRM pour plus de détails.
            </p>
          </div>
        `,
      });
    }
  }

  return notification;
}

// ---------------------------------------------------------------------------
// GET / - Get user notifications
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { unreadOnly, limit = '50' } = req.query;
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 50));

    let userNotifications = notifications
      .filter(n => n.userId === req.userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    if (unreadOnly === 'true') {
      userNotifications = userNotifications.filter(n => !n.read);
    }

    userNotifications = userNotifications.slice(0, limitNum);

    const unreadCount = notifications.filter(n => n.userId === req.userId && !n.read).length;

    res.json({
      data: userNotifications,
      unreadCount,
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
  }
});

// ---------------------------------------------------------------------------
// GET /unread-count - Get unread notification count
// ---------------------------------------------------------------------------
router.get('/unread-count', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const count = notifications.filter(n => n.userId === req.userId && !n.read).length;
    res.json({ data: { count } });
  } catch (error) {
    console.error('Error fetching unread count:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id/read - Mark notification as read
// ---------------------------------------------------------------------------
router.put('/:id/read', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const notification = notifications.find(n => n.id === id && n.userId === req.userId);
    if (!notification) {
      res.status(404).json({ error: 'Notification non trouvée' });
      return;
    }

    notification.read = true;

    res.json({ data: notification });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// ---------------------------------------------------------------------------
// PUT /read-all - Mark all notifications as read
// ---------------------------------------------------------------------------
router.put('/read-all', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    notifications
      .filter(n => n.userId === req.userId && !n.read)
      .forEach(n => { n.read = true; });

    res.json({ message: 'Toutes les notifications ont été marquées comme lues' });
  } catch (error) {
    console.error('Error marking all as read:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete notification
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const idx = notifications.findIndex(n => n.id === id && n.userId === req.userId);
    if (idx === -1) {
      res.status(404).json({ error: 'Notification non trouvée' });
      return;
    }

    notifications.splice(idx, 1);

    res.json({ message: 'Notification supprimée' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

// ---------------------------------------------------------------------------
// POST /send-email - Send email manually
// ---------------------------------------------------------------------------
router.post('/send-email', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { to, template, data } = req.body;

    if (!to || !template) {
      res.status(400).json({ error: 'to et template sont requis' });
      return;
    }

    const templateFn = emailTemplates[template as keyof typeof emailTemplates];
    if (!templateFn) {
      res.status(400).json({ error: 'Template non trouvé' });
      return;
    }

    const emailContent = templateFn(data);
    const sent = await sendEmail({
      to,
      subject: emailContent.subject,
      html: emailContent.html,
    });

    if (sent) {
      res.json({ message: 'Email envoyé' });
    } else {
      res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ error: 'Erreur lors de l\'envoi de l\'email' });
  }
});

// ---------------------------------------------------------------------------
// POST /test - Send test notification (for development)
// ---------------------------------------------------------------------------
router.post('/test', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const notification = await createNotification({
      userId: req.userId!,
      type: 'test',
      title: 'Notification de test',
      message: 'Ceci est une notification de test pour vérifier le système.',
    });

    res.json({ data: notification });
  } catch (error) {
    console.error('Error creating test notification:', error);
    res.status(500).json({ error: 'Erreur' });
  }
});

export default router;
export { createNotification as notifyUser };
