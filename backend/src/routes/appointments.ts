import { Router, Response } from 'express';
import { PrismaClient, Prisma } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { AppointmentStatus, DayOfWeek, ProspectStatus } from '../types/enums';

const router = Router();
const prisma = new PrismaClient();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const DAY_OF_WEEK_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

const DAY_LABELS: Record<string, string> = {
  MONDAY: 'lundi',
  TUESDAY: 'mardi',
  WEDNESDAY: 'mercredi',
  THURSDAY: 'jeudi',
  FRIDAY: 'vendredi',
  SATURDAY: 'samedi',
  SUNDAY: 'dimanche',
};

// Shared include clause for prospect, commercial, sdr
const appointmentIncludes = {
  prospect: {
    select: {
      id: true,
      companyName: true,
      address: true,
      postalCode: true,
      city: true,
      lat: true,
      lng: true,
      decisionMakerName: true,
      decisionMakerMobile: true,
    },
  },
  commercial: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
  sdr: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
    },
  },
};

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List appointments with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      commercialId,
      sdrId,
      status,
      date,
      startDate,
      endDate,
    } = req.query;

    const where: Record<string, unknown> = {};

    if (commercialId) {
      where.commercialId = commercialId as string;
    }

    if (sdrId) {
      where.sdrId = sdrId as string;
    }

    if (status) {
      where.status = status as AppointmentStatus;
    }

    // Specific date filter
    if (date) {
      const targetDate = new Date(date as string);
      const dayStart = new Date(targetDate);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(targetDate);
      dayEnd.setUTCHours(23, 59, 59, 999);
      where.scheduledAt = { gte: dayStart, lte: dayEnd };
    } else if (startDate || endDate) {
      // Date range filter
      const scheduledAtFilter: Record<string, Date> = {};
      if (startDate) scheduledAtFilter.gte = new Date(startDate as string);
      if (endDate) scheduledAtFilter.lte = new Date(endDate as string);
      where.scheduledAt = scheduledAtFilter;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: appointmentIncludes,
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ data: appointments });
  } catch (error) {
    console.error('Error listing appointments:', error);
    res.status(500).json({ error: 'Failed to list appointments' });
  }
});

// ---------------------------------------------------------------------------
// GET /today - Get today's appointments for the current user
// ---------------------------------------------------------------------------
router.get('/today', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setUTCHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setUTCHours(23, 59, 59, 999);

    const appointments = await prisma.appointment.findMany({
      where: {
        scheduledAt: { gte: dayStart, lte: dayEnd },
        OR: [
          { commercialId: req.userId },
          { sdrId: req.userId },
        ],
      },
      include: appointmentIncludes,
      orderBy: { scheduledAt: 'asc' },
    });

    res.json({ data: appointments });
  } catch (error) {
    console.error('Error fetching today appointments:', error);
    res.status(500).json({ error: 'Failed to fetch today\'s appointments' });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create appointment
// ---------------------------------------------------------------------------
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { prospectId, commercialId, scheduledAt, duration = 90, notes } = req.body;

    if (!prospectId || !commercialId || !scheduledAt) {
      res.status(400).json({ error: 'prospectId, commercialId, and scheduledAt are required' });
      return;
    }

    const scheduledDate = new Date(scheduledAt);

    // Fetch the prospect
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
    if (!prospect) {
      res.status(404).json({ error: 'Prospect not found' });
      return;
    }

    // ----- Zone consistency check -----
    const prospectDept = prospect.postalCode.substring(0, 2);
    const jsDayIndex = scheduledDate.getUTCDay();
    const dayOfWeek = DAY_OF_WEEK_MAP[jsDayIndex];

    // Find the zone that covers this department
    const zone = await prisma.zone.findFirst({
      where: {
        departments: { has: prospectDept },
      },
    });

    if (zone) {
      // Check if the commercial has a zone assignment for this zone on this day
      const zoneAssignment = await prisma.zoneAssignment.findFirst({
        where: {
          userId: commercialId,
          zoneId: zone.id,
          dayOfWeek,
        },
      });

      if (!zoneAssignment) {
        // Find the correct day(s) for this commercial in this zone
        const correctAssignments = await prisma.zoneAssignment.findMany({
          where: {
            userId: commercialId,
            zoneId: zone.id,
          },
        });

        const suggestedDays = correctAssignments.map((a: { dayOfWeek: string }) => a.dayOfWeek);
        const suggestedLabels = suggestedDays.map((d: string) => DAY_LABELS[d] || d);

        res.status(400).json({
          error: suggestedDays.length > 0
            ? `Le département ${prospectDept} est assigné au commercial le ${suggestedLabels.join(', ')}. Veuillez choisir un ${suggestedLabels.join(' ou ')}.`
            : `Le commercial n'est pas assigné à la zone couvrant le département ${prospectDept}.`,
          details: {
            prospectPostalCode: prospect.postalCode,
            prospectDepartment: prospectDept,
            zoneName: zone.name,
            requestedDay: dayOfWeek,
            suggestedDays,
          },
        });
        return;
      }
    }

    // ----- Create appointment and update prospect in a transaction -----
    const sdrId = req.userRole === 'SDR' ? req.userId : undefined;

    const formattedDate = scheduledDate.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const result = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          prospectId,
          commercialId,
          sdrId,
          scheduledAt: scheduledDate,
          duration,
          notes,
          status: AppointmentStatus.SCHEDULED,
        },
        include: appointmentIncludes,
      });

      // Update prospect status to APPOINTMENT_SCHEDULED
      await tx.prospect.update({
        where: { id: prospectId },
        data: { status: ProspectStatus.APPOINTMENT_SCHEDULED },
      });

      // Create timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId,
          userId: req.userId!,
          type: 'APPOINTMENT_SCHEDULED',
          content: `RDV planifié le ${formattedDate}`,
          metadata: JSON.stringify({
            appointmentId: appointment.id,
            commercialId,
            scheduledAt: scheduledDate.toISOString(),
            duration,
          }),
        },
      });

      return appointment;
    });

    res.status(201).json({ data: result });
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id - Update appointment
// ---------------------------------------------------------------------------
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { scheduledAt, duration, status, notes, cancelReason } = req.body;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    const updateData: Record<string, unknown> = {};
    if (scheduledAt !== undefined) updateData.scheduledAt = new Date(scheduledAt);
    if (duration !== undefined) updateData.duration = duration;
    if (status !== undefined) updateData.status = status;
    if (notes !== undefined) updateData.notes = notes;
    if (cancelReason !== undefined) updateData.cancelReason = cancelReason;

    const result = await prisma.$transaction(async (tx) => {
      const updated = await tx.appointment.update({
        where: { id },
        data: updateData,
        include: appointmentIncludes,
      });

      // Handle status-dependent side effects
      if (status && status !== existing.status) {
        if (status === AppointmentStatus.CANCELLED) {
          // Create timeline entry for cancellation
          await tx.timelineEntry.create({
            data: {
              prospectId: existing.prospectId,
              userId: req.userId!,
              type: 'APPOINTMENT_CANCELLED',
              content: `RDV annulé${cancelReason ? `. Raison : ${cancelReason}` : ''}`,
              metadata: JSON.stringify({
                appointmentId: id,
                previousStatus: existing.status,
                cancelReason,
              }),
            },
          });

          // Set prospect back to QUALIFIED
          await tx.prospect.update({
            where: { id: existing.prospectId },
            data: { status: ProspectStatus.QUALIFIED },
          });
        }

        if (status === AppointmentStatus.COMPLETED) {
          // Create timeline entry for completion
          await tx.timelineEntry.create({
            data: {
              prospectId: existing.prospectId,
              userId: req.userId!,
              type: 'APPOINTMENT_COMPLETED',
              content: 'RDV terminé',
              metadata: JSON.stringify({
                appointmentId: id,
                previousStatus: existing.status,
              }),
            },
          });

          // Update prospect status to APPOINTMENT_DONE
          await tx.prospect.update({
            where: { id: existing.prospectId },
            data: { status: ProspectStatus.APPOINTMENT_DONE },
          });
        }
      }

      return updated;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ error: 'Failed to update appointment' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Cancel appointment (soft: set status to CANCELLED)
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const existing = await prisma.appointment.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Appointment not found' });
      return;
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: { status: AppointmentStatus.CANCELLED },
      include: appointmentIncludes,
    });

    res.json({ data: updated, message: 'Appointment cancelled successfully' });
  } catch (error) {
    console.error('Error cancelling appointment:', error);
    res.status(500).json({ error: 'Failed to cancel appointment' });
  }
});

export default router;
