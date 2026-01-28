import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List payments with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      quoteId,
      startDate,
      endDate,
      page = '1',
      limit = '20',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
    const skip = (pageNum - 1) * limitNum;

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status as string;
    }

    if (quoteId) {
      where.quoteId = quoteId as string;
    }

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate as string);
      if (endDate) createdAtFilter.lte = new Date(endDate as string);
      where.createdAt = createdAtFilter;
    }

    const [payments, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          quote: {
            include: {
              prospect: {
                select: {
                  id: true,
                  companyName: true,
                  decisionMakerName: true,
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
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({
      data: payments,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listing payments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paiements' });
  }
});

// ---------------------------------------------------------------------------
// GET /pending - Get pending payments
// ---------------------------------------------------------------------------
router.get('/pending', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payments = await prisma.payment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
      include: {
        quote: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
                decisionMakerName: true,
                phone: true,
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

    res.json({ data: payments });
  } catch (error) {
    console.error('Error fetching pending payments:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des paiements en attente' });
  }
});

// ---------------------------------------------------------------------------
// GET /stats - Payment statistics
// ---------------------------------------------------------------------------
router.get('/stats', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);

    const [
      totalPending,
      totalReceived,
      monthlyReceived,
      yearlyReceived,
      byStatus,
      byMode,
    ] = await Promise.all([
      // Total pending amount
      prisma.payment.aggregate({
        where: { status: 'PENDING' },
        _sum: { amount: true },
        _count: true,
      }),
      // Total received
      prisma.payment.aggregate({
        where: { status: { in: ['RECEIVED', 'VALIDATED'] } },
        _sum: { amount: true },
      }),
      // Monthly received
      prisma.payment.aggregate({
        where: {
          status: { in: ['RECEIVED', 'VALIDATED'] },
          receivedAt: { gte: startOfMonth },
        },
        _sum: { amount: true },
      }),
      // Yearly received
      prisma.payment.aggregate({
        where: {
          status: { in: ['RECEIVED', 'VALIDATED'] },
          receivedAt: { gte: startOfYear },
        },
        _sum: { amount: true },
      }),
      // By status
      prisma.payment.groupBy({
        by: ['status'],
        _sum: { amount: true },
        _count: true,
      }),
      // By payment mode
      prisma.payment.groupBy({
        by: ['mode'],
        _sum: { amount: true },
        _count: true,
      }),
    ]);

    res.json({
      data: {
        pending: {
          amount: totalPending._sum.amount || 0,
          count: totalPending._count,
        },
        received: {
          total: totalReceived._sum.amount || 0,
          monthly: monthlyReceived._sum.amount || 0,
          yearly: yearlyReceived._sum.amount || 0,
        },
        byStatus,
        byMode,
      },
    });
  } catch (error) {
    console.error('Error fetching payment stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get payment by id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: {
        quote: {
          include: {
            prospect: true,
            commercial: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true,
              },
            },
          },
        },
      },
    });

    if (!payment) {
      res.status(404).json({ error: 'Paiement non trouvé' });
      return;
    }

    res.json({ data: payment });
  } catch (error) {
    console.error('Error fetching payment:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du paiement' });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create a payment
// ---------------------------------------------------------------------------
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { quoteId, amount, type, mode, reference } = req.body;

    if (!quoteId || !amount || !type || !mode) {
      res.status(400).json({ error: 'quoteId, amount, type et mode sont requis' });
      return;
    }

    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      include: { prospect: true },
    });

    if (!quote) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    const payment = await prisma.payment.create({
      data: {
        quoteId,
        amount: parseFloat(amount),
        type,
        mode,
        reference: reference || null,
        status: 'PENDING',
      },
      include: {
        quote: {
          include: {
            prospect: {
              select: {
                id: true,
                companyName: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({ data: payment });
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Erreur lors de la création du paiement' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id - Update payment status
// ---------------------------------------------------------------------------
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, reference, receivedAt } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { quote: { include: { prospect: true } } },
    });

    if (!payment) {
      res.status(404).json({ error: 'Paiement non trouvé' });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;

      if (status === 'RECEIVED') {
        updateData.receivedAt = receivedAt ? new Date(receivedAt) : new Date();
      }

      if (status === 'VALIDATED') {
        updateData.validatedAt = new Date();
      }
    }

    if (reference !== undefined) {
      updateData.reference = reference;
    }

    const updatedPayment = await prisma.$transaction(async (tx) => {
      const updated = await tx.payment.update({
        where: { id },
        data: updateData,
        include: {
          quote: {
            include: {
              prospect: {
                select: {
                  id: true,
                  companyName: true,
                },
              },
            },
          },
        },
      });

      // Create timeline entry for status changes
      if (status && status !== payment.status) {
        await tx.timelineEntry.create({
          data: {
            prospectId: payment.quote.prospectId,
            userId: req.userId!,
            type: 'STATUS_CHANGE',
            content: `Paiement ${payment.type} passé à ${status}`,
            metadata: JSON.stringify({
              paymentId: id,
              previousStatus: payment.status,
              newStatus: status,
              amount: payment.amount,
            }),
          },
        });
      }

      return updated;
    });

    res.json({ data: updatedPayment });
  } catch (error) {
    console.error('Error updating payment:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du paiement' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/validate - Validate a payment (DIRECTION/ADMIN)
// ---------------------------------------------------------------------------
router.post('/:id/validate', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { approved, comment } = req.body;

    const payment = await prisma.payment.findUnique({
      where: { id },
      include: { quote: { include: { prospect: true } } },
    });

    if (!payment) {
      res.status(404).json({ error: 'Paiement non trouvé' });
      return;
    }

    if (payment.status !== 'RECEIVED') {
      res.status(400).json({ error: 'Seuls les paiements reçus peuvent être validés' });
      return;
    }

    const newStatus = approved ? 'VALIDATED' : 'REJECTED';

    const result = await prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          status: newStatus,
          validatedAt: approved ? new Date() : null,
        },
      });

      // Create validation record
      await tx.validation.create({
        data: {
          quoteId: payment.quoteId,
          type: 'payment_validation',
          status: approved ? 'APPROVED' : 'REFUSED',
          comment: comment || null,
          validatedBy: req.userId,
        },
      });

      // Timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId: payment.quote.prospectId,
          userId: req.userId!,
          type: 'STATUS_CHANGE',
          content: approved
            ? `Paiement de ${payment.amount}€ validé`
            : `Paiement de ${payment.amount}€ rejeté`,
          metadata: JSON.stringify({
            paymentId: id,
            status: newStatus,
            comment,
          }),
        },
      });

      return updatedPayment;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error validating payment:', error);
    res.status(500).json({ error: 'Erreur lors de la validation du paiement' });
  }
});

export default router;
