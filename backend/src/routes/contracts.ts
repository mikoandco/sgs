import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List contracts with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      type,
      prospectId,
      expiringSoon,
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

    if (type) {
      where.type = type as string;
    }

    if (prospectId) {
      where.prospectId = prospectId as string;
    }

    // Expiring in next 30 days
    if (expiringSoon === 'true') {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      where.status = 'ACTIVE';
      where.endDate = {
        lte: thirtyDaysFromNow,
        gte: new Date(),
      };
    }

    const [contracts, total] = await Promise.all([
      prisma.contract.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { endDate: 'asc' },
        include: {
          prospect: {
            select: {
              id: true,
              companyName: true,
              decisionMakerName: true,
              phone: true,
              decisionMakerMobile: true,
            },
          },
        },
      }),
      prisma.contract.count({ where }),
    ]);

    res.json({
      data: contracts,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listing contracts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contrats' });
  }
});

// ---------------------------------------------------------------------------
// GET /expiring - Get contracts expiring soon
// ---------------------------------------------------------------------------
router.get('/expiring', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { days = '30' } = req.query;
    const daysNum = parseInt(days as string, 10) || 30;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysNum);

    const contracts = await prisma.contract.findMany({
      where: {
        status: 'ACTIVE',
        endDate: {
          lte: futureDate,
          gte: new Date(),
        },
      },
      orderBy: { endDate: 'asc' },
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
            decisionMakerName: true,
            decisionMakerMobile: true,
            commercialId: true,
            commercial: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
        },
      },
    });

    res.json({ data: contracts });
  } catch (error) {
    console.error('Error fetching expiring contracts:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des contrats expirants' });
  }
});

// ---------------------------------------------------------------------------
// GET /stats - Contract statistics
// ---------------------------------------------------------------------------
router.get('/stats', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const [
      byStatus,
      byType,
      totalActive,
      totalMRR,
      expiringThisMonth,
    ] = await Promise.all([
      // By status
      prisma.contract.groupBy({
        by: ['status'],
        _count: true,
      }),
      // By type
      prisma.contract.groupBy({
        by: ['type'],
        where: { status: 'ACTIVE' },
        _count: true,
        _sum: { monthlyFee: true },
      }),
      // Total active
      prisma.contract.count({
        where: { status: 'ACTIVE' },
      }),
      // Total Monthly Recurring Revenue
      prisma.contract.aggregate({
        where: { status: 'ACTIVE', monthlyFee: { not: null } },
        _sum: { monthlyFee: true },
      }),
      // Expiring this month
      prisma.contract.count({
        where: {
          status: 'ACTIVE',
          endDate: {
            lte: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0),
            gte: new Date(),
          },
        },
      }),
    ]);

    res.json({
      data: {
        byStatus,
        byType,
        totalActive,
        totalMRR: totalMRR._sum.monthlyFee || 0,
        expiringThisMonth,
      },
    });
  } catch (error) {
    console.error('Error fetching contract stats:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des statistiques' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get contract by id
// ---------------------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: {
        prospect: {
          include: {
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

    if (!contract) {
      res.status(404).json({ error: 'Contrat non trouvé' });
      return;
    }

    res.json({ data: contract });
  } catch (error) {
    console.error('Error fetching contract:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération du contrat' });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create a contract
// ---------------------------------------------------------------------------
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      prospectId,
      type,
      startDate,
      endDate,
      monthlyFee,
      totalAmount,
    } = req.body;

    if (!prospectId || !type || !startDate || !endDate) {
      res.status(400).json({ error: 'prospectId, type, startDate et endDate sont requis' });
      return;
    }

    const prospect = await prisma.prospect.findUnique({
      where: { id: prospectId },
    });

    if (!prospect) {
      res.status(404).json({ error: 'Prospect non trouvé' });
      return;
    }

    const contract = await prisma.$transaction(async (tx) => {
      const created = await tx.contract.create({
        data: {
          prospectId,
          type,
          status: 'ACTIVE',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          monthlyFee: monthlyFee ? parseFloat(monthlyFee) : null,
          totalAmount: totalAmount ? parseFloat(totalAmount) : null,
        },
        include: {
          prospect: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      // Timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId,
          userId: req.userId!,
          type: 'STATUS_CHANGE',
          content: `Contrat ${type} créé`,
          metadata: JSON.stringify({
            contractId: created.id,
            type,
            startDate,
            endDate,
          }),
        },
      });

      return created;
    });

    res.status(201).json({ data: contract });
  } catch (error) {
    console.error('Error creating contract:', error);
    res.status(500).json({ error: 'Erreur lors de la création du contrat' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id - Update contract
// ---------------------------------------------------------------------------
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      status,
      startDate,
      endDate,
      monthlyFee,
      totalAmount,
    } = req.body;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { prospect: true },
    });

    if (!contract) {
      res.status(404).json({ error: 'Contrat non trouvé' });
      return;
    }

    const updateData: Record<string, unknown> = {};

    if (status) updateData.status = status;
    if (startDate) updateData.startDate = new Date(startDate);
    if (endDate) updateData.endDate = new Date(endDate);
    if (monthlyFee !== undefined) updateData.monthlyFee = monthlyFee ? parseFloat(monthlyFee) : null;
    if (totalAmount !== undefined) updateData.totalAmount = totalAmount ? parseFloat(totalAmount) : null;

    const updated = await prisma.$transaction(async (tx) => {
      const result = await tx.contract.update({
        where: { id },
        data: updateData,
        include: {
          prospect: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      // Timeline entry for status change
      if (status && status !== contract.status) {
        await tx.timelineEntry.create({
          data: {
            prospectId: contract.prospectId,
            userId: req.userId!,
            type: 'STATUS_CHANGE',
            content: `Contrat ${contract.type} passé à ${status}`,
            metadata: JSON.stringify({
              contractId: id,
              previousStatus: contract.status,
              newStatus: status,
            }),
          },
        });
      }

      return result;
    });

    res.json({ data: updated });
  } catch (error) {
    console.error('Error updating contract:', error);
    res.status(500).json({ error: 'Erreur lors de la mise à jour du contrat' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/renew - Renew a contract
// ---------------------------------------------------------------------------
router.post('/:id/renew', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { newEndDate, newMonthlyFee } = req.body;

    const contract = await prisma.contract.findUnique({
      where: { id },
      include: { prospect: true },
    });

    if (!contract) {
      res.status(404).json({ error: 'Contrat non trouvé' });
      return;
    }

    if (!newEndDate) {
      res.status(400).json({ error: 'newEndDate est requis' });
      return;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update current contract
      const renewed = await tx.contract.update({
        where: { id },
        data: {
          endDate: new Date(newEndDate),
          monthlyFee: newMonthlyFee ? parseFloat(newMonthlyFee) : contract.monthlyFee,
          startDate: contract.endDate, // New period starts from old end date
        },
        include: {
          prospect: {
            select: {
              id: true,
              companyName: true,
            },
          },
        },
      });

      // Timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId: contract.prospectId,
          userId: req.userId!,
          type: 'STATUS_CHANGE',
          content: `Contrat ${contract.type} renouvelé jusqu'au ${new Date(newEndDate).toLocaleDateString('fr-FR')}`,
          metadata: JSON.stringify({
            contractId: id,
            previousEndDate: contract.endDate,
            newEndDate,
          }),
        },
      });

      return renewed;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error renewing contract:', error);
    res.status(500).json({ error: 'Erreur lors du renouvellement du contrat' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Cancel/delete a contract
// ---------------------------------------------------------------------------
router.delete('/:id', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const contract = await prisma.contract.findUnique({
      where: { id },
    });

    if (!contract) {
      res.status(404).json({ error: 'Contrat non trouvé' });
      return;
    }

    await prisma.$transaction(async (tx) => {
      // Mark as cancelled instead of deleting
      await tx.contract.update({
        where: { id },
        data: { status: 'CANCELLED' },
      });

      // Timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId: contract.prospectId,
          userId: req.userId!,
          type: 'STATUS_CHANGE',
          content: `Contrat ${contract.type} annulé`,
          metadata: JSON.stringify({ contractId: id }),
        },
      });
    });

    res.json({ message: 'Contrat annulé' });
  } catch (error) {
    console.error('Error cancelling contract:', error);
    res.status(500).json({ error: 'Erreur lors de l\'annulation du contrat' });
  }
});

export default router;
