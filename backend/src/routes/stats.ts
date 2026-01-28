import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All stats routes require DIRECTION or ADMIN role
router.use(authenticate, authorize('DIRECTION', 'ADMIN'));

// =============================================================================
// GET /teleprospection - SDR KPIs
// =============================================================================
router.get('/teleprospection', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, sdrId } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid startDate or endDate' });
    }

    const dateFilter = { gte: start, lte: end };
    const sdrFilter = sdrId ? { sdrId: sdrId as string } : {};

    // Total prospects created in the period
    const totalProspects = await prisma.prospect.count({
      where: {
        createdAt: dateFilter,
        ...sdrFilter,
      },
    });

    // Prospects that reached QUALIFIED or beyond
    const prospectsQualified = await prisma.prospect.count({
      where: {
        qualifiedAt: dateFilter,
        ...sdrFilter,
      },
    });

    // Appointments scheduled
    const appointmentsScheduled = await prisma.appointment.count({
      where: {
        createdAt: dateFilter,
        ...(sdrId ? { sdrId: sdrId as string } : {}),
      },
    });

    // Appointments completed
    const appointmentsCompleted = await prisma.appointment.count({
      where: {
        status: 'COMPLETED',
        scheduledAt: dateFilter,
        ...(sdrId ? { sdrId: sdrId as string } : {}),
      },
    });

    // Conversion rates
    const qualificationRate =
      totalProspects > 0
        ? Math.round((prospectsQualified / totalProspects) * 10000) / 100
        : 0;
    const appointmentRate =
      prospectsQualified > 0
        ? Math.round((appointmentsScheduled / prospectsQualified) * 10000) / 100
        : 0;

    // Per-SDR breakdown (when no sdrId filter is applied)
    let perSdrBreakdown: Array<Record<string, unknown>> | undefined;

    if (!sdrId) {
      const sdrs = await prisma.user.findMany({
        where: { role: 'SDR', active: true },
        select: { id: true, firstName: true, lastName: true },
      });

      perSdrBreakdown = await Promise.all(
        sdrs.map(async (sdr) => {
          const sdrProspects = await prisma.prospect.count({
            where: { createdAt: dateFilter, sdrId: sdr.id },
          });
          const sdrQualified = await prisma.prospect.count({
            where: { qualifiedAt: dateFilter, sdrId: sdr.id },
          });
          const sdrAppointmentsScheduled = await prisma.appointment.count({
            where: { createdAt: dateFilter, sdrId: sdr.id },
          });
          const sdrAppointmentsCompleted = await prisma.appointment.count({
            where: { status: 'COMPLETED', scheduledAt: dateFilter, sdrId: sdr.id },
          });

          return {
            sdrId: sdr.id,
            sdrName: `${sdr.firstName} ${sdr.lastName}`,
            totalProspects: sdrProspects,
            prospectsQualified: sdrQualified,
            appointmentsScheduled: sdrAppointmentsScheduled,
            appointmentsCompleted: sdrAppointmentsCompleted,
            qualificationRate:
              sdrProspects > 0
                ? Math.round((sdrQualified / sdrProspects) * 10000) / 100
                : 0,
            appointmentRate:
              sdrQualified > 0
                ? Math.round((sdrAppointmentsScheduled / sdrQualified) * 10000) / 100
                : 0,
          };
        })
      );
    }

    res.json({
      period: { startDate: start, endDate: end },
      totalProspects,
      prospectsQualified,
      appointmentsScheduled,
      appointmentsCompleted,
      qualificationRate,
      appointmentRate,
      ...(perSdrBreakdown ? { perSdrBreakdown } : {}),
    });
  } catch (error) {
    console.error('Error fetching teleprospection stats:', error);
    res.status(500).json({ error: 'Failed to fetch teleprospection statistics' });
  }
});

// =============================================================================
// GET /commercial - Commercial KPIs
// =============================================================================
router.get('/commercial', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate, commercialId } = req.query;

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid startDate or endDate' });
    }

    const dateFilter = { gte: start, lte: end };
    const commercialFilter = commercialId
      ? { commercialId: commercialId as string }
      : {};

    // Quotes created
    const quotesCreated = await prisma.quote.count({
      where: {
        createdAt: dateFilter,
        ...commercialFilter,
      },
    });

    // Quotes signed
    const quotesSigned = await prisma.quote.count({
      where: {
        status: 'SIGNED',
        signedAt: dateFilter,
        ...commercialFilter,
      },
    });

    // Total CA signed (HT)
    const signedQuotesAgg = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      _avg: { totalHT: true, marginPercent: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: dateFilter,
        ...commercialFilter,
      },
    });

    const totalCASigned = signedQuotesAgg._sum.totalHT || 0;
    const averageBasket = signedQuotesAgg._avg.totalHT || 0;
    const averageMargin = signedQuotesAgg._avg.marginPercent || 0;

    // Conversion rate: RDV -> Signature
    const appointmentsCompleted = await prisma.appointment.count({
      where: {
        status: 'COMPLETED',
        scheduledAt: dateFilter,
        ...(commercialId ? { commercialId: commercialId as string } : {}),
      },
    });

    const conversionRateRdvSignature =
      appointmentsCompleted > 0
        ? Math.round((quotesSigned / appointmentsCompleted) * 10000) / 100
        : 0;

    // Referral rate (% of sales coming from referrals)
    const signedFromReferrals = await prisma.quote.count({
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: dateFilter,
        ...commercialFilter,
        prospect: { isReferred: true },
      },
    });

    const referralRate =
      quotesSigned > 0
        ? Math.round((signedFromReferrals / quotesSigned) * 10000) / 100
        : 0;

    // CA from complementary sales (existing clients: prospects with a previous signed quote)
    const complementarySalesAgg = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: dateFilter,
        ...commercialFilter,
        phase: 2,
      },
    });

    const caComplementarySales = complementarySalesAgg._sum.totalHT || 0;

    // Per commercial breakdown
    let perCommercialBreakdown: Array<Record<string, unknown>> | undefined;

    if (!commercialId) {
      const commercials = await prisma.user.findMany({
        where: { role: 'COMMERCIAL', active: true },
        select: { id: true, firstName: true, lastName: true },
      });

      perCommercialBreakdown = await Promise.all(
        commercials.map(async (commercial) => {
          const cQuotesCreated = await prisma.quote.count({
            where: { createdAt: dateFilter, commercialId: commercial.id },
          });
          const cQuotesSigned = await prisma.quote.count({
            where: {
              status: 'SIGNED',
              signedAt: dateFilter,
              commercialId: commercial.id,
            },
          });
          const cSignedAgg = await prisma.quote.aggregate({
            _sum: { totalHT: true },
            _avg: { totalHT: true, marginPercent: true },
            where: {
              status: { in: ['SIGNED', 'VALIDATED'] },
              signedAt: dateFilter,
              commercialId: commercial.id,
            },
          });
          const cAppointments = await prisma.appointment.count({
            where: {
              status: 'COMPLETED',
              scheduledAt: dateFilter,
              commercialId: commercial.id,
            },
          });
          const cReferrals = await prisma.quote.count({
            where: {
              status: { in: ['SIGNED', 'VALIDATED'] },
              signedAt: dateFilter,
              commercialId: commercial.id,
              prospect: { isReferred: true },
            },
          });

          return {
            commercialId: commercial.id,
            commercialName: `${commercial.firstName} ${commercial.lastName}`,
            quotesCreated: cQuotesCreated,
            quotesSigned: cQuotesSigned,
            totalCASigned: cSignedAgg._sum.totalHT || 0,
            averageBasket: cSignedAgg._avg.totalHT || 0,
            averageMargin: cSignedAgg._avg.marginPercent || 0,
            conversionRateRdvSignature:
              cAppointments > 0
                ? Math.round((cQuotesSigned / cAppointments) * 10000) / 100
                : 0,
            referralRate:
              cQuotesSigned > 0
                ? Math.round((cReferrals / cQuotesSigned) * 10000) / 100
                : 0,
          };
        })
      );
    }

    res.json({
      period: { startDate: start, endDate: end },
      quotesCreated,
      quotesSigned,
      totalCASigned,
      averageBasket: Math.round(averageBasket * 100) / 100,
      averageMargin: Math.round(averageMargin * 100) / 100,
      conversionRateRdvSignature,
      referralRate,
      caComplementarySales,
      ...(perCommercialBreakdown ? { perCommercialBreakdown } : {}),
    });
  } catch (error) {
    console.error('Error fetching commercial stats:', error);
    res.status(500).json({ error: 'Failed to fetch commercial statistics' });
  }
});

// =============================================================================
// GET /pipeline - Sales Pipeline
// =============================================================================
router.get('/pipeline', async (req: AuthRequest, res: Response) => {
  try {
    // Count and value of quotes by status
    const quotesByStatus = await prisma.quote.groupBy({
      by: ['status'],
      _count: { id: true },
      _sum: { totalHT: true },
    });

    const pipelineByStatus = quotesByStatus.map((group) => ({
      status: group.status,
      count: group._count.id,
      totalHT: group._sum.totalHT || 0,
    }));

    // Monthly CA breakdown (last 12 months)
    const now = new Date();
    const twelveMonthsAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);

    const signedQuotes = await prisma.quote.findMany({
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: { gte: twelveMonthsAgo },
      },
      select: { signedAt: true, totalHT: true },
    });

    // Group by month
    const monthlyCA: Record<string, number> = {};
    signedQuotes.forEach((q) => {
      if (q.signedAt) {
        const key = `${q.signedAt.getFullYear()}-${String(q.signedAt.getMonth() + 1).padStart(2, '0')}`;
        monthlyCA[key] = (monthlyCA[key] || 0) + q.totalHT;
      }
    });

    // Quarterly CA breakdown
    const quarterlyCA: Record<string, number> = {};
    signedQuotes.forEach((q) => {
      if (q.signedAt) {
        const quarter = Math.ceil((q.signedAt.getMonth() + 1) / 3);
        const key = `${q.signedAt.getFullYear()}-Q${quarter}`;
        quarterlyCA[key] = (quarterlyCA[key] || 0) + q.totalHT;
      }
    });

    // Annual CA breakdown
    const annualCA: Record<string, number> = {};
    signedQuotes.forEach((q) => {
      if (q.signedAt) {
        const key = `${q.signedAt.getFullYear()}`;
        annualCA[key] = (annualCA[key] || 0) + q.totalHT;
      }
    });

    // Family breakdown via quote lines joined with products
    const familyBreakdown = await prisma.quoteLine.groupBy({
      by: ['productId'],
      _sum: { totalHT: true },
      _count: { id: true },
      where: {
        quote: {
          status: { in: ['SIGNED', 'VALIDATED'] },
          signedAt: { gte: twelveMonthsAgo },
        },
      },
    });

    // Fetch products to map families
    const productIds = familyBreakdown.map((fb) => fb.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, family: true },
    });

    const productFamilyMap: Record<string, string> = {};
    products.forEach((p) => {
      productFamilyMap[p.id] = p.family;
    });

    const familySummary: Record<string, { count: number; totalHT: number }> = {
      SECURITY: { count: 0, totalHT: 0 },
      MAINTENANCE: { count: 0, totalHT: 0 },
      DISPLAY: { count: 0, totalHT: 0 },
      WORKS: { count: 0, totalHT: 0 },
    };

    familyBreakdown.forEach((fb) => {
      const family = productFamilyMap[fb.productId];
      if (family && familySummary[family]) {
        familySummary[family].count += fb._count.id;
        familySummary[family].totalHT += fb._sum.totalHT || 0;
      }
    });

    res.json({
      pipelineByStatus,
      monthlyCA,
      quarterlyCA,
      annualCA,
      familyBreakdown: familySummary,
    });
  } catch (error) {
    console.error('Error fetching pipeline stats:', error);
    res.status(500).json({ error: 'Failed to fetch pipeline statistics' });
  }
});

// =============================================================================
// GET /referrals - Referral Statistics
// =============================================================================
router.get('/referrals', async (req: AuthRequest, res: Response) => {
  try {
    // Total referrals
    const totalReferrals = await prisma.prospect.count({
      where: { isReferred: true },
    });

    // Total signed prospects
    const totalSigned = await prisma.prospect.count({
      where: { status: { in: ['SIGNED', 'INSTALLED'] } },
    });

    // Signed referral prospects
    const signedReferrals = await prisma.prospect.count({
      where: {
        isReferred: true,
        status: { in: ['SIGNED', 'INSTALLED'] },
      },
    });

    // Referral rate (% of all prospects that are referrals)
    const referralRate =
      totalSigned > 0
        ? Math.round((signedReferrals / totalSigned) * 10000) / 100
        : 0;

    // CA from referrals
    const caFromReferrals = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        prospect: { isReferred: true },
      },
    });

    // Top 10 referrers (parrains) with filleul count and CA
    const referrers = await prisma.prospect.findMany({
      where: {
        referrals: { some: {} },
      },
      select: {
        id: true,
        companyName: true,
        decisionMakerName: true,
        referrals: {
          select: {
            id: true,
            status: true,
            quotes: {
              where: { status: { in: ['SIGNED', 'VALIDATED'] } },
              select: { totalHT: true },
            },
          },
        },
      },
    });

    const referrerStats = referrers
      .map((referrer) => {
        const filleulCount = referrer.referrals.length;
        const caGenerated = referrer.referrals.reduce((sum, filleul) => {
          return (
            sum + filleul.quotes.reduce((qSum, q) => qSum + q.totalHT, 0)
          );
        }, 0);

        return {
          referrerId: referrer.id,
          companyName: referrer.companyName,
          decisionMakerName: referrer.decisionMakerName,
          filleulCount,
          caGenerated: Math.round(caGenerated * 100) / 100,
        };
      })
      .sort((a, b) => b.caGenerated - a.caGenerated)
      .slice(0, 10);

    // Per commercial: referral count, referral rate, bonuses earned
    const commercials = await prisma.user.findMany({
      where: { role: 'COMMERCIAL', active: true },
      select: { id: true, firstName: true, lastName: true },
    });

    const perCommercialReferrals = await Promise.all(
      commercials.map(async (commercial) => {
        const totalDeals = await prisma.quote.count({
          where: {
            commercialId: commercial.id,
            status: { in: ['SIGNED', 'VALIDATED'] },
          },
        });
        const referralDeals = await prisma.quote.count({
          where: {
            commercialId: commercial.id,
            status: { in: ['SIGNED', 'VALIDATED'] },
            prospect: { isReferred: true },
          },
        });
        const bonuses = await prisma.commission.aggregate({
          _sum: { amount: true },
          where: {
            commercialId: commercial.id,
            type: 'referral_bonus',
          },
        });

        return {
          commercialId: commercial.id,
          commercialName: `${commercial.firstName} ${commercial.lastName}`,
          referralCount: referralDeals,
          referralRate:
            totalDeals > 0
              ? Math.round((referralDeals / totalDeals) * 10000) / 100
              : 0,
          bonusesEarned: bonuses._sum.amount || 0,
        };
      })
    );

    // Monthly evolution (last 12 months)
    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setFullYear(twelveMonthsAgo.getFullYear() - 1);
    twelveMonthsAgo.setDate(1);

    const referralProspectsMonthly = await prisma.prospect.findMany({
      where: {
        isReferred: true,
        createdAt: { gte: twelveMonthsAgo },
      },
      select: { createdAt: true },
    });

    const monthlyEvolution: Record<string, number> = {};
    referralProspectsMonthly.forEach((p) => {
      const key = `${p.createdAt.getFullYear()}-${String(p.createdAt.getMonth() + 1).padStart(2, '0')}`;
      monthlyEvolution[key] = (monthlyEvolution[key] || 0) + 1;
    });

    res.json({
      totalReferrals,
      referralRate,
      caFromReferrals: caFromReferrals._sum.totalHT || 0,
      topReferrers: referrerStats,
      perCommercialReferrals,
      monthlyEvolution,
    });
  } catch (error) {
    console.error('Error fetching referral stats:', error);
    res.status(500).json({ error: 'Failed to fetch referral statistics' });
  }
});

// =============================================================================
// GET /global - Global KPIs
// =============================================================================
router.get('/global', async (req: AuthRequest, res: Response) => {
  try {
    const now = new Date();

    // Monthly CA (current month)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    const monthlyCA = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: { gte: monthStart, lte: monthEnd },
      },
    });

    // Quarterly CA (current quarter)
    const currentQuarter = Math.ceil((now.getMonth() + 1) / 3);
    const quarterStart = new Date(now.getFullYear(), (currentQuarter - 1) * 3, 1);
    const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3, 0, 23, 59, 59);

    const quarterlyCA = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: { gte: quarterStart, lte: quarterEnd },
      },
    });

    // Annual CA (current year)
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const yearEnd = new Date(now.getFullYear(), 11, 31, 23, 59, 59);

    const annualCA = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: { gte: yearStart, lte: yearEnd },
      },
    });

    // New clients vs complementary sales ratio
    const newClientSales = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      _count: { id: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: { gte: yearStart, lte: yearEnd },
        OR: [{ phase: 1 }, { phase: null }],
      },
    });

    const complementarySales = await prisma.quote.aggregate({
      _sum: { totalHT: true },
      _count: { id: true },
      where: {
        status: { in: ['SIGNED', 'VALIDATED'] },
        signedAt: { gte: yearStart, lte: yearEnd },
        phase: 2,
      },
    });

    // Geographic heat map data (group prospects by postalCode)
    const prospects = await prisma.prospect.findMany({
      where: {
        status: { in: ['SIGNED', 'INSTALLED'] },
      },
      select: {
        postalCode: true,
        lat: true,
        lng: true,
        quotes: {
          where: { status: { in: ['SIGNED', 'VALIDATED'] } },
          select: { totalHT: true },
        },
      },
    });

    const geoData: Record<
      string,
      { count: number; totalCA: number; lat: number | null; lng: number | null }
    > = {};

    prospects.forEach((p) => {
      const ca = p.quotes.reduce((sum, q) => sum + q.totalHT, 0);
      if (!geoData[p.postalCode]) {
        geoData[p.postalCode] = { count: 0, totalCA: 0, lat: p.lat, lng: p.lng };
      }
      geoData[p.postalCode].count += 1;
      geoData[p.postalCode].totalCA += ca;
      // Use the first available lat/lng as representative
      if (!geoData[p.postalCode].lat && p.lat) {
        geoData[p.postalCode].lat = p.lat;
        geoData[p.postalCode].lng = p.lng;
      }
    });

    const heatMapData = Object.entries(geoData).map(([postalCode, data]) => ({
      postalCode,
      ...data,
      totalCA: Math.round(data.totalCA * 100) / 100,
    }));

    // Product family distribution (current year)
    const familyLines = await prisma.quoteLine.groupBy({
      by: ['productId'],
      _sum: { totalHT: true },
      _count: { id: true },
      where: {
        quote: {
          status: { in: ['SIGNED', 'VALIDATED'] },
          signedAt: { gte: yearStart, lte: yearEnd },
        },
      },
    });

    const productIds = familyLines.map((fl) => fl.productId);
    const productsMap = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, family: true },
    });

    const familyLookup: Record<string, string> = {};
    productsMap.forEach((p) => {
      familyLookup[p.id] = p.family;
    });

    const familyDistribution: Record<string, { count: number; totalHT: number }> = {
      SECURITY: { count: 0, totalHT: 0 },
      MAINTENANCE: { count: 0, totalHT: 0 },
      DISPLAY: { count: 0, totalHT: 0 },
      WORKS: { count: 0, totalHT: 0 },
    };

    familyLines.forEach((fl) => {
      const family = familyLookup[fl.productId];
      if (family && familyDistribution[family]) {
        familyDistribution[family].count += fl._count.id;
        familyDistribution[family].totalHT += fl._sum.totalHT || 0;
      }
    });

    res.json({
      totalCA: {
        monthly: monthlyCA._sum.totalHT || 0,
        quarterly: quarterlyCA._sum.totalHT || 0,
        annual: annualCA._sum.totalHT || 0,
      },
      newClientsVsComplementary: {
        newClients: {
          count: newClientSales._count.id,
          totalHT: newClientSales._sum.totalHT || 0,
        },
        complementary: {
          count: complementarySales._count.id,
          totalHT: complementarySales._sum.totalHT || 0,
        },
        ratio:
          (newClientSales._count.id + complementarySales._count.id) > 0
            ? Math.round(
                (newClientSales._count.id /
                  (newClientSales._count.id + complementarySales._count.id)) *
                  10000
              ) / 100
            : 0,
      },
      heatMapData,
      familyDistribution,
    });
  } catch (error) {
    console.error('Error fetching global stats:', error);
    res.status(500).json({ error: 'Failed to fetch global statistics' });
  }
});

// =============================================================================
// GET /gamification - Leaderboard
// =============================================================================
router.get('/gamification', async (req: AuthRequest, res: Response) => {
  try {
    const { period } = req.query;

    const now = new Date();
    let periodStart: Date;

    switch (period) {
      case 'day':
        periodStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'week': {
        const dayOfWeek = now.getDay();
        const mondayOffset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        periodStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate() - mondayOffset
        );
        break;
      }
      case 'month':
      default:
        periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
    }

    const dateFilter = { gte: periodStart, lte: now };

    // Get all active commercials
    const commercials = await prisma.user.findMany({
      where: { role: 'COMMERCIAL', active: true },
      select: { id: true, firstName: true, lastName: true },
    });

    // Build rankings per commercial
    const commercialStats = await Promise.all(
      commercials.map(async (commercial) => {
        // CA signed
        const caAgg = await prisma.quote.aggregate({
          _sum: { totalHT: true },
          _count: { id: true },
          where: {
            commercialId: commercial.id,
            status: { in: ['SIGNED', 'VALIDATED'] },
            signedAt: dateFilter,
          },
        });

        // Appointments completed
        const appointments = await prisma.appointment.count({
          where: {
            commercialId: commercial.id,
            status: 'COMPLETED',
            scheduledAt: dateFilter,
          },
        });

        // Deals count
        const dealCount = caAgg._count.id;

        // Conversion rate
        const conversionRate =
          appointments > 0
            ? Math.round((dealCount / appointments) * 10000) / 100
            : 0;

        // Referral count
        const referralCount = await prisma.quote.count({
          where: {
            commercialId: commercial.id,
            status: { in: ['SIGNED', 'VALIDATED'] },
            signedAt: dateFilter,
            prospect: { isReferred: true },
          },
        });

        return {
          commercialId: commercial.id,
          commercialName: `${commercial.firstName} ${commercial.lastName}`,
          caSigned: caAgg._sum.totalHT || 0,
          dealCount,
          conversionRate,
          referralCount,
          appointmentsCompleted: appointments,
        };
      })
    );

    // Ranking by CA signed
    const rankingByCA = [...commercialStats]
      .sort((a, b) => b.caSigned - a.caSigned)
      .map((item, index) => ({ rank: index + 1, ...item }));

    // Ranking by number of deals
    const rankingByDeals = [...commercialStats]
      .sort((a, b) => b.dealCount - a.dealCount)
      .map((item, index) => ({ rank: index + 1, ...item }));

    // Ranking by conversion rate (minimum 1 appointment to qualify)
    const rankingByConversion = [...commercialStats]
      .filter((s) => s.appointmentsCompleted > 0)
      .sort((a, b) => b.conversionRate - a.conversionRate)
      .map((item, index) => ({ rank: index + 1, ...item }));

    // Referral leaderboard
    const referralLeaderboard = [...commercialStats]
      .sort((a, b) => b.referralCount - a.referralCount)
      .map((item, index) => ({
        rank: index + 1,
        commercialId: item.commercialId,
        commercialName: item.commercialName,
        referralCount: item.referralCount,
      }));

    // Achievements / badges
    const achievements = commercialStats.map((stat) => {
      const badges: Array<{ badge: string; label: string }> = [];

      if (stat.caSigned >= 100000) {
        badges.push({ badge: 'GOLD_SELLER', label: 'Top Vendeur Or (100k+ CA)' });
      } else if (stat.caSigned >= 50000) {
        badges.push({ badge: 'SILVER_SELLER', label: 'Top Vendeur Argent (50k+ CA)' });
      } else if (stat.caSigned >= 20000) {
        badges.push({ badge: 'BRONZE_SELLER', label: 'Top Vendeur Bronze (20k+ CA)' });
      }

      if (stat.conversionRate >= 50) {
        badges.push({ badge: 'CLOSER', label: 'Closer (50%+ conversion)' });
      }

      if (stat.dealCount >= 10) {
        badges.push({ badge: 'DEAL_MACHINE', label: 'Machine a Deals (10+ deals)' });
      }

      if (stat.referralCount >= 5) {
        badges.push({ badge: 'REFERRAL_KING', label: 'Roi du Parrainage (5+ referrals)' });
      } else if (stat.referralCount >= 2) {
        badges.push({ badge: 'REFERRAL_STARTER', label: 'Ambassadeur (2+ referrals)' });
      }

      return {
        commercialId: stat.commercialId,
        commercialName: stat.commercialName,
        badges,
      };
    });

    res.json({
      period: period || 'month',
      periodStart,
      periodEnd: now,
      rankings: {
        byCA: rankingByCA,
        byDeals: rankingByDeals,
        byConversion: rankingByConversion,
      },
      referralLeaderboard,
      achievements,
    });
  } catch (error) {
    console.error('Error fetching gamification stats:', error);
    res.status(500).json({ error: 'Failed to fetch gamification statistics' });
  }
});

export default router;
