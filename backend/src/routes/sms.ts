import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import smsService from '../services/sms';

const router = Router();
const prisma = new PrismaClient();

// Send SMS to a prospect
router.post('/send', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { prospectId, phone, message, template, templateData } = req.body;

    let phoneNumber = phone;
    let finalMessage = message;

    // Get phone from prospect if prospectId provided
    if (prospectId && !phone) {
      const prospect = await prisma.prospect.findUnique({
        where: { id: prospectId },
        select: { decisionMakerMobile: true },
      });

      if (!prospect) {
        return res.status(404).json({ error: 'Prospect not found' });
      }

      phoneNumber = prospect.decisionMakerMobile;
    }

    if (!phoneNumber) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    // Use template if provided
    if (template && templateData) {
      const templateFn = smsService.smsTemplates[template as keyof typeof smsService.smsTemplates];
      if (templateFn) {
        finalMessage = templateFn(templateData);
      }
    }

    if (!finalMessage) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const result = await smsService.sendSMS(phoneNumber, finalMessage);

    // Log SMS in database
    if (prospectId) {
      await prisma.timelineEntry.create({
        data: {
          prospectId,
          userId: req.userId!,
          type: 'SMS',
          content: `SMS envoyé: ${finalMessage.slice(0, 50)}...`,
        },
      });
    }

    if (result.success) {
      res.json({
        success: true,
        messageId: result.messageId,
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    console.error('Error sending SMS:', error);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// Send bulk SMS
router.post('/send-bulk', authenticate, authorize('ADMIN', 'DIRECTION'), async (req: AuthRequest, res: Response) => {
  try {
    const { prospectIds, message, template, templateData } = req.body;

    if (!prospectIds || !Array.isArray(prospectIds) || prospectIds.length === 0) {
      return res.status(400).json({ error: 'Prospect IDs required' });
    }

    const prospects = await prisma.prospect.findMany({
      where: { id: { in: prospectIds } },
      select: { id: true, decisionMakerMobile: true, companyName: true },
    });

    const results = {
      total: prospects.length,
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    for (const prospect of prospects) {
      if (!prospect.decisionMakerMobile) {
        results.failed++;
        results.errors.push(`${prospect.companyName}: No phone number`);
        continue;
      }

      let finalMessage = message;

      // Use template if provided
      if (template && templateData) {
        const templateFn = smsService.smsTemplates[template as keyof typeof smsService.smsTemplates];
        if (templateFn) {
          finalMessage = templateFn({ ...templateData, companyName: prospect.companyName });
        }
      }

      const result = await smsService.sendSMS(prospect.decisionMakerMobile, finalMessage);

      if (result.success) {
        results.sent++;

        // Log SMS
        await prisma.timelineEntry.create({
          data: {
            prospectId: prospect.id,
            userId: req.userId!,
            type: 'SMS',
            content: `SMS envoyé: ${finalMessage.slice(0, 50)}...`,
          },
        });
      } else {
        results.failed++;
        results.errors.push(`${prospect.companyName}: ${result.error}`);
      }

      // Rate limiting - wait between sends
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    res.json(results);
  } catch (error) {
    console.error('Error sending bulk SMS:', error);
    res.status(500).json({ error: 'Failed to send bulk SMS' });
  }
});

// Send appointment reminder SMS
router.post('/reminder/:appointmentId', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { appointmentId } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        prospect: {
          select: {
            companyName: true,
            decisionMakerMobile: true,
          },
        },
        commercial: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    if (!appointment.prospect.decisionMakerMobile) {
      return res.status(400).json({ error: 'Prospect has no phone number' });
    }

    const appointmentDate = new Date(appointment.scheduledAt);
    const message = smsService.smsTemplates.appointmentReminder({
      companyName: appointment.prospect.companyName,
      date: appointmentDate.toLocaleDateString('fr-FR'),
      time: appointmentDate.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      commercialName: `${appointment.commercial.firstName} ${appointment.commercial.lastName}`,
    });

    const result = await smsService.sendSMS(appointment.prospect.decisionMakerMobile, message);

    if (result.success) {
      // Log SMS
      await prisma.timelineEntry.create({
        data: {
          prospectId: appointment.prospectId,
          userId: req.userId!,
          type: 'SMS',
          content: 'Rappel de RDV envoyé par SMS',
        },
      });

      res.json({ success: true, messageId: result.messageId });
    } else {
      res.status(500).json({ success: false, error: result.error });
    }
  } catch (error) {
    console.error('Error sending reminder SMS:', error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// Get available SMS templates
router.get('/templates', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    templates: [
      { id: 'appointmentReminder', name: 'Rappel de RDV', description: 'Rappel automatique 24h avant' },
      { id: 'appointmentConfirmation', name: 'Confirmation de RDV', description: 'Confirmation de prise de RDV' },
      { id: 'quoteReady', name: 'Devis prêt', description: 'Notification devis disponible' },
      { id: 'installationScheduled', name: 'Installation prévue', description: 'Confirmation date installation' },
      { id: 'paymentReminder', name: 'Rappel paiement', description: 'Rappel échéance' },
    ],
  });
});

export default router;
