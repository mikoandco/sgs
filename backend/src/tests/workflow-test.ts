/**
 * Comprehensive Workflow Test Script
 * Tests all CRM functionalities: prospects, appointments, quotes, geocoding, PDF, etc.
 */

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || 'sgs-secret-key';
const API_BASE = process.env.API_BASE || 'http://localhost:3001/api';

interface TestResult {
  name: string;
  success: boolean;
  error?: string;
  data?: unknown;
}

const results: TestResult[] = [];

function log(message: string) {
  console.log(`[TEST] ${message}`);
}

function logSuccess(testName: string, data?: unknown) {
  results.push({ name: testName, success: true, data });
  console.log(`✅ ${testName}`);
}

function logError(testName: string, error: string) {
  results.push({ name: testName, success: false, error });
  console.log(`❌ ${testName}: ${error}`);
}

async function makeRequest(
  method: string,
  path: string,
  token: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: unknown }> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE}${path}`, options);
  let data;
  const contentType = response.headers.get('content-type');

  if (contentType?.includes('application/json')) {
    data = await response.json();
  } else if (contentType?.includes('application/pdf')) {
    data = { type: 'pdf', size: response.headers.get('content-length') };
  } else {
    data = await response.text();
  }

  return { ok: response.ok, status: response.status, data };
}

async function runTests() {
  log('Starting comprehensive workflow tests...\n');

  let testUser: { id: string; email: string } | null = null;
  let adminToken = '';
  let testProspect: { id: string } | null = null;
  let testAppointment: { id: string } | null = null;
  let testQuote: { id: string; quoteNumber: string } | null = null;
  let testProduct: { id: string } | null = null;
  let testCommercial: { id: string } | null = null;

  // ============================================================
  // 1. DATABASE CONNECTION
  // ============================================================
  log('--- 1. Testing Database Connection ---');
  try {
    await prisma.$connect();
    logSuccess('Database connection');
  } catch (error: any) {
    logError('Database connection', error.message);
    return printSummary();
  }

  // ============================================================
  // 2. CREATE TEST USER (ADMIN)
  // ============================================================
  log('\n--- 2. Creating Test User ---');
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    testUser = await prisma.user.upsert({
      where: { email: 'admin-test@sgs.fr' },
      update: {},
      create: {
        email: 'admin-test@sgs.fr',
        passwordHash: hashedPassword,
        firstName: 'Admin',
        lastName: 'Test',
        role: 'ADMIN',
        phone: '0600000000',
      },
    });
    adminToken = jwt.sign({ userId: testUser.id, role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
    logSuccess('Create admin user', { id: testUser.id, email: testUser.email });
  } catch (error: any) {
    logError('Create admin user', error.message);
    return printSummary();
  }

  // ============================================================
  // 3. CREATE COMMERCIAL USER
  // ============================================================
  log('\n--- 3. Creating Commercial User ---');
  try {
    const hashedPassword = await bcrypt.hash('test123', 10);
    testCommercial = await prisma.user.upsert({
      where: { email: 'commercial-test@sgs.fr' },
      update: {},
      create: {
        email: 'commercial-test@sgs.fr',
        passwordHash: hashedPassword,
        firstName: 'Jean',
        lastName: 'Commercial',
        role: 'COMMERCIAL',
        phone: '0600000001',
      },
    });
    logSuccess('Create commercial user', { id: testCommercial.id });
  } catch (error: any) {
    logError('Create commercial user', error.message);
  }

  // ============================================================
  // 4. CREATE TEST PROSPECT
  // ============================================================
  log('\n--- 4. Creating Test Prospect ---');
  try {
    testProspect = await prisma.prospect.create({
      data: {
        companyName: 'Tabac du Test',
        address: '10 Rue de Rivoli',
        postalCode: '75001',
        city: 'Paris',
        decisionMakerName: 'Pierre Dupont',
        decisionMakerMobile: '0612345678',
        decisionMakerEmail: 'pierre.dupont@tabac-test.fr',
        status: 'NEW',
        need: 'MIXED',
        sdrId: testUser!.id,
      },
    });
    logSuccess('Create prospect', { id: testProspect.id, company: 'Tabac du Test' });
  } catch (error: any) {
    logError('Create prospect', error.message);
  }

  // ============================================================
  // 5. TEST GEOCODING
  // ============================================================
  log('\n--- 5. Testing Geocoding ---');
  if (testProspect) {
    try {
      // Import geocoding service
      const geocoding = await import('../services/geocoding');
      const result = await geocoding.geocodeAddress(
        '10 Rue de Rivoli',
        '75001',
        'Paris'
      );
      if (result.success) {
        // Update prospect with coordinates
        await prisma.prospect.update({
          where: { id: testProspect.id },
          data: { lat: result.lat, lng: result.lng },
        });
        logSuccess('Geocoding address', { lat: result.lat, lng: result.lng, address: result.formattedAddress });
      } else {
        logError('Geocoding address', result.error || 'Unknown error');
      }
    } catch (error: any) {
      logError('Geocoding address', error.message);
    }
  }

  // ============================================================
  // 6. UPDATE PROSPECT STATUS (Qualification)
  // ============================================================
  log('\n--- 6. Testing Prospect Status Update ---');
  if (testProspect) {
    try {
      const updated = await prisma.prospect.update({
        where: { id: testProspect.id },
        data: {
          status: 'QUALIFIED',
          qualifiedAt: new Date(),
          qualificationScore: 85,
          commercialId: testCommercial?.id,
        },
      });
      logSuccess('Update prospect status to QUALIFIED', { status: updated.status, score: updated.qualificationScore });
    } catch (error: any) {
      logError('Update prospect status', error.message);
    }
  }

  // ============================================================
  // 7. CREATE APPOINTMENT
  // ============================================================
  log('\n--- 7. Creating Appointment ---');
  if (testProspect && testCommercial) {
    try {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 1);
      scheduledDate.setHours(10, 0, 0, 0);

      testAppointment = await prisma.appointment.create({
        data: {
          prospectId: testProspect.id,
          commercialId: testCommercial.id,
          sdrId: testUser!.id,
          scheduledAt: scheduledDate,
          duration: 90,
          status: 'SCHEDULED',
          notes: 'Premier RDV - Présentation solutions sécurité',
        },
      });

      // Update prospect status
      await prisma.prospect.update({
        where: { id: testProspect.id },
        data: { status: 'APPOINTMENT_SCHEDULED' },
      });

      logSuccess('Create appointment', {
        id: testAppointment.id,
        date: scheduledDate.toISOString(),
        status: 'SCHEDULED'
      });
    } catch (error: any) {
      logError('Create appointment', error.message);
    }
  }

  // ============================================================
  // 8. CREATE TEST PRODUCT
  // ============================================================
  log('\n--- 8. Creating Test Product ---');
  try {
    testProduct = await prisma.product.upsert({
      where: { reference: 'CAM-TEST-001' },
      update: {},
      create: {
        reference: 'CAM-TEST-001',
        name: 'Caméra Dôme HD Test',
        family: 'SECURITY',
        unitPriceHT: 299.99,
        purchasePrice: 150.00,
        unit: 'piece',
        laborHours: 1.5,
      },
    });
    logSuccess('Create product', { id: testProduct.id, name: 'Caméra Dôme HD Test' });
  } catch (error: any) {
    logError('Create product', error.message);
  }

  // ============================================================
  // 9. CREATE QUOTE
  // ============================================================
  log('\n--- 9. Creating Quote ---');
  if (testProspect && testCommercial && testProduct) {
    try {
      const quoteNumber = `DEV-${Date.now()}`;
      const validUntil = new Date();
      validUntil.setMonth(validUntil.getMonth() + 1);

      testQuote = await prisma.quote.create({
        data: {
          quoteNumber,
          prospectId: testProspect.id,
          commercialId: testCommercial.id,
          status: 'DRAFT',
          validUntil,
          totalHT: 1499.95,
          totalTVA: 299.99,
          totalTTC: 1799.94,
          paymentMode: 'CASH',
          lines: {
            create: [
              {
                productId: testProduct.id,
                designation: 'Caméra Dôme HD Test',
                quantity: 5,
                unitPriceHT: 299.99,
                totalHT: 1499.95,
                sortOrder: 1,
              },
            ],
          },
        },
        include: { lines: true },
      });
      logSuccess('Create quote', {
        id: testQuote.id,
        number: quoteNumber,
        totalTTC: 1799.94,
        linesCount: testQuote.lines?.length || 1
      });
    } catch (error: any) {
      logError('Create quote', error.message);
    }
  }

  // ============================================================
  // 10. TEST PDF GENERATION
  // ============================================================
  log('\n--- 10. Testing PDF Generation ---');
  if (testQuote && testProspect && testCommercial) {
    try {
      const pdfGenerator = await import('../services/pdfGenerator');

      const quoteData = {
        id: testQuote.id,
        reference: testQuote.quoteNumber,
        createdAt: new Date(),
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        prospect: {
          companyName: 'Tabac du Test',
          address: '10 Rue de Rivoli',
          postalCode: '75001',
          city: 'Paris',
          decisionMakerName: 'Pierre Dupont',
          decisionMakerMobile: '0612345678',
        },
        commercial: {
          firstName: 'Jean',
          lastName: 'Commercial',
          email: 'commercial-test@sgs.fr',
        },
        lines: [
          {
            productName: 'Caméra Dôme HD Test',
            description: 'Caméra de surveillance haute définition',
            quantity: 5,
            unitPriceHT: 299.99,
            tvaRate: 20,
          },
        ],
        totalHT: 1499.95,
        totalTVA: 299.99,
        totalTTC: 1799.94,
        paymentMode: 'CASH',
      };

      const pdfBuffer = await pdfGenerator.generateQuotePDF(quoteData);
      logSuccess('Generate PDF', {
        size: `${(pdfBuffer.length / 1024).toFixed(2)} KB`,
        type: 'application/pdf'
      });
    } catch (error: any) {
      logError('Generate PDF', error.message);
    }
  }

  // ============================================================
  // 11. UPDATE QUOTE STATUS (Send)
  // ============================================================
  log('\n--- 11. Update Quote Status ---');
  if (testQuote) {
    try {
      const updated = await prisma.quote.update({
        where: { id: testQuote.id },
        data: { status: 'SENT' },
      });

      // Update prospect status
      await prisma.prospect.update({
        where: { id: testProspect!.id },
        data: { status: 'QUOTE_SENT' },
      });

      logSuccess('Update quote status to SENT', { status: updated.status });
    } catch (error: any) {
      logError('Update quote status', error.message);
    }
  }

  // ============================================================
  // 12. SIGN QUOTE
  // ============================================================
  log('\n--- 12. Sign Quote ---');
  if (testQuote) {
    try {
      const updated = await prisma.quote.update({
        where: { id: testQuote.id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
          clientSignatureUrl: '/signatures/client-signature-test.png',
          commercialSignatureUrl: '/signatures/commercial-signature-test.png',
        },
      });

      // Update prospect status
      await prisma.prospect.update({
        where: { id: testProspect!.id },
        data: {
          status: 'SIGNED',
          signedAt: new Date(),
        },
      });

      logSuccess('Sign quote', { status: updated.status, signedAt: updated.signedAt });
    } catch (error: any) {
      logError('Sign quote', error.message);
    }
  }

  // ============================================================
  // 13. CREATE COMMISSION
  // ============================================================
  log('\n--- 13. Create Commission ---');
  if (testQuote && testCommercial) {
    try {
      const commission = await prisma.commission.create({
        data: {
          commercialId: testCommercial.id,
          quoteId: testQuote.id,
          amount: 149.99,
          type: 'sale',
          description: 'Commission sur vente Tabac du Test',
          status: 'PENDING',
        },
      });
      logSuccess('Create commission', { id: commission.id, amount: commission.amount });
    } catch (error: any) {
      logError('Create commission', error.message);
    }
  }

  // ============================================================
  // 14. CREATE TIMELINE ENTRIES
  // ============================================================
  log('\n--- 14. Create Timeline Entry ---');
  if (testProspect && testUser) {
    try {
      const entry = await prisma.timelineEntry.create({
        data: {
          prospectId: testProspect.id,
          userId: testUser.id,
          type: 'STATUS_CHANGE',
          content: 'Prospect signé - Workflow complet terminé',
          metadata: JSON.stringify({ fromStatus: 'QUOTE_SENT', toStatus: 'SIGNED' }),
        },
      });
      logSuccess('Create timeline entry', { id: entry.id, type: entry.type });
    } catch (error: any) {
      logError('Create timeline entry', error.message);
    }
  }

  // ============================================================
  // 15. TEST DISTANCE CALCULATION
  // ============================================================
  log('\n--- 15. Test Distance Calculation ---');
  try {
    const geocoding = await import('../services/geocoding');

    // Paris to Lyon approximate coordinates
    const distance = geocoding.calculateDistance(48.8566, 2.3522, 45.7640, 4.8357);
    const travelTime = geocoding.estimateTravelTime(distance, 100);

    logSuccess('Distance calculation', {
      from: 'Paris',
      to: 'Lyon',
      distance: `${distance.toFixed(2)} km`,
      estimatedTime: `${travelTime} min (at 100km/h)`
    });
  } catch (error: any) {
    logError('Distance calculation', error.message);
  }

  // ============================================================
  // 16. VERIFY FINAL PROSPECT STATE
  // ============================================================
  log('\n--- 16. Verify Final Prospect State ---');
  if (testProspect) {
    try {
      const finalProspect = await prisma.prospect.findUnique({
        where: { id: testProspect.id },
        include: {
          appointments: true,
          quotes: true,
          timelineEntries: true,
          sdr: { select: { firstName: true, lastName: true } },
          commercial: { select: { firstName: true, lastName: true } },
        },
      });

      logSuccess('Verify final prospect state', {
        status: finalProspect?.status,
        hasCoordinates: !!(finalProspect?.lat && finalProspect?.lng),
        appointmentsCount: finalProspect?.appointments.length,
        quotesCount: finalProspect?.quotes.length,
        timelineEntriesCount: finalProspect?.timelineEntries.length,
        sdr: finalProspect?.sdr ? `${finalProspect.sdr.firstName} ${finalProspect.sdr.lastName}` : null,
        commercial: finalProspect?.commercial ? `${finalProspect.commercial.firstName} ${finalProspect.commercial.lastName}` : null,
      });
    } catch (error: any) {
      logError('Verify final prospect state', error.message);
    }
  }

  // ============================================================
  // CLEANUP (Optional - Comment out to keep test data)
  // ============================================================
  log('\n--- Cleanup ---');
  try {
    if (testQuote) {
      await prisma.quoteLine.deleteMany({ where: { quoteId: testQuote.id } });
      await prisma.commission.deleteMany({ where: { quoteId: testQuote.id } });
      await prisma.quote.delete({ where: { id: testQuote.id } });
    }
    if (testAppointment) {
      await prisma.appointment.delete({ where: { id: testAppointment.id } });
    }
    if (testProspect) {
      await prisma.timelineEntry.deleteMany({ where: { prospectId: testProspect.id } });
      await prisma.prospect.delete({ where: { id: testProspect.id } });
    }
    if (testProduct) {
      await prisma.product.delete({ where: { id: testProduct.id } });
    }
    logSuccess('Cleanup test data');
  } catch (error: any) {
    logError('Cleanup', error.message);
  }

  await prisma.$disconnect();
  printSummary();
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`\nTotal: ${results.length} tests`);
  console.log(`Passed: ${passed} ✅`);
  console.log(`Failed: ${failed} ❌`);

  if (failed > 0) {
    console.log('\nFailed tests:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.name}: ${r.error}`);
    });
  }

  console.log('\n' + '='.repeat(60));
  console.log(failed === 0 ? '🎉 ALL TESTS PASSED!' : '⚠️  SOME TESTS FAILED');
  console.log('='.repeat(60) + '\n');
}

// Run tests
runTests().catch(console.error);
