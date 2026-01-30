import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import PDFDocument from 'pdfkit';
import { generateQuotePDF } from '../services/pdfGenerator';

const router = Router();
const prisma = new PrismaClient();

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// Helper: Convert data to CSV
// ---------------------------------------------------------------------------
function toCSV(data: Record<string, unknown>[], columns: { key: string; label: string }[]): string {
  const header = columns.map(c => `"${c.label}"`).join(';');
  const rows = data.map(row =>
    columns.map(c => {
      const value = row[c.key];
      if (value === null || value === undefined) return '""';
      if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
      if (value instanceof Date) return `"${value.toLocaleDateString('fr-FR')}"`;
      return `"${value}"`;
    }).join(';')
  );
  return [header, ...rows].join('\n');
}

// ---------------------------------------------------------------------------
// GET /prospects - Export prospects to CSV
// ---------------------------------------------------------------------------
router.get('/prospects', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate as string);
      if (endDate) createdAtFilter.lte = new Date(endDate as string);
      where.createdAt = createdAtFilter;
    }

    const prospects = await prisma.prospect.findMany({
      where,
      include: {
        sdr: { select: { firstName: true, lastName: true } },
        commercial: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const columns = [
      { key: 'companyName', label: 'Entreprise' },
      { key: 'decisionMakerName', label: 'Décideur' },
      { key: 'decisionMakerMobile', label: 'Téléphone' },
      { key: 'decisionMakerEmail', label: 'Email' },
      { key: 'address', label: 'Adresse' },
      { key: 'postalCode', label: 'Code Postal' },
      { key: 'city', label: 'Ville' },
      { key: 'status', label: 'Statut' },
      { key: 'need', label: 'Besoin' },
      { key: 'qualificationScore', label: 'Score' },
      { key: 'isTabacSubvention', label: 'Subvention Tabac' },
      { key: 'sdrName', label: 'SDR' },
      { key: 'commercialName', label: 'Commercial' },
      { key: 'createdAt', label: 'Date création' },
    ];

    const data = prospects.map(p => ({
      ...p,
      sdrName: p.sdr ? `${p.sdr.firstName} ${p.sdr.lastName}` : '',
      commercialName: p.commercial ? `${p.commercial.firstName} ${p.commercial.lastName}` : '',
      isTabacSubvention: p.isTabacSubvention ? 'Oui' : 'Non',
    }));

    const csv = toCSV(data as unknown as Record<string, unknown>[], columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="prospects_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv); // BOM for Excel compatibility
  } catch (error) {
    console.error('Error exporting prospects:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

// ---------------------------------------------------------------------------
// GET /quotes - Export quotes to CSV
// ---------------------------------------------------------------------------
router.get('/quotes', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate as string);
      if (endDate) createdAtFilter.lte = new Date(endDate as string);
      where.createdAt = createdAtFilter;
    }

    const quotes = await prisma.quote.findMany({
      where,
      include: {
        prospect: { select: { companyName: true, decisionMakerName: true } },
        commercial: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const columns = [
      { key: 'quoteNumber', label: 'N° Devis' },
      { key: 'companyName', label: 'Entreprise' },
      { key: 'decisionMakerName', label: 'Client' },
      { key: 'commercialName', label: 'Commercial' },
      { key: 'status', label: 'Statut' },
      { key: 'totalHT', label: 'Total HT' },
      { key: 'totalTTC', label: 'Total TTC' },
      { key: 'paymentMode', label: 'Mode paiement' },
      { key: 'createdAt', label: 'Date création' },
      { key: 'signedAt', label: 'Date signature' },
    ];

    const data = quotes.map(q => ({
      ...q,
      companyName: q.prospect.companyName,
      decisionMakerName: q.prospect.decisionMakerName,
      commercialName: `${q.commercial.firstName} ${q.commercial.lastName}`,
    }));

    const csv = toCSV(data as unknown as Record<string, unknown>[], columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="devis_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exporting quotes:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

// ---------------------------------------------------------------------------
// GET /commissions - Export commissions to CSV
// ---------------------------------------------------------------------------
router.get('/commissions', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, commercialId, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (commercialId) where.commercialId = commercialId;
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate as string);
      if (endDate) createdAtFilter.lte = new Date(endDate as string);
      where.createdAt = createdAtFilter;
    }

    const commissions = await prisma.commission.findMany({
      where,
      include: {
        commercial: { select: { firstName: true, lastName: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const columns = [
      { key: 'commercialName', label: 'Commercial' },
      { key: 'commercialEmail', label: 'Email' },
      { key: 'type', label: 'Type' },
      { key: 'amount', label: 'Montant' },
      { key: 'status', label: 'Statut' },
      { key: 'paidAmount', label: 'Montant payé' },
      { key: 'description', label: 'Description' },
      { key: 'createdAt', label: 'Date' },
      { key: 'paidAt', label: 'Date paiement' },
    ];

    const data = commissions.map(c => ({
      ...c,
      commercialName: `${c.commercial.firstName} ${c.commercial.lastName}`,
      commercialEmail: c.commercial.email,
    }));

    const csv = toCSV(data as unknown as Record<string, unknown>[], columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="commissions_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exporting commissions:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

// ---------------------------------------------------------------------------
// GET /payments - Export payments to CSV
// ---------------------------------------------------------------------------
router.get('/payments', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, startDate, endDate } = req.query;

    const where: Record<string, unknown> = {};
    if (status) where.status = status;
    if (startDate || endDate) {
      const createdAtFilter: Record<string, Date> = {};
      if (startDate) createdAtFilter.gte = new Date(startDate as string);
      if (endDate) createdAtFilter.lte = new Date(endDate as string);
      where.createdAt = createdAtFilter;
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        quote: {
          include: {
            prospect: { select: { companyName: true } },
            commercial: { select: { firstName: true, lastName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const columns = [
      { key: 'companyName', label: 'Entreprise' },
      { key: 'quoteNumber', label: 'N° Devis' },
      { key: 'commercialName', label: 'Commercial' },
      { key: 'amount', label: 'Montant' },
      { key: 'type', label: 'Type' },
      { key: 'mode', label: 'Mode' },
      { key: 'status', label: 'Statut' },
      { key: 'reference', label: 'Référence' },
      { key: 'createdAt', label: 'Date création' },
      { key: 'receivedAt', label: 'Date réception' },
    ];

    const data = payments.map(p => ({
      ...p,
      companyName: p.quote.prospect.companyName,
      quoteNumber: p.quote.quoteNumber,
      commercialName: `${p.quote.commercial.firstName} ${p.quote.commercial.lastName}`,
    }));

    const csv = toCSV(data as unknown as Record<string, unknown>[], columns);

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="paiements_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send('\uFEFF' + csv);
  } catch (error) {
    console.error('Error exporting payments:', error);
    res.status(500).json({ error: 'Erreur lors de l\'export' });
  }
});

// ---------------------------------------------------------------------------
// GET /quote/:id/pdf - Generate quote PDF (Professional Template)
// ---------------------------------------------------------------------------
router.get('/quote/:id/pdf', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const quote = await prisma.quote.findUnique({
      where: { id },
      include: {
        prospect: true,
        commercial: true,
        lines: {
          include: { product: true },
          orderBy: { sortOrder: 'asc' },
        },
        upsells: true,
      },
    });

    if (!quote) {
      res.status(404).json({ error: 'Devis non trouvé' });
      return;
    }

    // Transform data for the PDF generator
    const pdfData = {
      id: quote.id,
      reference: quote.quoteNumber,
      createdAt: quote.createdAt,
      validUntil: quote.validUntil,
      prospect: {
        companyName: quote.prospect.companyName,
        siret: quote.prospect.siret || undefined,
        address: quote.prospect.address,
        postalCode: quote.prospect.postalCode,
        city: quote.prospect.city,
        decisionMakerName: quote.prospect.decisionMakerName,
        decisionMakerEmail: quote.prospect.decisionMakerEmail || undefined,
        decisionMakerMobile: quote.prospect.decisionMakerMobile,
      },
      commercial: {
        firstName: quote.commercial.firstName,
        lastName: quote.commercial.lastName,
        email: quote.commercial.email || undefined,
        phone: quote.commercial.phone || undefined,
      },
      lines: quote.lines.map(line => ({
        productName: line.designation,
        description: line.product?.description || undefined,
        quantity: line.quantity,
        unitPriceHT: line.unitPriceHT,
        tvaRate: line.tvaRate || 20,
      })),
      upsells: quote.upsells?.map(upsell => ({
        name: upsell.name,
        priceHT: upsell.priceHT,
        isMonthly: upsell.isMonthly,
      })),
      totalHT: quote.totalHT,
      totalTVA: quote.totalTVA,
      totalTTC: quote.totalTTC,
      monthlyFee: quote.monthlyPayment || undefined,
      paymentMode: quote.paymentMode || undefined,
      notes: quote.notes || undefined,
      signedAt: quote.signedAt || undefined,
    };

    // Generate professional PDF
    const pdfBuffer = await generateQuotePDF(pdfData);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${quote.quoteNumber}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du PDF' });
  }
});

// ---------------------------------------------------------------------------
// GET /stats/report - Generate stats report PDF
// ---------------------------------------------------------------------------
router.get('/stats/report', authorize('DIRECTION', 'ADMIN'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate: Date;

    switch (period) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'quarter':
        startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        break;
      default: // month
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    }

    // Fetch stats
    const [
      totalProspects,
      newProspects,
      totalQuotes,
      signedQuotes,
      totalCA,
      topCommercials,
    ] = await Promise.all([
      prisma.prospect.count(),
      prisma.prospect.count({ where: { createdAt: { gte: startDate } } }),
      prisma.quote.count({ where: { createdAt: { gte: startDate } } }),
      prisma.quote.count({ where: { status: 'SIGNED', signedAt: { gte: startDate } } }),
      prisma.quote.aggregate({
        where: { status: { in: ['SIGNED', 'VALIDATED'] }, signedAt: { gte: startDate } },
        _sum: { totalTTC: true },
      }),
      prisma.quote.groupBy({
        by: ['commercialId'],
        where: { status: { in: ['SIGNED', 'VALIDATED'] }, signedAt: { gte: startDate } },
        _sum: { totalTTC: true },
        _count: true,
        orderBy: { _sum: { totalTTC: 'desc' } },
        take: 5,
      }),
    ]);

    // Get commercial names
    const commercialIds = topCommercials.map(c => c.commercialId);
    const commercials = await prisma.user.findMany({
      where: { id: { in: commercialIds } },
      select: { id: true, firstName: true, lastName: true },
    });

    // Create PDF
    const doc = new PDFDocument({ size: 'A4', margin: 50 });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="rapport_${period}_${new Date().toISOString().split('T')[0]}.pdf"`);

    doc.pipe(res);

    // Header
    doc.fontSize(24).fillColor('#2563eb').text('RAPPORT DE PERFORMANCE', 50, 50, { align: 'center' });
    doc.fontSize(12).fillColor('#666').text(`Période: ${startDate.toLocaleDateString('fr-FR')} - ${now.toLocaleDateString('fr-FR')}`, 50, 85, { align: 'center' });

    // KPIs
    let y = 140;
    const kpiWidth = 120;
    const kpis = [
      { label: 'Prospects', value: totalProspects.toString(), subvalue: `+${newProspects} nouveaux` },
      { label: 'Devis créés', value: totalQuotes.toString(), subvalue: '' },
      { label: 'Devis signés', value: signedQuotes.toString(), subvalue: `${totalQuotes > 0 ? Math.round(signedQuotes / totalQuotes * 100) : 0}% conv.` },
      { label: 'CA réalisé', value: `${((totalCA._sum.totalTTC || 0) / 1000).toFixed(1)}k€`, subvalue: '' },
    ];

    kpis.forEach((kpi, i) => {
      const x = 50 + i * (kpiWidth + 20);
      doc.fillColor('#f3f4f6').roundedRect(x, y, kpiWidth, 80, 5).fill();
      doc.fillColor('#333').fontSize(10).text(kpi.label, x + 10, y + 10);
      doc.fillColor('#2563eb').fontSize(24).text(kpi.value, x + 10, y + 30);
      if (kpi.subvalue) {
        doc.fillColor('#666').fontSize(8).text(kpi.subvalue, x + 10, y + 60);
      }
    });

    // Top commercials
    y = 260;
    doc.fillColor('#333').fontSize(14).text('Top 5 Commerciaux', 50, y);
    y += 30;

    topCommercials.forEach((tc, i) => {
      const commercial = commercials.find(c => c.id === tc.commercialId);
      const name = commercial ? `${commercial.firstName} ${commercial.lastName}` : 'N/A';
      const ca = tc._sum.totalTTC || 0;

      doc.fillColor('#333').fontSize(10);
      doc.text(`${i + 1}. ${name}`, 60, y);
      doc.text(`${tc._count} ventes`, 250, y);
      doc.text(`${ca.toLocaleString('fr-FR')} €`, 350, y);

      // Progress bar
      const maxCA = topCommercials[0]._sum.totalTTC || 1;
      const barWidth = (ca / maxCA) * 150;
      doc.fillColor('#dbeafe').rect(400, y + 2, 150, 12).fill();
      doc.fillColor('#2563eb').rect(400, y + 2, barWidth, 12).fill();

      y += 25;
    });

    // Footer
    doc.fontSize(8).fillColor('#666');
    doc.text(`Rapport généré le ${now.toLocaleDateString('fr-FR')} à ${now.toLocaleTimeString('fr-FR')}`, 50, 780, { align: 'center' });

    doc.end();
  } catch (error) {
    console.error('Error generating stats report:', error);
    res.status(500).json({ error: 'Erreur lors de la génération du rapport' });
  }
});

export default router;
