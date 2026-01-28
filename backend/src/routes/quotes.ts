import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Generate a quote number in the format DV-YYYYMMDD-NNN
 * where NNN is a zero-padded sequential number based on how many quotes
 * were already created today.
 */
async function generateQuoteNumber(): Promise<string> {
  const now = new Date();
  const yyyy = now.getFullYear().toString();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}${mm}${dd}`;

  // Count quotes created today
  const dayStart = new Date(now);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(now);
  dayEnd.setUTCHours(23, 59, 59, 999);

  const todayCount = await prisma.quote.count({
    where: {
      createdAt: { gte: dayStart, lte: dayEnd },
    },
  });

  const seq = String(todayCount + 1).padStart(3, '0');
  return `DV-${dateStr}-${seq}`;
}

/**
 * Recalculate totalHT, totalTVA, totalTTC for a quote based on its lines
 * and discount.
 */
async function recalculateTotals(quoteId: string): Promise<void> {
  const quote = await prisma.quote.findUnique({
    where: { id: quoteId },
    include: { lines: true },
  });

  if (!quote) return;

  // Sum of all line totals
  const linesSubtotal = quote.lines.reduce((sum, line) => sum + line.totalHT, 0);

  // Apply discount
  let discountAmount = 0;
  if (quote.discountPercent && quote.discountPercent > 0) {
    discountAmount = linesSubtotal * (quote.discountPercent / 100);
  }

  const totalHT = Math.round((linesSubtotal - discountAmount) * 100) / 100;
  const totalTVA = Math.round(totalHT * 0.2 * 100) / 100;
  const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;

  await prisma.quote.update({
    where: { id: quoteId },
    data: {
      totalHT,
      totalTVA,
      totalTTC,
      discountAmount: Math.round(discountAmount * 100) / 100,
    },
  });
}

// ---------------------------------------------------------------------------
// GET / - List quotes with filters and pagination
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      status,
      commercialId,
      prospectId,
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

    if (commercialId) {
      where.commercialId = commercialId as string;
    }

    if (prospectId) {
      where.prospectId = prospectId as string;
    }

    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate as string);
      if (endDate) createdAtFilter.lte = new Date(endDate as string);
      where.createdAt = createdAtFilter;
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
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
          _count: {
            select: { lines: true },
          },
        },
      }),
      prisma.quote.count({ where }),
    ]);

    res.json({
      data: quotes,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error listing quotes:', error);
    res.status(500).json({ error: 'Failed to list quotes' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get quote by id with all relations
// ---------------------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
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
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        upsells: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        validations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    res.json({ data: quote });
  } catch (error) {
    console.error('Error fetching quote:', error);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create quote
// ---------------------------------------------------------------------------
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const {
      prospectId,
      lines,
      upsells,
      paymentMode,
      discountPercent,
      validDays = 30,
      phase,
      isTabacSubvention,
    } = req.body;

    if (!prospectId) {
      res.status(400).json({ error: 'prospectId is required' });
      return;
    }

    // Verify prospect exists
    const prospect = await prisma.prospect.findUnique({ where: { id: prospectId } });
    if (!prospect) {
      res.status(404).json({ error: 'Prospect not found' });
      return;
    }

    // Generate quote number
    const quoteNumber = await generateQuoteNumber();

    // Calculate validUntil
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + (validDays || 30));

    // Create everything in a transaction
    const createdQuote = await prisma.$transaction(async (tx) => {
      // Create the quote
      const quote = await tx.quote.create({
        data: {
          quoteNumber,
          prospectId,
          commercialId: req.userId!,
          status: 'DRAFT',
          validUntil,
          discountPercent: discountPercent || null,
          paymentMode: paymentMode || null,
          phase: phase || null,
          isTabacSubvention: isTabacSubvention || false,
        },
      });

      // Create lines
      if (lines && Array.isArray(lines) && lines.length > 0) {
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const product = await tx.product.findUnique({
            where: { id: line.productId },
          });

          if (!product) continue;

          const unitPrice = line.unitPriceHT !== undefined ? line.unitPriceHT : product.unitPriceHT;
          const quantity = line.quantity || 1;
          const totalHT = unitPrice * quantity;

          await tx.quoteLine.create({
            data: {
              quoteId: quote.id,
              productId: line.productId,
              designation: product.name,
              quantity,
              unitPriceHT: unitPrice,
              totalHT,
              laborHours: product.laborHours || null,
              sortOrder: i,
            },
          });
        }
      }

      // Create upsells
      if (upsells && Array.isArray(upsells) && upsells.length > 0) {
        for (const upsell of upsells) {
          await tx.quoteUpsell.create({
            data: {
              quoteId: quote.id,
              name: upsell.name,
              description: upsell.description || null,
              priceHT: upsell.priceHT,
              isMonthly: upsell.isMonthly || false,
            },
          });
        }
      }

      // Calculate totals
      const allLines = await tx.quoteLine.findMany({ where: { quoteId: quote.id } });
      const linesSubtotal = allLines.reduce((sum, l) => sum + l.totalHT, 0);
      let discountAmount = 0;
      if (discountPercent && discountPercent > 0) {
        discountAmount = linesSubtotal * (discountPercent / 100);
      }
      const totalHT = Math.round((linesSubtotal - discountAmount) * 100) / 100;
      const totalTVA = Math.round(totalHT * 0.2 * 100) / 100;
      const totalTTC = Math.round((totalHT + totalTVA) * 100) / 100;

      await tx.quote.update({
        where: { id: quote.id },
        data: {
          totalHT,
          totalTVA,
          totalTTC,
          discountAmount: Math.round(discountAmount * 100) / 100,
        },
      });

      // Create timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId,
          userId: req.userId!,
          type: 'QUOTE_CREATED',
          content: `Devis ${quoteNumber} créé`,
          metadata: JSON.stringify({ quoteId: quote.id, quoteNumber }),
        },
      });

      return quote.id;
    });

    // Fetch the complete quote with all relations
    const fullQuote = await prisma.quote.findUnique({
      where: { id: createdQuote },
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
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        upsells: true,
        payments: true,
        validations: true,
      },
    });

    res.status(201).json({ data: fullQuote });
  } catch (error) {
    console.error('Error creating quote:', error);
    res.status(500).json({ error: 'Failed to create quote' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id - Update quote
// ---------------------------------------------------------------------------
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      lines,
      upsells,
      discountPercent,
      paymentMode,
      leasingOrganism,
      leasingDuration,
      monthlyPayment,
    } = req.body;

    const existing = await prisma.quote.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    if (existing.status === 'SIGNED' || existing.status === 'VALIDATED') {
      res.status(400).json({ error: 'Cannot update a quote that is SIGNED or VALIDATED' });
      return;
    }

    // Update base fields
    const updateData: Record<string, unknown> = {};
    if (discountPercent !== undefined) updateData.discountPercent = discountPercent;
    if (paymentMode !== undefined) updateData.paymentMode = paymentMode;
    if (leasingOrganism !== undefined) updateData.leasingOrganism = leasingOrganism;
    if (leasingDuration !== undefined) updateData.leasingDuration = leasingDuration;
    if (monthlyPayment !== undefined) updateData.monthlyPayment = monthlyPayment;

    await prisma.quote.update({
      where: { id },
      data: updateData,
    });

    // Replace lines if provided
    if (lines && Array.isArray(lines)) {
      await prisma.quoteLine.deleteMany({ where: { quoteId: id } });

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const product = await prisma.product.findUnique({
          where: { id: line.productId },
        });

        if (!product) continue;

        const unitPrice = line.unitPriceHT !== undefined ? line.unitPriceHT : product.unitPriceHT;
        const quantity = line.quantity || 1;
        const totalHT = unitPrice * quantity;

        await prisma.quoteLine.create({
          data: {
            quoteId: id,
            productId: line.productId,
            designation: product.name,
            quantity,
            unitPriceHT: unitPrice,
            totalHT,
            laborHours: product.laborHours || null,
            sortOrder: i,
          },
        });
      }
    }

    // Replace upsells if provided
    if (upsells && Array.isArray(upsells)) {
      await prisma.quoteUpsell.deleteMany({ where: { quoteId: id } });

      for (const upsell of upsells) {
        await prisma.quoteUpsell.create({
          data: {
            quoteId: id,
            name: upsell.name,
            description: upsell.description || null,
            priceHT: upsell.priceHT,
            isMonthly: upsell.isMonthly || false,
          },
        });
      }
    }

    // Recalculate totals
    await recalculateTotals(id);

    // Return updated quote
    const updatedQuote = await prisma.quote.findUnique({
      where: { id },
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
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        upsells: true,
        payments: true,
        validations: true,
      },
    });

    res.json({ data: updatedQuote });
  } catch (error) {
    console.error('Error updating quote:', error);
    res.status(500).json({ error: 'Failed to update quote' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/sign - Sign quote
// ---------------------------------------------------------------------------
router.post('/:id/sign', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      clientSignatureUrl,
      commercialSignatureUrl,
      checkNumber,
      checkPhotoUrl,
      leasingOrganism,
      leasingDuration,
    } = req.body;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: { prospect: true },
    });

    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    if (quote.status === 'SIGNED' || quote.status === 'VALIDATED') {
      res.status(400).json({ error: 'Quote is already signed or validated' });
      return;
    }

    // Determine deposit amount based on payment mode
    // For cash: 30% if totalHT > 5000, 20% otherwise
    const depositPercent = quote.totalHT > 5000 ? 30 : 20;
    const depositAmount = Math.round(quote.totalTTC * (depositPercent / 100) * 100) / 100;

    // Calculate monthly payment for leasing
    let monthlyPayment: number | null = null;
    if (quote.paymentMode === 'LEASING' && leasingDuration) {
      monthlyPayment = Math.round((quote.totalTTC / leasingDuration) * 100) / 100;
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the quote
      const signedQuote = await tx.quote.update({
        where: { id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          clientSignatureUrl: clientSignatureUrl || null,
          commercialSignatureUrl: commercialSignatureUrl || null,
          depositPercent,
          depositAmount,
          checkNumber: checkNumber || null,
          checkPhotoUrl: checkPhotoUrl || null,
          leasingOrganism: leasingOrganism || null,
          leasingDuration: leasingDuration || null,
          monthlyPayment,
        },
      });

      // Update prospect status to SIGNED
      await tx.prospect.update({
        where: { id: quote.prospectId },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
        },
      });

      // Create Payment record for deposit
      await tx.payment.create({
        data: {
          quoteId: id,
          amount: depositAmount,
          type: 'deposit',
          mode: quote.paymentMode === 'LEASING' ? 'transfer' : 'check',
          status: 'PENDING',
          reference: checkNumber || null,
        },
      });

      // Create timeline entry
      await tx.timelineEntry.create({
        data: {
          prospectId: quote.prospectId,
          userId: req.userId!,
          type: 'QUOTE_SIGNED',
          content: `Devis ${quote.quoteNumber} signé`,
          metadata: JSON.stringify({
            quoteId: id,
            quoteNumber: quote.quoteNumber,
            paymentMode: quote.paymentMode,
            depositPercent,
            depositAmount,
          }),
        },
      });

      // Create Validation record
      await tx.validation.create({
        data: {
          quoteId: id,
          type: 'quote_approval',
          status: 'PENDING',
        },
      });

      return signedQuote;
    });

    // Fetch complete signed quote
    const fullQuote = await prisma.quote.findUnique({
      where: { id },
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
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        upsells: true,
        payments: {
          orderBy: { createdAt: 'desc' },
        },
        validations: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    res.json({ data: fullQuote });
  } catch (error) {
    console.error('Error signing quote:', error);
    res.status(500).json({ error: 'Failed to sign quote' });
  }
});

// ---------------------------------------------------------------------------
// POST /:id/pdf - Generate PDF placeholder
// ---------------------------------------------------------------------------
router.post('/:id/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({ where: { id } });
    if (!quote) {
      res.status(404).json({ error: 'Quote not found' });
      return;
    }

    const pdfUrl = `/documents/quotes/${quote.quoteNumber}.pdf`;

    await prisma.quote.update({
      where: { id },
      data: { pdfUrl },
    });

    res.json({ data: { pdfUrl }, message: 'PDF URL placeholder set' });
  } catch (error) {
    console.error('Error generating PDF placeholder:', error);
    res.status(500).json({ error: 'Failed to generate PDF placeholder' });
  }
});

export default router;
