import { PrismaClient, UserRole, ProductFamily, QuestionType, QuestionCategory, DayOfWeek } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // ============================================
  // Users
  // ============================================
  const passwordHash = await bcrypt.hash('password123', 10);

  const admin = await prisma.user.create({
    data: {
      email: 'admin@solutionsg.fr',
      passwordHash,
      firstName: 'Admin',
      lastName: 'SolutionGS',
      role: UserRole.ADMIN,
      phone: '0100000000',
    },
  });

  const direction = await prisma.user.create({
    data: {
      email: 'direction@solutionsg.fr',
      passwordHash,
      firstName: 'Marie',
      lastName: 'Dupont',
      role: UserRole.DIRECTION,
      phone: '0100000001',
    },
  });

  const commercial1 = await prisma.user.create({
    data: {
      email: 'commercial1@solutionsg.fr',
      passwordHash,
      firstName: 'Pierre',
      lastName: 'Martin',
      role: UserRole.COMMERCIAL,
      phone: '0600000001',
    },
  });

  const commercial2 = await prisma.user.create({
    data: {
      email: 'commercial2@solutionsg.fr',
      passwordHash,
      firstName: 'Sophie',
      lastName: 'Bernard',
      role: UserRole.COMMERCIAL,
      phone: '0600000002',
    },
  });

  const sdr1 = await prisma.user.create({
    data: {
      email: 'sdr1@solutionsg.fr',
      passwordHash,
      firstName: 'Lucas',
      lastName: 'Petit',
      role: UserRole.SDR,
      phone: '0100000010',
    },
  });

  const sdr2 = await prisma.user.create({
    data: {
      email: 'sdr2@solutionsg.fr',
      passwordHash,
      firstName: 'Emma',
      lastName: 'Moreau',
      role: UserRole.SDR,
      phone: '0100000011',
    },
  });

  console.log('Users created');

  // ============================================
  // Zones
  // ============================================
  const zoneParis = await prisma.zone.create({
    data: { name: 'Paris / Hauts-de-Seine', departments: ['75', '92'] },
  });
  const zoneValDeMarne = await prisma.zone.create({
    data: { name: 'Val-de-Marne', departments: ['94'] },
  });
  const zoneSeineSaintDenis = await prisma.zone.create({
    data: { name: 'Seine-Saint-Denis', departments: ['93'] },
  });
  const zoneYvelinesEssonne = await prisma.zone.create({
    data: { name: 'Yvelines / Essonne', departments: ['78', '91'] },
  });
  const zoneValDOise = await prisma.zone.create({
    data: { name: "Val-d'Oise / Seine-et-Marne", departments: ['95', '77'] },
  });

  // Zone assignments for commercial1
  await prisma.zoneAssignment.createMany({
    data: [
      { userId: commercial1.id, zoneId: zoneParis.id, dayOfWeek: DayOfWeek.MONDAY },
      { userId: commercial1.id, zoneId: zoneValDeMarne.id, dayOfWeek: DayOfWeek.TUESDAY },
      { userId: commercial1.id, zoneId: zoneSeineSaintDenis.id, dayOfWeek: DayOfWeek.WEDNESDAY },
      { userId: commercial1.id, zoneId: zoneYvelinesEssonne.id, dayOfWeek: DayOfWeek.THURSDAY },
      { userId: commercial1.id, zoneId: zoneValDOise.id, dayOfWeek: DayOfWeek.FRIDAY },
    ],
  });

  // Zone assignments for commercial2
  await prisma.zoneAssignment.createMany({
    data: [
      { userId: commercial2.id, zoneId: zoneValDeMarne.id, dayOfWeek: DayOfWeek.MONDAY },
      { userId: commercial2.id, zoneId: zoneSeineSaintDenis.id, dayOfWeek: DayOfWeek.TUESDAY },
      { userId: commercial2.id, zoneId: zoneParis.id, dayOfWeek: DayOfWeek.WEDNESDAY },
      { userId: commercial2.id, zoneId: zoneValDOise.id, dayOfWeek: DayOfWeek.THURSDAY },
      { userId: commercial2.id, zoneId: zoneYvelinesEssonne.id, dayOfWeek: DayOfWeek.FRIDAY },
    ],
  });

  console.log('Zones and assignments created');

  // ============================================
  // Products
  // ============================================
  const products = await Promise.all([
    // Security products
    prisma.product.create({
      data: { reference: 'CAM-DOME-01', name: 'Caméra dôme IP 4MP', family: ProductFamily.SECURITY, unitPriceHT: 350, purchasePrice: 150, unit: 'pièce', laborHours: 1.5 },
    }),
    prisma.product.create({
      data: { reference: 'CAM-BULL-01', name: 'Caméra bullet IP 4MP', family: ProductFamily.SECURITY, unitPriceHT: 320, purchasePrice: 130, unit: 'pièce', laborHours: 1.5 },
    }),
    prisma.product.create({
      data: { reference: 'NVR-16CH', name: 'Enregistreur NVR 16 canaux', family: ProductFamily.SECURITY, unitPriceHT: 890, purchasePrice: 400, unit: 'pièce', laborHours: 2 },
    }),
    prisma.product.create({
      data: { reference: 'ECR-CTRL-22', name: 'Écran de contrôle 22 pouces', family: ProductFamily.SECURITY, unitPriceHT: 280, purchasePrice: 120, unit: 'pièce', laborHours: 0.5 },
    }),
    prisma.product.create({
      data: { reference: 'ALR-CENT-01', name: "Centrale d'alarme anti-intrusion", family: ProductFamily.SECURITY, unitPriceHT: 750, purchasePrice: 320, unit: 'pièce', laborHours: 3 },
    }),
    prisma.product.create({
      data: { reference: 'DET-MVT-01', name: 'Détecteur de mouvement IR', family: ProductFamily.SECURITY, unitPriceHT: 120, purchasePrice: 45, unit: 'pièce', laborHours: 0.5 },
    }),
    prisma.product.create({
      data: { reference: 'SIR-INT-01', name: 'Sirène intérieure', family: ProductFamily.SECURITY, unitPriceHT: 95, purchasePrice: 35, unit: 'pièce', laborHours: 0.5 },
    }),
    prisma.product.create({
      data: { reference: 'SIR-EXT-01', name: 'Sirène extérieure flash', family: ProductFamily.SECURITY, unitPriceHT: 180, purchasePrice: 70, unit: 'pièce', laborHours: 1 },
    }),
    prisma.product.create({
      data: { reference: 'GEN-BROU-01', name: 'Générateur de brouillard', family: ProductFamily.SECURITY, unitPriceHT: 1200, purchasePrice: 550, unit: 'pièce', laborHours: 2 },
    }),
    prisma.product.create({
      data: { reference: 'CBL-FORF', name: 'Câblage forfait standard', family: ProductFamily.SECURITY, unitPriceHT: 450, purchasePrice: 150, unit: 'forfait', laborHours: 4 },
    }),
    prisma.product.create({
      data: { reference: 'MO-INSTALL', name: "Main d'œuvre installation", family: ProductFamily.SECURITY, unitPriceHT: 55, purchasePrice: 25, unit: 'heure', laborHours: 1 },
    }),
    prisma.product.create({
      data: { reference: 'COFFRE-01', name: 'Coffre-fort agréé', family: ProductFamily.SECURITY, unitPriceHT: 650, purchasePrice: 300, unit: 'pièce', laborHours: 2 },
    }),
    prisma.product.create({
      data: { reference: 'RID-MET-01', name: 'Rideau métallique motorisé', family: ProductFamily.SECURITY, unitPriceHT: 1800, purchasePrice: 800, unit: 'pièce', laborHours: 4 },
    }),
    prisma.product.create({
      data: { reference: 'VIT-ANTI-01', name: 'Vitrage anti-effraction', family: ProductFamily.SECURITY, unitPriceHT: 250, purchasePrice: 100, unit: 'm2', laborHours: 1.5 },
    }),
    // Maintenance
    prisma.product.create({
      data: { reference: 'MAINT-AN', name: 'Contrat maintenance annuelle', family: ProductFamily.MAINTENANCE, unitPriceHT: 480, purchasePrice: 100, unit: 'forfait' },
    }),
    prisma.product.create({
      data: { reference: 'TELESURV-AN', name: 'Télésurveillance 24/7 annuelle', family: ProductFamily.MAINTENANCE, unitPriceHT: 360, purchasePrice: 120, unit: 'forfait' },
    }),
    prisma.product.create({
      data: { reference: 'GAR-EXT-5', name: 'Extension garantie 5 ans', family: ProductFamily.MAINTENANCE, unitPriceHT: 590, purchasePrice: 200, unit: 'forfait' },
    }),
    // Display
    prisma.product.create({
      data: { reference: 'ECR-VIT-55', name: 'Écran vitrine 55 pouces haute luminosité', family: ProductFamily.DISPLAY, unitPriceHT: 2200, purchasePrice: 1100, unit: 'pièce', laborHours: 2 },
    }),
    prisma.product.create({
      data: { reference: 'ECR-INT-43', name: 'Écran intérieur 43 pouces', family: ProductFamily.DISPLAY, unitPriceHT: 890, purchasePrice: 420, unit: 'pièce', laborHours: 1 },
    }),
    prisma.product.create({
      data: { reference: 'PLAYER-AI', name: 'ThePlayerAI - Licence annuelle', family: ProductFamily.DISPLAY, unitPriceHT: 600, purchasePrice: 200, unit: 'forfait' },
    }),
    // Works
    prisma.product.create({
      data: { reference: 'TRAV-ELEC', name: 'Travaux électriques', family: ProductFamily.WORKS, unitPriceHT: 75, purchasePrice: 30, unit: 'heure', laborHours: 1 },
    }),
    prisma.product.create({
      data: { reference: 'TRAV-MENUI', name: 'Travaux menuiserie', family: ProductFamily.WORKS, unitPriceHT: 85, purchasePrice: 35, unit: 'heure', laborHours: 1 },
    }),
  ]);

  console.log('Products created');

  // ============================================
  // Kit: Tabac Standard
  // ============================================
  const kitTabac = await prisma.kit.create({
    data: {
      name: 'Kit Tabac Standard',
      description: 'Pack sécurité complet pour débit de tabac - Éligible subvention',
      items: {
        create: [
          { productId: products[0].id, quantity: 4 },  // 4 caméras dôme
          { productId: products[2].id, quantity: 1 },  // 1 NVR
          { productId: products[3].id, quantity: 1 },  // 1 écran contrôle
          { productId: products[4].id, quantity: 1 },  // 1 centrale alarme
          { productId: products[5].id, quantity: 2 },  // 2 détecteurs
          { productId: products[6].id, quantity: 1 },  // 1 sirène int
          { productId: products[7].id, quantity: 1 },  // 1 sirène ext
          { productId: products[8].id, quantity: 1 },  // 1 générateur brouillard
          { productId: products[9].id, quantity: 1 },  // câblage forfait
        ],
      },
    },
  });

  console.log('Kits created');

  // ============================================
  // Qualification Questions - Security
  // ============================================
  const q1 = await prisma.qualificationQuestion.create({
    data: { text: 'Déjà équipé en sécurité ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 1 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "Ancienneté de l'installation", type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q1.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 2, options: '["Moins de 1 an","1 à 3 ans","Plus de 4 ans"]' },
  });

  const q3 = await prisma.qualificationQuestion.create({
    data: { text: 'Présence de caméras ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 3 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Nombre de caméras', type: QuestionType.NUMBER, category: QuestionCategory.SECURITY, parentId: q3.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 4 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Ancienneté des caméras', type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q3.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 5, options: '["Moins de 4 ans","Plus de 4 ans"]' },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'État de fonctionnement des caméras', type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q3.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 6, options: '["Bon","Moyen","Mauvais"]' },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Toutes les zones couvertes ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, parentId: q3.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 7 },
  });

  const q8 = await prisma.qualificationQuestion.create({
    data: { text: "Présence d'alarme ?", type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 8 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "Ancienneté de l'alarme", type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q8.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 9, options: '["Moins de 4 ans","Plus de 4 ans"]' },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "État de fonctionnement de l'alarme", type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q8.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 10, options: '["Bon","Moyen","Mauvais"]' },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Télésurveillance active ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, parentId: q8.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 11 },
  });

  const q12 = await prisma.qualificationQuestion.create({
    data: { text: 'Présence de générateur de brouillard ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 12 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "Nombre d'unités de générateur", type: QuestionType.NUMBER, category: QuestionCategory.SECURITY, parentId: q12.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 13 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Positions des générateurs', type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q12.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 14, options: '["Linéaire tabac","Réserve tabac","Autre"]' },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Ancienneté des générateurs', type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q12.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 15, options: '["Moins de 4 ans","Plus de 4 ans"]' },
  });

  await prisma.qualificationQuestion.create({
    data: { text: 'Porte blindée ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 16 },
  });

  const q17 = await prisma.qualificationQuestion.create({
    data: { text: 'Rideaux métalliques ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 17 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Rideaux motorisés ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, parentId: q17.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 18 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'État des rideaux', type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.SECURITY, parentId: q17.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 19, options: '["Bon","À remplacer"]' },
  });

  const q20 = await prisma.qualificationQuestion.create({
    data: { text: 'Coffre-fort ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 20 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "Date d'installation du coffre-fort (approximative)", type: QuestionType.TEXT, category: QuestionCategory.SECURITY, parentId: q20.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 21 },
  });

  await prisma.qualificationQuestion.create({
    data: { text: 'Vitrine anti-effraction ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 22 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Serrures certifiées A2P ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 23 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "Porte d'entrée aux normes PMR (≥ 93 cm) ?", type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 24 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Visuels extérieurs de dissuasion ?', type: QuestionType.YES_NO, category: QuestionCategory.SECURITY, displayOrder: 25 },
  });

  // Display questions
  const qd1 = await prisma.qualificationQuestion.create({
    data: { text: 'Équipé en écrans ?', type: QuestionType.YES_NO, category: QuestionCategory.DISPLAY, displayOrder: 1 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: "Nombre d'écrans", type: QuestionType.NUMBER, category: QuestionCategory.DISPLAY, parentId: qd1.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 2 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Position des écrans', type: QuestionType.MULTIPLE_CHOICE, category: QuestionCategory.DISPLAY, parentId: qd1.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 3, options: '["Vitrine","Intérieur","Les deux"]' },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Satisfaction actuelle', type: QuestionType.SCALE, category: QuestionCategory.DISPLAY, parentId: qd1.id, displayCondition: '{"parentAnswer":"Oui"}', displayOrder: 4 },
  });
  await prisma.qualificationQuestion.create({
    data: { text: 'Intérêt pour ThePlayerAI ?', type: QuestionType.YES_NO, category: QuestionCategory.DISPLAY, displayOrder: 5 },
  });

  console.log('Qualification questions created');

  // ============================================
  // Commission Rules
  // ============================================
  await prisma.commissionRule.createMany({
    data: [
      { name: 'Commission Sécurité', productFamily: ProductFamily.SECURITY, ratePercent: 8, tierMinCA: 0, tierMaxCA: 15000, tierBonusPercent: 0 },
      { name: 'Commission Sécurité - Palier 2', productFamily: ProductFamily.SECURITY, ratePercent: 9, tierMinCA: 15000, tierMaxCA: 30000, tierBonusPercent: 1 },
      { name: 'Commission Sécurité - Palier 3', productFamily: ProductFamily.SECURITY, ratePercent: 10, tierMinCA: 30000, tierMaxCA: null, tierBonusPercent: 2 },
      { name: 'Commission Maintenance', productFamily: ProductFamily.MAINTENANCE, ratePercent: 0, maintenanceMultiplier: 6 },
      { name: 'Commission Affichage', productFamily: ProductFamily.DISPLAY, ratePercent: 10 },
      { name: 'Commission Travaux', productFamily: ProductFamily.WORKS, ratePercent: 5 },
    ],
  });

  console.log('Commission rules created');

  // ============================================
  // Referral Config
  // ============================================
  await prisma.referralConfig.create({
    data: {
      active: true,
      rewardType: 'fixed_amount',
      rewardValue: 100,
      commercialBonusFixed: 50,
      commercialBonusPercent: 2,
      requireFullPayment: true,
    },
  });

  console.log('Referral config created');

  // ============================================
  // Alert Rules
  // ============================================
  await prisma.alertRule.createMany({
    data: [
      { name: 'Prospect qualifié sans RDV', triggerCondition: '{"status":"QUALIFIED","noAppointment":true}', delayDays: 7, actionType: 'alert_sdr', messageTemplate: 'Le prospect {companyName} est qualifié depuis 7 jours sans RDV. Veuillez planifier un rendez-vous.' },
      { name: 'RDV annulé', triggerCondition: '{"appointmentStatus":"CANCELLED"}', delayDays: 3, actionType: 'alert_sdr', messageTemplate: 'Le RDV avec {companyName} a été annulé. Veuillez replanifier.' },
      { name: 'Devis non signé - Relance 1', triggerCondition: '{"quoteStatus":"SENT","notSigned":true}', delayDays: 5, actionType: 'alert_commercial', messageTemplate: 'Le devis {quoteNumber} envoyé à {companyName} est en attente de signature depuis 5 jours.' },
      { name: 'Devis non signé - Relance 2', triggerCondition: '{"quoteStatus":"SENT","notSigned":true}', delayDays: 10, actionType: 'alert_commercial', messageTemplate: 'RAPPEL: Le devis {quoteNumber} de {companyName} attend une signature depuis 10 jours.' },
      { name: 'Devis non signé - Relance 3', triggerCondition: '{"quoteStatus":"SENT","notSigned":true}', delayDays: 15, actionType: 'alert_commercial', messageTemplate: 'URGENT: Le devis {quoteNumber} de {companyName} expire bientôt. Relance immédiate requise.' },
      { name: 'Client sans maintenance', triggerCondition: '{"status":"INSTALLED","noMaintenanceContract":true}', delayDays: 30, actionType: 'alert_commercial', messageTemplate: '{companyName} est installé depuis 30 jours sans contrat de maintenance. Proposition recommandée.' },
      { name: 'Renouvellement équipement', triggerCondition: '{"equipmentAge":">4years"}', delayDays: 0, actionType: 'alert_commercial', messageTemplate: "L'équipement de {companyName} a plus de 4 ans. Proposition de renouvellement recommandée." },
      { name: 'Cross-sell Sécurité → Affichage', triggerCondition: '{"need":"SECURITY","noDisplayProduct":true}', delayDays: 60, actionType: 'alert_commercial', messageTemplate: '{companyName} dispose de sécurité mais pas d\'affichage dynamique. Proposer ThePlayerAI.' },
      { name: 'Fin contrat maintenance', triggerCondition: '{"contractType":"maintenance","expiringDays":90}', delayDays: 0, actionType: 'alert_commercial', messageTemplate: 'Le contrat de maintenance de {companyName} expire dans 90 jours. Renouvellement à proposer.' },
    ],
  });

  console.log('Alert rules created');
  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
