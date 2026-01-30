import PDFDocument from 'pdfkit';
import { Writable } from 'stream';

interface QuoteData {
  id: string;
  reference: string;
  createdAt: Date;
  validUntil?: Date;
  prospect: {
    companyName: string;
    siret?: string;
    address: string;
    postalCode: string;
    city: string;
    decisionMakerName: string;
    decisionMakerEmail?: string;
    decisionMakerMobile: string;
  };
  commercial: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
  };
  lines: Array<{
    productName: string;
    description?: string;
    quantity: number;
    unitPriceHT: number;
    tvaRate: number;
  }>;
  upsells?: Array<{
    name: string;
    priceHT: number;
    isMonthly: boolean;
  }>;
  totalHT: number;
  totalTVA: number;
  totalTTC: number;
  monthlyFee?: number;
  paymentMode?: string;
  notes?: string;
  clientSignatureUrl?: string;
  commercialSignatureUrl?: string;
  signedAt?: Date;
}

interface CompanyInfo {
  name: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  email: string;
  siret: string;
  tvaNumber: string;
  website?: string;
  logo?: string;
}

const COMPANY_INFO: CompanyInfo = {
  name: 'SOLUTION GS',
  address: '123 Avenue de la Sécurité',
  postalCode: '75001',
  city: 'Paris',
  phone: '01 23 45 67 89',
  email: 'contact@solution-gs.fr',
  siret: '123 456 789 00012',
  tvaNumber: 'FR12345678901',
  website: 'www.solution-gs.fr',
};

// Colors
const COLORS = {
  primary: '#1e40af', // Blue-800
  secondary: '#3b82f6', // Blue-500
  accent: '#f97316', // Orange-500
  text: '#1f2937', // Gray-800
  lightText: '#6b7280', // Gray-500
  border: '#e5e7eb', // Gray-200
  background: '#f9fafb', // Gray-50
};

export const generateQuotePDF = async (quote: QuoteData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    try {
      const chunks: Buffer[] = [];
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        info: {
          Title: `Devis ${quote.reference}`,
          Author: COMPANY_INFO.name,
          Subject: `Devis pour ${quote.prospect.companyName}`,
        },
      });

      // Collect PDF data
      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      // =====================
      // HEADER
      // =====================

      // Company logo/name
      doc.fontSize(24)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .text(COMPANY_INFO.name, 40, 40);

      doc.fontSize(10)
        .fillColor(COLORS.lightText)
        .font('Helvetica')
        .text(COMPANY_INFO.address, 40, 70)
        .text(`${COMPANY_INFO.postalCode} ${COMPANY_INFO.city}`)
        .text(`Tél: ${COMPANY_INFO.phone}`)
        .text(`Email: ${COMPANY_INFO.email}`);

      // Quote info box (right side)
      const quoteBoxX = 350;
      const quoteBoxY = 40;
      const quoteBoxWidth = 200;
      const quoteBoxHeight = 80;

      doc.rect(quoteBoxX, quoteBoxY, quoteBoxWidth, quoteBoxHeight)
        .fillColor(COLORS.primary)
        .fill();

      doc.fontSize(18)
        .fillColor('#ffffff')
        .font('Helvetica-Bold')
        .text('DEVIS', quoteBoxX + 10, quoteBoxY + 15);

      doc.fontSize(12)
        .font('Helvetica')
        .text(`N° ${quote.reference}`, quoteBoxX + 10, quoteBoxY + 40);

      doc.fontSize(10)
        .text(`Date: ${formatDate(quote.createdAt)}`, quoteBoxX + 10, quoteBoxY + 58);

      // =====================
      // CLIENT INFO
      // =====================

      const clientY = 150;

      doc.rect(40, clientY, 250, 100)
        .strokeColor(COLORS.border)
        .stroke();

      doc.fontSize(10)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .text('CLIENT', 50, clientY + 10);

      doc.fontSize(11)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(quote.prospect.companyName, 50, clientY + 28);

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.text)
        .text(quote.prospect.address, 50, clientY + 45)
        .text(`${quote.prospect.postalCode} ${quote.prospect.city}`)
        .text(`Contact: ${quote.prospect.decisionMakerName}`)
        .text(`Tél: ${quote.prospect.decisionMakerMobile}`);

      // Commercial info
      doc.rect(310, clientY, 240, 100)
        .strokeColor(COLORS.border)
        .stroke();

      doc.fontSize(10)
        .fillColor(COLORS.primary)
        .font('Helvetica-Bold')
        .text('VOTRE CONSEILLER', 320, clientY + 10);

      doc.fontSize(11)
        .fillColor(COLORS.text)
        .font('Helvetica-Bold')
        .text(`${quote.commercial.firstName} ${quote.commercial.lastName}`, 320, clientY + 28);

      if (quote.commercial.email) {
        doc.fontSize(10)
          .font('Helvetica')
          .text(quote.commercial.email, 320, clientY + 45);
      }

      if (quote.commercial.phone) {
        doc.fontSize(10)
          .text(`Tél: ${quote.commercial.phone}`, 320, clientY + 60);
      }

      // Validity
      if (quote.validUntil) {
        doc.fontSize(10)
          .fillColor(COLORS.accent)
          .font('Helvetica-Bold')
          .text(`Offre valable jusqu'au ${formatDate(quote.validUntil)}`, 320, clientY + 80);
      }

      // =====================
      // PRODUCTS TABLE
      // =====================

      let tableY = 280;
      const tableX = 40;
      const tableWidth = 515;
      const colWidths = [220, 60, 80, 75, 80]; // Product, Qty, Unit Price, TVA, Total

      // Table header
      doc.rect(tableX, tableY, tableWidth, 25)
        .fillColor(COLORS.primary)
        .fill();

      doc.fontSize(9)
        .fillColor('#ffffff')
        .font('Helvetica-Bold');

      let colX = tableX + 5;
      const headers = ['DÉSIGNATION', 'QTÉ', 'P.U. HT', 'TVA', 'TOTAL HT'];
      headers.forEach((header, i) => {
        const align = i === 0 ? 'left' : 'right';
        const width = colWidths[i] - 10;
        doc.text(header, colX, tableY + 8, { width, align });
        colX += colWidths[i];
      });

      tableY += 25;

      // Table rows
      doc.font('Helvetica')
        .fillColor(COLORS.text);

      quote.lines.forEach((line, index) => {
        const rowHeight = line.description ? 35 : 25;
        const bgColor = index % 2 === 0 ? '#ffffff' : COLORS.background;

        doc.rect(tableX, tableY, tableWidth, rowHeight)
          .fillColor(bgColor)
          .fill();

        doc.rect(tableX, tableY, tableWidth, rowHeight)
          .strokeColor(COLORS.border)
          .stroke();

        colX = tableX + 5;
        doc.fillColor(COLORS.text).fontSize(9);

        // Product name
        doc.font('Helvetica-Bold')
          .text(line.productName, colX, tableY + 5, { width: colWidths[0] - 10 });

        if (line.description) {
          doc.font('Helvetica')
            .fontSize(8)
            .fillColor(COLORS.lightText)
            .text(line.description, colX, tableY + 18, { width: colWidths[0] - 10 });
        }

        colX += colWidths[0];

        // Quantity
        doc.font('Helvetica')
          .fontSize(9)
          .fillColor(COLORS.text)
          .text(line.quantity.toString(), colX, tableY + 8, { width: colWidths[1] - 10, align: 'right' });
        colX += colWidths[1];

        // Unit price
        doc.text(formatCurrency(line.unitPriceHT), colX, tableY + 8, { width: colWidths[2] - 10, align: 'right' });
        colX += colWidths[2];

        // TVA
        doc.text(`${line.tvaRate}%`, colX, tableY + 8, { width: colWidths[3] - 10, align: 'right' });
        colX += colWidths[3];

        // Total
        const lineTotal = line.quantity * line.unitPriceHT;
        doc.font('Helvetica-Bold')
          .text(formatCurrency(lineTotal), colX, tableY + 8, { width: colWidths[4] - 10, align: 'right' });

        tableY += rowHeight;
      });

      // Upsells
      if (quote.upsells && quote.upsells.length > 0) {
        tableY += 10;
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text('Options et services additionnels:', tableX, tableY);

        tableY += 15;

        quote.upsells.forEach((upsell) => {
          doc.fontSize(9)
            .font('Helvetica')
            .fillColor(COLORS.text)
            .text(`• ${upsell.name}`, tableX + 10, tableY);

          doc.text(
            `${formatCurrency(upsell.priceHT)} ${upsell.isMonthly ? '/mois' : ''}`,
            tableX + 350, tableY, { width: 165, align: 'right' }
          );

          tableY += 15;
        });
      }

      // =====================
      // TOTALS
      // =====================

      tableY += 20;
      const totalsX = 350;
      const totalsWidth = 205;

      // Total HT
      doc.rect(totalsX, tableY, totalsWidth, 25)
        .fillColor(COLORS.background)
        .fill();

      doc.fontSize(10)
        .font('Helvetica')
        .fillColor(COLORS.text)
        .text('Total HT', totalsX + 10, tableY + 7);

      doc.font('Helvetica-Bold')
        .text(formatCurrency(quote.totalHT), totalsX + 100, tableY + 7, { width: 95, align: 'right' });

      tableY += 25;

      // TVA
      doc.rect(totalsX, tableY, totalsWidth, 25)
        .fillColor('#ffffff')
        .fill();

      doc.rect(totalsX, tableY, totalsWidth, 25)
        .strokeColor(COLORS.border)
        .stroke();

      doc.font('Helvetica')
        .text('TVA (20%)', totalsX + 10, tableY + 7);

      doc.font('Helvetica-Bold')
        .text(formatCurrency(quote.totalTVA), totalsX + 100, tableY + 7, { width: 95, align: 'right' });

      tableY += 25;

      // Total TTC
      doc.rect(totalsX, tableY, totalsWidth, 30)
        .fillColor(COLORS.primary)
        .fill();

      doc.fontSize(12)
        .font('Helvetica-Bold')
        .fillColor('#ffffff')
        .text('TOTAL TTC', totalsX + 10, tableY + 8);

      doc.text(formatCurrency(quote.totalTTC), totalsX + 100, tableY + 8, { width: 95, align: 'right' });

      tableY += 30;

      // Monthly fee
      if (quote.monthlyFee && quote.monthlyFee > 0) {
        tableY += 10;
        doc.rect(totalsX, tableY, totalsWidth, 25)
          .fillColor(COLORS.accent)
          .fill();

        doc.fontSize(10)
          .fillColor('#ffffff')
          .text('Mensualité', totalsX + 10, tableY + 7);

        doc.text(`${formatCurrency(quote.monthlyFee)} /mois`, totalsX + 100, tableY + 7, { width: 95, align: 'right' });
      }

      // =====================
      // FOOTER / CONDITIONS
      // =====================

      const footerY = 700;

      // Notes
      if (quote.notes) {
        doc.fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text('Notes:', 40, footerY - 60);

        doc.font('Helvetica')
          .fillColor(COLORS.text)
          .text(quote.notes, 40, footerY - 45, { width: 515 });
      }

      // Payment mode
      if (quote.paymentMode) {
        doc.fontSize(9)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text('Mode de paiement:', 40, footerY - 20);

        doc.font('Helvetica')
          .fillColor(COLORS.text)
          .text(getPaymentModeLabel(quote.paymentMode), 130, footerY - 20);
      }

      // Signature area
      if (quote.signedAt) {
        doc.fontSize(10)
          .font('Helvetica-Bold')
          .fillColor(COLORS.primary)
          .text('DEVIS ACCEPTÉ', 40, footerY + 10);

        doc.fontSize(9)
          .font('Helvetica')
          .fillColor(COLORS.text)
          .text(`Signé le ${formatDate(quote.signedAt)}`, 40, footerY + 25);

        // Signature boxes
        doc.rect(40, footerY + 40, 150, 60)
          .strokeColor(COLORS.border)
          .stroke();

        doc.fontSize(8)
          .text('Signature client', 85, footerY + 45);

        doc.rect(350, footerY + 40, 150, 60)
          .strokeColor(COLORS.border)
          .stroke();

        doc.text('Signature commercial', 390, footerY + 45);
      }

      // Legal mentions
      doc.fontSize(7)
        .fillColor(COLORS.lightText)
        .text(
          `${COMPANY_INFO.name} - SIRET: ${COMPANY_INFO.siret} - TVA: ${COMPANY_INFO.tvaNumber}`,
          40, 780, { align: 'center', width: 515 }
        )
        .text(
          'Conditions générales de vente disponibles sur demande. Devis gratuit, sans engagement.',
          40, 792, { align: 'center', width: 515 }
        );

      // Page number
      doc.fontSize(8)
        .fillColor(COLORS.lightText)
        .text('Page 1/1', 500, 800);

      doc.end();
    } catch (error) {
      reject(error);
    }
  });
};

// Helper functions
function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

function getPaymentModeLabel(mode: string): string {
  const modes: Record<string, string> = {
    CASH: 'Comptant',
    CHECK: 'Chèque',
    CARD: 'Carte bancaire',
    TRANSFER: 'Virement',
    LEASING: 'Leasing',
    FINANCEMENT: 'Financement',
  };
  return modes[mode] || mode;
}

export default { generateQuotePDF };
