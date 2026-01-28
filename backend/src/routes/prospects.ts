import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All prospect routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List prospects with filters, pagination, search
// ---------------------------------------------------------------------------
router.get(
  '/',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        status,
        need,
        sdrId,
        commercialId,
        search,
        page = '1',
        limit = '20',
      } = req.query;

      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string, 10) || 20));
      const skip = (pageNum - 1) * limitNum;

      const where: any = {};

      if (status) {
        where.status = status as string;
      }

      if (need) {
        where.need = need as string;
      }

      if (sdrId) {
        where.sdrId = sdrId as string;
      }

      if (commercialId) {
        where.commercialId = commercialId as string;
      }

      if (search) {
        const searchStr = search as string;
        where.OR = [
          { companyName: { contains: searchStr, mode: 'insensitive' } },
          { decisionMakerName: { contains: searchStr, mode: 'insensitive' } },
        ];
      }

      const [prospects, total] = await Promise.all([
        prisma.prospect.findMany({
          where,
          skip,
          take: limitNum,
          orderBy: { createdAt: 'desc' },
          include: {
            sdr: { select: { id: true, firstName: true, lastName: true } },
            commercial: { select: { id: true, firstName: true, lastName: true } },
          },
        }),
        prisma.prospect.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limitNum);

      res.json({
        data: prospects,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages,
        },
      });
    } catch (error) {
      console.error('Error listing prospects:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id - Get prospect by id with all relations
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const prospect = await prisma.prospect.findUnique({
        where: { id },
        include: {
          qualificationAnswers: {
            include: { question: true },
          },
          appointments: true,
          quotes: true,
          timelineEntries: {
            orderBy: { createdAt: 'desc' },
            include: {
              user: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          alerts: true,
          auditPhotos: true,
          contracts: true,
          salesPhases: true,
          referrals: true,
          referredBy: true,
        },
      });

      if (!prospect) {
        res.status(404).json({ error: 'Prospect not found' });
        return;
      }

      res.json({ data: prospect });
    } catch (error) {
      console.error('Error retrieving prospect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST / - Create prospect
// ---------------------------------------------------------------------------
router.post(
  '/',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const {
        companyName,
        address,
        addressComplement,
        postalCode,
        city,
        country,
        lat,
        lng,
        phone,
        siret,
        activitySector,
        need,
        status,
        decisionMakerName,
        decisionMakerFunction,
        decisionMakerMobile,
        decisionMakerEmail,
        hasAssociate,
        associateName,
        associatePhone,
        isTabacSubvention,
        subventionAmount,
        subventionStatus,
        isReferred,
        referredById,
        referralStatus,
        referralRewardStatus,
        sdrId,
        commercialId,
        qualificationScore,
      } = req.body;

      // Auto-set sdrId to current user if they are an SDR
      const effectiveSdrId = req.user!.role === 'SDR' ? req.user!.id : sdrId;

      const prospect = await prisma.$transaction(async (tx) => {
        const newProspect = await tx.prospect.create({
          data: {
            companyName,
            address,
            addressComplement,
            postalCode,
            city,
            country,
            lat,
            lng,
            phone,
            siret,
            activitySector,
            need,
            status,
            decisionMakerName,
            decisionMakerFunction,
            decisionMakerMobile,
            decisionMakerEmail,
            hasAssociate,
            associateName,
            associatePhone,
            isTabacSubvention,
            subventionAmount,
            subventionStatus,
            isReferred,
            referredById,
            referralStatus,
            referralRewardStatus,
            sdrId: effectiveSdrId,
            commercialId,
            qualificationScore,
          },
        });

        // Auto-create timeline entry
        await tx.timelineEntry.create({
          data: {
            prospectId: newProspect.id,
            userId: req.user!.id,
            type: 'STATUS_CHANGE',
            content: 'Prospect créé',
          },
        });

        return newProspect;
      });

      res.status(201).json({ data: prospect });
    } catch (error) {
      console.error('Error creating prospect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id - Update prospect (partial)
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const existing = await prisma.prospect.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Prospect not found' });
        return;
      }

      const {
        companyName,
        address,
        addressComplement,
        postalCode,
        city,
        country,
        lat,
        lng,
        phone,
        siret,
        activitySector,
        need,
        status,
        decisionMakerName,
        decisionMakerFunction,
        decisionMakerMobile,
        decisionMakerEmail,
        hasAssociate,
        associateName,
        associatePhone,
        isTabacSubvention,
        subventionAmount,
        subventionStatus,
        isReferred,
        referredById,
        referralStatus,
        referralRewardStatus,
        sdrId,
        commercialId,
        qualificationScore,
        qualifiedAt,
        signedAt,
        installedAt,
      } = req.body;

      const updateData: Record<string, any> = {};

      if (companyName !== undefined) updateData.companyName = companyName;
      if (address !== undefined) updateData.address = address;
      if (addressComplement !== undefined) updateData.addressComplement = addressComplement;
      if (postalCode !== undefined) updateData.postalCode = postalCode;
      if (city !== undefined) updateData.city = city;
      if (country !== undefined) updateData.country = country;
      if (lat !== undefined) updateData.lat = lat;
      if (lng !== undefined) updateData.lng = lng;
      if (phone !== undefined) updateData.phone = phone;
      if (siret !== undefined) updateData.siret = siret;
      if (activitySector !== undefined) updateData.activitySector = activitySector;
      if (need !== undefined) updateData.need = need;
      if (status !== undefined) updateData.status = status;
      if (decisionMakerName !== undefined) updateData.decisionMakerName = decisionMakerName;
      if (decisionMakerFunction !== undefined) updateData.decisionMakerFunction = decisionMakerFunction;
      if (decisionMakerMobile !== undefined) updateData.decisionMakerMobile = decisionMakerMobile;
      if (decisionMakerEmail !== undefined) updateData.decisionMakerEmail = decisionMakerEmail;
      if (hasAssociate !== undefined) updateData.hasAssociate = hasAssociate;
      if (associateName !== undefined) updateData.associateName = associateName;
      if (associatePhone !== undefined) updateData.associatePhone = associatePhone;
      if (isTabacSubvention !== undefined) updateData.isTabacSubvention = isTabacSubvention;
      if (subventionAmount !== undefined) updateData.subventionAmount = subventionAmount;
      if (subventionStatus !== undefined) updateData.subventionStatus = subventionStatus;
      if (isReferred !== undefined) updateData.isReferred = isReferred;
      if (referredById !== undefined) updateData.referredById = referredById;
      if (referralStatus !== undefined) updateData.referralStatus = referralStatus;
      if (referralRewardStatus !== undefined) updateData.referralRewardStatus = referralRewardStatus;
      if (sdrId !== undefined) updateData.sdrId = sdrId;
      if (commercialId !== undefined) updateData.commercialId = commercialId;
      if (qualificationScore !== undefined) updateData.qualificationScore = qualificationScore;
      if (qualifiedAt !== undefined) updateData.qualifiedAt = qualifiedAt;
      if (signedAt !== undefined) updateData.signedAt = signedAt;
      if (installedAt !== undefined) updateData.installedAt = installedAt;

      const statusChanged = status !== undefined && status !== existing.status;

      const prospect = await prisma.$transaction(async (tx) => {
        const updated = await tx.prospect.update({
          where: { id },
          data: updateData,
        });

        // If status changed, create a timeline entry
        if (statusChanged) {
          await tx.timelineEntry.create({
            data: {
              prospectId: id,
              userId: req.user!.id,
              type: 'STATUS_CHANGE',
              content: `Statut changé en ${status}`,
            },
          });
        }

        return updated;
      });

      res.json({ data: prospect });
    } catch (error) {
      console.error('Error updating prospect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:id/qualify - Submit qualification answers
// ---------------------------------------------------------------------------
router.post(
  '/:id/qualify',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { answers } = req.body;

      if (!Array.isArray(answers) || answers.length === 0) {
        res.status(400).json({ error: 'answers must be a non-empty array of { questionId, answer }' });
        return;
      }

      const prospect = await prisma.prospect.findUnique({ where: { id } });
      if (!prospect) {
        res.status(404).json({ error: 'Prospect not found' });
        return;
      }

      const updatedProspect = await prisma.$transaction(async (tx) => {
        // Upsert each qualification answer
        for (const { questionId, answer } of answers as { questionId: string; answer: string }[]) {
          await tx.qualificationAnswer.upsert({
            where: {
              prospectId_questionId: {
                prospectId: id,
                questionId,
              },
            },
            update: {
              answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
            },
            create: {
              prospectId: id,
              questionId,
              answer: typeof answer === 'string' ? answer : JSON.stringify(answer),
            },
          });
        }

        // Update prospect status to QUALIFIED and set qualifiedAt
        const updated = await tx.prospect.update({
          where: { id },
          data: {
            status: 'QUALIFIED',
            qualifiedAt: new Date(),
          },
        });

        // Create timeline entry
        await tx.timelineEntry.create({
          data: {
            prospectId: id,
            userId: req.user!.id,
            type: 'STATUS_CHANGE',
            content: 'Prospect qualifié',
            metadata: JSON.stringify({ answersCount: answers.length }),
          },
        });

        return updated;
      });

      res.json({ data: updatedProspect });
    } catch (error) {
      console.error('Error qualifying prospect:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /:id/timeline - Add timeline entry
// ---------------------------------------------------------------------------
router.post(
  '/:id/timeline',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { type, content, metadata } = req.body;

      if (!type || !content) {
        res.status(400).json({ error: 'type and content are required' });
        return;
      }

      const prospect = await prisma.prospect.findUnique({ where: { id } });
      if (!prospect) {
        res.status(404).json({ error: 'Prospect not found' });
        return;
      }

      const entry = await prisma.timelineEntry.create({
        data: {
          prospectId: id,
          userId: req.user!.id,
          type,
          content,
          metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.status(201).json({ data: entry });
    } catch (error) {
      console.error('Error creating timeline entry:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/timeline - Get timeline entries for a prospect
// ---------------------------------------------------------------------------
router.get(
  '/:id/timeline',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const prospect = await prisma.prospect.findUnique({ where: { id } });
      if (!prospect) {
        res.status(404).json({ error: 'Prospect not found' });
        return;
      }

      const entries = await prisma.timelineEntry.findMany({
        where: { prospectId: id },
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      res.json({ data: entries });
    } catch (error) {
      console.error('Error retrieving timeline:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
