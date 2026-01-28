import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All validation routes require DIRECTION or ADMIN role
router.use(authenticate, authorize('DIRECTION', 'ADMIN'));

// ============================================
// GET / - List validations with filters
// ============================================

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const { status, type, startDate, endDate } = req.query;

    const where: any = {};

    if (status) {
      where.status = status as string;
    }

    if (type) {
      where.type = type as string;
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(startDate as string);
      }
      if (endDate) {
        where.createdAt.lte = new Date(endDate as string);
      }
    }

    const validations = await prisma.validation.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        quote: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
              },
            },
            commercial: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          select: {
            id: true,
            quoteNumber: true,
            totalHT: true,
            totalTTC: true,
            paymentMode: true,
            status: true,
            prospect: true,
            commercial: true,
          },
        },
      },
    });

    res.json(validations);
  } catch (error) {
    console.error('Error listing validations:', error);
    res.status(500).json({ error: 'Failed to list validations' });
  }
});

// ============================================
// GET /pending - Get pending validations only
// ============================================

router.get('/pending', async (req: AuthRequest, res: Response) => {
  try {
    const validations = await prisma.validation.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      include: {
        quote: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
              },
            },
            commercial: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          select: {
            id: true,
            quoteNumber: true,
            totalHT: true,
            totalTTC: true,
            paymentMode: true,
            status: true,
            prospect: true,
            commercial: true,
          },
        },
      },
    });

    res.json(validations);
  } catch (error) {
    console.error('Error listing pending validations:', error);
    res.status(500).json({ error: 'Failed to list pending validations' });
  }
});

// ============================================
// GET /stats - Validation statistics
// ============================================

router.get('/stats', async (req: AuthRequest, res: Response) => {
  try {
    // Count by status
    const countByStatus = await prisma.validation.groupBy({
      by: ['status'],
      _count: { id: true },
    });

    const statusCounts = countByStatus.map((group) => ({
      status: group.status,
      count: group._count.id,
    }));

    // Average validation time (time between creation and last update for non-pending)
    const completedValidations = await prisma.validation.findMany({
      where: {
        status: { not: 'PENDING' },
      },
      select: {
        createdAt: true,
        updatedAt: true,
      },
    });

    let averageValidationTimeHours = 0;
    if (completedValidations.length > 0) {
      const totalMs = completedValidations.reduce((sum, v) => {
        return sum + (v.updatedAt.getTime() - v.createdAt.getTime());
      }, 0);
      averageValidationTimeHours =
        Math.round((totalMs / completedValidations.length / (1000 * 60 * 60)) * 100) / 100;
    }

    // Validations per day for the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentValidations = await prisma.validation.findMany({
      where: {
        createdAt: { gte: thirtyDaysAgo },
      },
      select: {
        createdAt: true,
      },
    });

    const perDay: Record<string, number> = {};
    recentValidations.forEach((v) => {
      const key = v.createdAt.toISOString().split('T')[0];
      perDay[key] = (perDay[key] || 0) + 1;
    });

    // Fill in missing days with zero
    const validationsPerDay: Array<{ date: string; count: number }> = [];
    const current = new Date(thirtyDaysAgo);
    const today = new Date();
    while (current <= today) {
      const key = current.toISOString().split('T')[0];
      validationsPerDay.push({ date: key, count: perDay[key] || 0 });
      current.setDate(current.getDate() + 1);
    }

    res.json({
      statusCounts,
      averageValidationTimeHours,
      validationsPerDay,
    });
  } catch (error) {
    console.error('Error fetching validation stats:', error);
    res.status(500).json({ error: 'Failed to fetch validation statistics' });
  }
});

// ============================================
// PUT /:id - Process a validation
// ============================================

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, comment } = req.body;

    if (!status || !['APPROVED', 'REFUSED', 'INFO_REQUESTED'].includes(status)) {
      return res.status(400).json({
        error: 'status must be APPROVED, REFUSED, or INFO_REQUESTED',
      });
    }

    const validation = await prisma.validation.findUnique({
      where: { id },
      include: {
        quote: {
          include: { prospect: true },
        },
      },
    });

    if (!validation) {
      return res.status(404).json({ error: 'Validation not found' });
    }

    // Update the validation record
    const updatedValidation = await prisma.validation.update({
      where: { id },
      data: {
        status,
        comment: comment || null,
        validatedBy: req.userId,
      },
    });

    const quote = validation.quote;

    // Handle APPROVED for quote_approval
    if (status === 'APPROVED' && validation.type === 'quote_approval') {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'VALIDATED' },
      });

      await prisma.timelineEntry.create({
        data: {
          prospectId: quote.prospectId,
          userId: req.userId!,
          type: 'STATUS_CHANGE',
          content: `Devis ${quote.quoteNumber} validé par la direction`,
          metadata: JSON.stringify({
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            validationId: updatedValidation.id,
            validationStatus: status,
          }),
        },
      });
    }

    // Handle REFUSED
    if (status === 'REFUSED') {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { status: 'REFUSED' },
      });

      await prisma.timelineEntry.create({
        data: {
          prospectId: quote.prospectId,
          userId: req.userId!,
          type: 'STATUS_CHANGE',
          content: `Devis ${quote.quoteNumber} refusé${comment ? ` - Motif : ${comment}` : ''}`,
          metadata: JSON.stringify({
            quoteId: quote.id,
            quoteNumber: quote.quoteNumber,
            validationId: updatedValidation.id,
            validationStatus: status,
            refusalReason: comment || null,
          }),
        },
      });
    }

    // Handle APPROVED for payment_validation
    if (status === 'APPROVED' && validation.type === 'payment_validation') {
      await prisma.payment.updateMany({
        where: {
          quoteId: quote.id,
          status: 'PENDING',
        },
        data: {
          status: 'VALIDATED',
          validatedAt: new Date(),
        },
      });
    }

    // Fetch the updated validation with includes
    const result = await prisma.validation.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
              },
            },
            commercial: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.json(result);
  } catch (error) {
    console.error('Error processing validation:', error);
    res.status(500).json({ error: 'Failed to process validation' });
  }
});

export default router;
