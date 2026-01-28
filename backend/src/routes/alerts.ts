import { Router, Response } from 'express';
import { PrismaClient, AlertStatus, AlertPriority } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
const router = Router();

// All alert routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List alerts with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, type, assigneeId, prospectId, overdue } = req.query;

    const where: Record<string, any> = {};

    // Default: show only PENDING and IN_PROGRESS
    if (status) {
      where.status = status as AlertStatus;
    } else {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    if (priority) {
      where.priority = priority as AlertPriority;
    }

    if (type) {
      where.type = type as string;
    }

    if (assigneeId) {
      where.assigneeId = assigneeId as string;
    }

    if (prospectId) {
      where.prospectId = prospectId as string;
    }

    // Overdue filter: dueDate < now and status PENDING
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = 'PENDING';
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    res.json({ data: alerts });
  } catch (error) {
    console.error('List alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /my - Get alerts assigned to current user
// ---------------------------------------------------------------------------
router.get('/my', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, priority, type, prospectId, overdue } = req.query;

    const where: Record<string, any> = {
      assigneeId: req.userId,
    };

    // Default: show only PENDING and IN_PROGRESS
    if (status) {
      where.status = status as AlertStatus;
    } else {
      where.status = { in: ['PENDING', 'IN_PROGRESS'] };
    }

    if (priority) {
      where.priority = priority as AlertPriority;
    }

    if (type) {
      where.type = type as string;
    }

    if (prospectId) {
      where.prospectId = prospectId as string;
    }

    // Overdue filter: dueDate < now and status PENDING
    if (overdue === 'true') {
      where.dueDate = { lt: new Date() };
      where.status = 'PENDING';
    }

    const alerts = await prisma.alert.findMany({
      where,
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { dueDate: 'asc' }],
    });

    res.json({ data: alerts });
  } catch (error) {
    console.error('List my alerts error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create alert
// ---------------------------------------------------------------------------
router.post('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { prospectId, assigneeId, type, title, message, priority, dueDate, metadata } = req.body;

    if (!type || !title || !dueDate) {
      res.status(400).json({ error: 'type, title and dueDate are required' });
      return;
    }

    const alert = await prisma.alert.create({
      data: {
        prospectId: prospectId || null,
        assigneeId: assigneeId || null,
        type,
        title,
        message: message || null,
        priority: (priority as AlertPriority) || 'MEDIUM',
        dueDate: new Date(dueDate),
        metadata: metadata ? JSON.stringify(metadata) : null,
      },
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.status(201).json({ data: alert });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// PUT /:id - Update alert
// ---------------------------------------------------------------------------
router.put('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, assigneeId, priority, dueDate } = req.body;

    const existing = await prisma.alert.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Alert not found' });
      return;
    }

    const updateData: Record<string, any> = {};

    if (status !== undefined) {
      updateData.status = status as AlertStatus;
      if (status === 'DONE') {
        updateData.completedAt = new Date();
      }
    }

    if (assigneeId !== undefined) {
      updateData.assigneeId = assigneeId;
    }

    if (priority !== undefined) {
      updateData.priority = priority as AlertPriority;
    }

    if (dueDate !== undefined) {
      updateData.dueDate = new Date(dueDate);
    }

    const alert = await prisma.alert.update({
      where: { id },
      data: updateData,
      include: {
        prospect: {
          select: {
            id: true,
            companyName: true,
          },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    res.json({ data: alert });
  } catch (error) {
    console.error('Update alert error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /rules - List alert rules (ADMIN, DIRECTION)
// ---------------------------------------------------------------------------
router.get(
  '/rules',
  authorize('ADMIN', 'DIRECTION'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const rules = await prisma.alertRule.findMany({
        orderBy: { createdAt: 'desc' },
      });

      res.json({ data: rules });
    } catch (error) {
      console.error('List alert rules error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /rules - Create alert rule (ADMIN only)
// ---------------------------------------------------------------------------
router.post(
  '/rules',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, triggerCondition, delayDays, actionType, messageTemplate, priority, active } = req.body;

      if (!name || !triggerCondition || delayDays === undefined || !actionType || !messageTemplate) {
        res.status(400).json({
          error: 'name, triggerCondition, delayDays, actionType and messageTemplate are required',
        });
        return;
      }

      const rule = await prisma.alertRule.create({
        data: {
          name,
          triggerCondition: typeof triggerCondition === 'string' ? triggerCondition : JSON.stringify(triggerCondition),
          delayDays,
          actionType,
          messageTemplate,
          priority: (priority as AlertPriority) || 'MEDIUM',
          active: active !== undefined ? active : true,
        },
      });

      res.status(201).json({ data: rule });
    } catch (error) {
      console.error('Create alert rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /rules/:id - Update alert rule (ADMIN only)
// ---------------------------------------------------------------------------
router.put(
  '/rules/:id',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, triggerCondition, delayDays, actionType, messageTemplate, priority, active } = req.body;

      const existing = await prisma.alertRule.findUnique({ where: { id } });
      if (!existing) {
        res.status(404).json({ error: 'Alert rule not found' });
        return;
      }

      const updateData: Record<string, any> = {};
      if (name !== undefined) updateData.name = name;
      if (triggerCondition !== undefined) {
        updateData.triggerCondition =
          typeof triggerCondition === 'string' ? triggerCondition : JSON.stringify(triggerCondition);
      }
      if (delayDays !== undefined) updateData.delayDays = delayDays;
      if (actionType !== undefined) updateData.actionType = actionType;
      if (messageTemplate !== undefined) updateData.messageTemplate = messageTemplate;
      if (priority !== undefined) updateData.priority = priority as AlertPriority;
      if (active !== undefined) updateData.active = active;

      const rule = await prisma.alertRule.update({
        where: { id },
        data: updateData,
      });

      res.json({ data: rule });
    } catch (error) {
      console.error('Update alert rule error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
