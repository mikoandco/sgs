import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const router = Router();
const prisma = new PrismaClient();

// All admin routes require ADMIN role
router.use(authenticate, authorize('ADMIN'));

// ============================================
// QUESTION MANAGEMENT
// ============================================

// GET /questions - List qualification questions
router.get('/questions', async (req: AuthRequest, res: Response) => {
  try {
    const { category, active } = req.query;

    const where: any = {};

    if (category) {
      where.category = category as string;
    }

    if (active !== undefined) {
      where.active = active === 'true';
    }

    const questions = await prisma.qualificationQuestion.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
      include: {
        children: true,
      },
    });

    res.json(questions);
  } catch (error) {
    console.error('Error listing questions:', error);
    res.status(500).json({ error: 'Failed to list questions' });
  }
});

// POST /questions - Create a qualification question
router.post('/questions', async (req: AuthRequest, res: Response) => {
  try {
    const {
      text,
      type,
      category,
      parentId,
      displayCondition,
      displayOrder,
      required,
      options,
      active,
    } = req.body;

    if (!text || !type || !category || displayOrder === undefined) {
      return res.status(400).json({
        error: 'text, type, category, and displayOrder are required',
      });
    }

    const question = await prisma.qualificationQuestion.create({
      data: {
        text,
        type,
        category,
        parentId: parentId || null,
        displayCondition: displayCondition || null,
        displayOrder,
        required: required !== undefined ? required : true,
        options: options ? (typeof options === 'string' ? options : JSON.stringify(options)) : null,
        active: active !== undefined ? active : true,
      },
      include: {
        children: true,
      },
    });

    res.status(201).json(question);
  } catch (error) {
    console.error('Error creating question:', error);
    res.status(500).json({ error: 'Failed to create question' });
  }
});

// PUT /questions/reorder - Reorder questions (must be before /:id)
router.put('/questions/reorder', async (req: AuthRequest, res: Response) => {
  try {
    const { orders } = req.body;

    if (!orders || !Array.isArray(orders)) {
      return res.status(400).json({
        error: 'orders array is required with [{id, displayOrder}] items',
      });
    }

    await prisma.$transaction(
      orders.map((order: { id: string; displayOrder: number }) =>
        prisma.qualificationQuestion.update({
          where: { id: order.id },
          data: { displayOrder: order.displayOrder },
        })
      )
    );

    const questions = await prisma.qualificationQuestion.findMany({
      orderBy: { displayOrder: 'asc' },
      include: { children: true },
    });

    res.json(questions);
  } catch (error) {
    console.error('Error reordering questions:', error);
    res.status(500).json({ error: 'Failed to reorder questions' });
  }
});

// PUT /questions/:id - Update a qualification question
router.put('/questions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const {
      text,
      type,
      category,
      parentId,
      displayCondition,
      displayOrder,
      required,
      options,
      active,
    } = req.body;

    const existing = await prisma.qualificationQuestion.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const updateData: any = {};

    if (text !== undefined) updateData.text = text;
    if (type !== undefined) updateData.type = type;
    if (category !== undefined) updateData.category = category;
    if (parentId !== undefined) updateData.parentId = parentId;
    if (displayCondition !== undefined) updateData.displayCondition = displayCondition;
    if (displayOrder !== undefined) updateData.displayOrder = displayOrder;
    if (required !== undefined) updateData.required = required;
    if (options !== undefined) {
      updateData.options = typeof options === 'string' ? options : JSON.stringify(options);
    }
    if (active !== undefined) updateData.active = active;

    const question = await prisma.qualificationQuestion.update({
      where: { id },
      data: updateData,
      include: { children: true },
    });

    res.json(question);
  } catch (error) {
    console.error('Error updating question:', error);
    res.status(500).json({ error: 'Failed to update question' });
  }
});

// DELETE /questions/:id - Soft delete a question (set active to false)
router.delete('/questions/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.qualificationQuestion.findUnique({
      where: { id },
    });

    if (!existing) {
      return res.status(404).json({ error: 'Question not found' });
    }

    const question = await prisma.qualificationQuestion.update({
      where: { id },
      data: { active: false },
    });

    res.json(question);
  } catch (error) {
    console.error('Error deleting question:', error);
    res.status(500).json({ error: 'Failed to delete question' });
  }
});

// ============================================
// ZONE MANAGEMENT
// ============================================

// GET /zones - List zones with assignments
router.get('/zones', async (req: AuthRequest, res: Response) => {
  try {
    const zones = await prisma.zone.findMany({
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.json(zones);
  } catch (error) {
    console.error('Error listing zones:', error);
    res.status(500).json({ error: 'Failed to list zones' });
  }
});

// POST /zones - Create a zone
router.post('/zones', async (req: AuthRequest, res: Response) => {
  try {
    const { name, departments, postalCodes } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const zone = await prisma.zone.create({
      data: {
        name,
        departments: departments || [],
        postalCodes: postalCodes || [],
      },
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json(zone);
  } catch (error) {
    console.error('Error creating zone:', error);
    res.status(500).json({ error: 'Failed to create zone' });
  }
});

// PUT /zones/:id - Update a zone
router.put('/zones/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name, departments, postalCodes } = req.body;

    const existing = await prisma.zone.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Zone not found' });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (departments !== undefined) updateData.departments = departments;
    if (postalCodes !== undefined) updateData.postalCodes = postalCodes;

    const zone = await prisma.zone.update({
      where: { id },
      data: updateData,
      include: {
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                role: true,
              },
            },
          },
        },
      },
    });

    res.json(zone);
  } catch (error) {
    console.error('Error updating zone:', error);
    res.status(500).json({ error: 'Failed to update zone' });
  }
});

// POST /zones/assignments - Create a zone assignment
router.post('/zones/assignments', async (req: AuthRequest, res: Response) => {
  try {
    const { userId, zoneId, dayOfWeek } = req.body;

    if (!userId || !zoneId || !dayOfWeek) {
      return res.status(400).json({
        error: 'userId, zoneId, and dayOfWeek are required',
      });
    }

    const assignment = await prisma.zoneAssignment.upsert({
      where: {
        userId_dayOfWeek: {
          userId,
          dayOfWeek,
        },
      },
      update: {
        zoneId,
      },
      create: {
        userId,
        zoneId,
        dayOfWeek,
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
          },
        },
        zone: true,
      },
    });

    res.status(201).json(assignment);
  } catch (error) {
    console.error('Error creating zone assignment:', error);
    res.status(500).json({ error: 'Failed to create zone assignment' });
  }
});

// DELETE /zones/assignments/:id - Delete a zone assignment
router.delete('/zones/assignments/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await prisma.zoneAssignment.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Zone assignment not found' });
    }

    await prisma.zoneAssignment.delete({ where: { id } });

    res.json({ message: 'Zone assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting zone assignment:', error);
    res.status(500).json({ error: 'Failed to delete zone assignment' });
  }
});

// ============================================
// REFERRAL CONFIGURATION
// ============================================

// GET /referral-config - Get current referral config
router.get('/referral-config', async (req: AuthRequest, res: Response) => {
  try {
    const config = await prisma.referralConfig.findFirst();

    res.json(config);
  } catch (error) {
    console.error('Error fetching referral config:', error);
    res.status(500).json({ error: 'Failed to fetch referral config' });
  }
});

// PUT /referral-config - Update or create referral config
router.put('/referral-config', async (req: AuthRequest, res: Response) => {
  try {
    const {
      active,
      rewardType,
      rewardValue,
      commercialBonusFixed,
      commercialBonusPercent,
      requireFullPayment,
    } = req.body;

    if (rewardType === undefined || rewardValue === undefined) {
      return res.status(400).json({
        error: 'rewardType and rewardValue are required',
      });
    }

    // Try to find existing config
    const existing = await prisma.referralConfig.findFirst();

    let config;
    if (existing) {
      config = await prisma.referralConfig.update({
        where: { id: existing.id },
        data: {
          active: active !== undefined ? active : existing.active,
          rewardType,
          rewardValue,
          commercialBonusFixed: commercialBonusFixed !== undefined ? commercialBonusFixed : existing.commercialBonusFixed,
          commercialBonusPercent: commercialBonusPercent !== undefined ? commercialBonusPercent : existing.commercialBonusPercent,
          requireFullPayment: requireFullPayment !== undefined ? requireFullPayment : existing.requireFullPayment,
        },
      });
    } else {
      config = await prisma.referralConfig.create({
        data: {
          active: active !== undefined ? active : true,
          rewardType,
          rewardValue,
          commercialBonusFixed: commercialBonusFixed || null,
          commercialBonusPercent: commercialBonusPercent || null,
          requireFullPayment: requireFullPayment !== undefined ? requireFullPayment : true,
        },
      });
    }

    res.json(config);
  } catch (error) {
    console.error('Error updating referral config:', error);
    res.status(500).json({ error: 'Failed to update referral config' });
  }
});

// ============================================
// TEAMS
// ============================================

// GET /teams - List teams with members
router.get('/teams', async (req: AuthRequest, res: Response) => {
  try {
    const teams = await prisma.team.findMany({
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });

    res.json(teams);
  } catch (error) {
    console.error('Error listing teams:', error);
    res.status(500).json({ error: 'Failed to list teams' });
  }
});

// POST /teams - Create a team
router.post('/teams', async (req: AuthRequest, res: Response) => {
  try {
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const team = await prisma.team.create({
      data: { name },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });

    res.status(201).json(team);
  } catch (error) {
    console.error('Error creating team:', error);
    res.status(500).json({ error: 'Failed to create team' });
  }
});

// PUT /teams/:id - Update team name
router.put('/teams/:id', async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'name is required' });
    }

    const existing = await prisma.team.findUnique({ where: { id } });

    if (!existing) {
      return res.status(404).json({ error: 'Team not found' });
    }

    const team = await prisma.team.update({
      where: { id },
      data: { name },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            active: true,
          },
        },
      },
    });

    res.json(team);
  } catch (error) {
    console.error('Error updating team:', error);
    res.status(500).json({ error: 'Failed to update team' });
  }
});

export default router;
