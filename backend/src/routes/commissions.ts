import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { CommissionStatus } from '../types/enums';

const prisma = new PrismaClient();
const router = Router();

// All commission routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List commissions (DIRECTION, ADMIN or own for COMMERCIAL)
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { commercialId, status, type, startDate, endDate } = req.query;

    const where: Record<string, any> = {};

    // COMMERCIAL users can only see their own commissions
    if (req.userRole === 'COMMERCIAL') {
      where.commercialId = req.userId;
    } else if (req.userRole !== 'DIRECTION' && req.userRole !== 'ADMIN') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    if (commercialId && req.userRole !== 'COMMERCIAL') {
      where.commercialId = commercialId as string;
    }

    if (status) {
      where.status = status as CommissionStatus;
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

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: commissions });
  } catch (error) {
    console.error('List commissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /summary - Commission summary (DIRECTION, ADMIN)
// ---------------------------------------------------------------------------
router.get(
  '/summary',
  authorize('DIRECTION', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { month, year } = req.query;

      if (!month || !year) {
        res.status(400).json({ error: 'month and year are required' });
        return;
      }

      const monthNum = parseInt(month as string, 10);
      const yearNum = parseInt(year as string, 10);

      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0, 23, 59, 59, 999);

      const commissions = await prisma.commission.findMany({
        where: {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
        include: {
          commercial: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // Group by commercial
      const summaryMap: Record<
        string,
        {
          commercial: { id: string; firstName: string; lastName: string };
          totalEarned: number;
          totalPaid: number;
          totalPending: number;
        }
      > = {};

      for (const commission of commissions) {
        const cId = commission.commercialId;
        if (!summaryMap[cId]) {
          summaryMap[cId] = {
            commercial: commission.commercial,
            totalEarned: 0,
            totalPaid: 0,
            totalPending: 0,
          };
        }

        summaryMap[cId].totalEarned += commission.amount;

        if (commission.status === 'PAID') {
          summaryMap[cId].totalPaid += commission.paidAmount;
        } else {
          summaryMap[cId].totalPending += commission.amount - commission.paidAmount;
        }
      }

      // Fetch performance tiers for context
      const performanceTiers = await prisma.commissionRule.findMany({
        where: {
          active: true,
          tierMinCA: { not: null },
        },
        select: {
          name: true,
          productFamily: true,
          tierMinCA: true,
          tierMaxCA: true,
          tierBonusPercent: true,
        },
        orderBy: { tierMinCA: 'asc' },
      });

      const summary = Object.values(summaryMap);

      res.json({
        data: {
          month: monthNum,
          year: yearNum,
          commercials: summary,
          performanceTiers,
        },
      });
    } catch (error) {
      console.error('Commission summary error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /my - Get current user's commissions
// ---------------------------------------------------------------------------
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, type, startDate, endDate } = req.query;

    const where: Record<string, any> = {
      commercialId: req.userId,
    };

    if (status) {
      where.status = status as CommissionStatus;
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

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        commercial: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ data: commissions });
  } catch (error) {
    console.error('List my commissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST /calculate/:quoteId - Calculate commission for a quote (DIRECTION, ADMIN)
// ---------------------------------------------------------------------------
router.post(
  '/calculate/:quoteId',
  authorize('DIRECTION', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { quoteId } = req.params;

      // Fetch quote with lines and prospect
      const quote = await prisma.quote.findUnique({
        where: { id: quoteId },
        include: {
          lines: {
            include: {
              product: true,
            },
          },
          prospect: true,
        },
      });

      if (!quote) {
        res.status(404).json({ error: 'Quote not found' });
        return;
      }

      if (quote.status !== 'SIGNED' && quote.status !== 'VALIDATED') {
        res.status(400).json({ error: 'Quote must be SIGNED or VALIDATED to calculate commission' });
        return;
      }

      // Fetch all active commission rules
      const commissionRules = await prisma.commissionRule.findMany({
        where: { active: true },
      });

      // Build a map of rules by product family
      const rulesByFamily: Record<string, typeof commissionRules> = {};
      for (const rule of commissionRules) {
        const family = rule.productFamily;
        if (!rulesByFamily[family]) {
          rulesByFamily[family] = [];
        }
        rulesByFamily[family].push(rule);
      }

      // Calculate commission for each quote line
      let totalCommission = 0;

      for (const line of quote.lines) {
        const family = line.product.family;
        const familyRules = rulesByFamily[family];

        if (!familyRules || familyRules.length === 0) continue;

        // Use the first matching rule for this family
        const rule = familyRules[0];
        const lineCommission = line.totalHT * (rule.ratePercent / 100);

        // Apply maintenance multiplier if applicable
        if (family === 'MAINTENANCE' && rule.maintenanceMultiplier) {
          totalCommission += lineCommission * rule.maintenanceMultiplier;
        } else {
          totalCommission += lineCommission;
        }
      }

      // Check performance tiers based on commercial's monthly CA
      const now = new Date();
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

      // Calculate commercial's monthly CA from signed/validated quotes
      const monthlyQuotes = await prisma.quote.findMany({
        where: {
          commercialId: quote.commercialId,
          status: { in: ['SIGNED', 'VALIDATED'] },
          signedAt: {
            gte: monthStart,
            lte: monthEnd,
          },
        },
      });

      const monthlyCA = monthlyQuotes.reduce((sum, q) => sum + q.totalHT, 0);

      // Find applicable performance tier
      let tierBonus = 0;
      for (const rule of commissionRules) {
        if (
          rule.tierMinCA !== null &&
          rule.tierBonusPercent !== null &&
          monthlyCA >= rule.tierMinCA &&
          (rule.tierMaxCA === null || monthlyCA <= rule.tierMaxCA)
        ) {
          tierBonus = totalCommission * (rule.tierBonusPercent / 100);
          break;
        }
      }

      totalCommission += tierBonus;

      // Create commission record
      const commission = await prisma.commission.create({
        data: {
          commercialId: quote.commercialId,
          quoteId: quote.id,
          amount: Math.round(totalCommission * 100) / 100,
          type: 'sale',
          description: `Commission on quote ${quote.quoteNumber} - CA: ${quote.totalHT}`,
          status: 'PENDING',
        },
        include: {
          commercial: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      // If the prospect was referred, create referral bonus commission
      let referralCommission = null;
      if (quote.prospect.isReferred && quote.prospect.commercialId) {
        // Find referral bonus rules
        const referralRules = commissionRules.filter(
          (r) => r.referralBonusFixed !== null || r.referralBonusPercent !== null,
        );

        if (referralRules.length > 0) {
          const referralRule = referralRules[0];
          let referralAmount = 0;

          if (referralRule.referralBonusFixed) {
            referralAmount += referralRule.referralBonusFixed;
          }
          if (referralRule.referralBonusPercent) {
            referralAmount += quote.totalHT * (referralRule.referralBonusPercent / 100);
          }

          if (referralAmount > 0) {
            referralCommission = await prisma.commission.create({
              data: {
                commercialId: quote.commercialId,
                quoteId: quote.id,
                amount: Math.round(referralAmount * 100) / 100,
                type: 'referral_bonus',
                description: `Referral bonus for quote ${quote.quoteNumber}`,
                status: 'PENDING',
              },
              include: {
                commercial: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
            });
          }
        }
      }

      res.status(201).json({
        data: {
          commission,
          referralCommission,
          monthlyCA,
          tierBonus: Math.round(tierBonus * 100) / 100,
        },
      });
    } catch (error) {
      console.error('Calculate commission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id - Update commission status (DIRECTION, ADMIN)
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authorize('DIRECTION', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { status, paidAmount } = req.body;

      const existing = await prisma.commission.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Commission not found' });
        return;
      }

      const updateData: Record<string, any> = {};

      if (status !== undefined) {
        updateData.status = status as CommissionStatus;
        if (status === 'PAID') {
          updateData.paidAt = new Date();
        }
      }

      if (paidAmount !== undefined) {
        updateData.paidAmount = paidAmount;
      }

      const commission = await prisma.commission.update({
        where: { id },
        data: updateData,
        include: {
          commercial: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      res.json({ data: commission });
    } catch (error) {
      console.error('Update commission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /rules - List commission rules (ADMIN)
// ---------------------------------------------------------------------------
router.get(
  '/rules',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rules = await prisma.commissionRule.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: rules });
    } catch (error) {
      console.error('List commission rules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /rules - Create commission rule (ADMIN)
// ---------------------------------------------------------------------------
router.post(
  '/rules',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        name,
        productFamily,
        ratePercent,
        tierMinCA,
        tierMaxCA,
        tierBonusPercent,
        maintenanceMultiplier,
        referralBonusFixed,
        referralBonusPercent,
      } = req.body;

      if (!name || !productFamily || ratePercent === undefined) {
        res.status(400).json({ error: 'name, productFamily and ratePercent are required' });
        return;
      }

      const rule = await prisma.commissionRule.create({
        data: {
          name,
          productFamily,
          ratePercent,
          tierMinCA: tierMinCA ?? null,
          tierMaxCA: tierMaxCA ?? null,
          tierBonusPercent: tierBonusPercent ?? null,
          maintenanceMultiplier: maintenanceMultiplier ?? null,
          referralBonusFixed: referralBonusFixed ?? null,
          referralBonusPercent: referralBonusPercent ?? null,
        },
      });

      res.status(201).json({ data: rule });
    } catch (error) {
      console.error('Create commission rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /rules/:id - Update commission rule (ADMIN)
// ---------------------------------------------------------------------------
router.put(
  '/rules/:id',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const {
        name,
        productFamily,
        ratePercent,
        tierMinCA,
        tierMaxCA,
        tierBonusPercent,
        maintenanceMultiplier,
        referralBonusFixed,
        referralBonusPercent,
      } = req.body;

      const existing = await prisma.commissionRule.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Commission rule not found' });
        return;
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (productFamily !== undefined) updateData.productFamily = productFamily;
      if (ratePercent !== undefined) updateData.ratePercent = ratePercent;
      if (tierMinCA !== undefined) updateData.tierMinCA = tierMinCA;
      if (tierMaxCA !== undefined) updateData.tierMaxCA = tierMaxCA;
      if (tierBonusPercent !== undefined) updateData.tierBonusPercent = tierBonusPercent;
      if (maintenanceMultiplier !== undefined) updateData.maintenanceMultiplier = maintenanceMultiplier;
      if (referralBonusFixed !== undefined) updateData.referralBonusFixed = referralBonusFixed;
      if (referralBonusPercent !== undefined) updateData.referralBonusPercent = referralBonusPercent;

      const rule = await prisma.commissionRule.update({
        where: { id },
        data: updateData,
      });

      res.json({ data: rule });
    } catch (error) {
      console.error('Update commission rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
