import { Router, Response } from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { authenticate, authorize } from '../middleware/auth';
import { UserRole } from '../types/enums';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
const router = Router();

// All routes in this file require authentication + ADMIN role
router.use(authenticate);
router.use(authorize('ADMIN'));

// ---------------------------------------------------------------------------
// GET / - List all users with pagination and optional role filter
// ---------------------------------------------------------------------------
router.get(
  '/',
  [
    query('page')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Page must be a positive integer')
      .toInt(),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('Limit must be between 1 and 100')
      .toInt(),
    query('role')
      .optional()
      .isIn(['ADMIN', 'DIRECTION', 'COMMERCIAL', 'SDR'])
      .withMessage('Role must be one of: ADMIN, DIRECTION, COMMERCIAL, SDR'),
    query('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean')
      .toBoolean(),
    query('search')
      .optional()
      .isString()
      .trim(),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const page = (req.query.page as unknown as number) || 1;
      const limit = (req.query.limit as unknown as number) || 20;
      const skip = (page - 1) * limit;
      const role = req.query.role as UserRole | undefined;
      const active = req.query.active as unknown as boolean | undefined;
      const search = req.query.search as string | undefined;

      const where: Record<string, any> = {};

      if (role) {
        where.role = role;
      }

      if (active !== undefined) {
        where.active = active;
      }

      if (search) {
        where.OR = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
        ];
      }

      const [users, total] = await Promise.all([
        prisma.user.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: 'desc' },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            phone: true,
            active: true,
            teamId: true,
            team: {
              select: { id: true, name: true },
            },
            createdAt: true,
            updatedAt: true,
          },
        }),
        prisma.user.count({ where }),
      ]);

      res.json({
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST / - Create a new user
// ---------------------------------------------------------------------------
router.post(
  '/',
  [
    body('email')
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
    body('firstName')
      .notEmpty()
      .withMessage('First name is required')
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('First name must be at most 100 characters'),
    body('lastName')
      .notEmpty()
      .withMessage('Last name is required')
      .isString()
      .trim()
      .isLength({ max: 100 })
      .withMessage('Last name must be at most 100 characters'),
    body('role')
      .isIn(['ADMIN', 'DIRECTION', 'COMMERCIAL', 'SDR'])
      .withMessage('Role must be one of: ADMIN, DIRECTION, COMMERCIAL, SDR'),
    body('phone')
      .optional({ nullable: true })
      .isString()
      .trim(),
    body('teamId')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('Team ID must be a valid UUID'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { email, password, firstName, lastName, role, phone, teamId } = req.body;

      // Check if email is already taken
      const existingUser = await prisma.user.findUnique({
        where: { email },
      });

      if (existingUser) {
        res.status(409).json({ error: 'A user with this email already exists' });
        return;
      }

      // Validate teamId if provided
      if (teamId) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) {
          res.status(400).json({ error: 'Team not found' });
          return;
        }
      }

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash(password, salt);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          phone: phone || null,
          teamId: teamId || null,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          active: true,
          teamId: true,
          team: {
            select: { id: true, name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      res.status(201).json({ user });
    } catch (error) {
      console.error('Create user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id - Get user by ID
// ---------------------------------------------------------------------------
router.get(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.params.id },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          active: true,
          teamId: true,
          team: {
            select: { id: true, name: true },
          },
          zoneAssignments: {
            select: {
              id: true,
              dayOfWeek: true,
              zone: {
                select: { id: true, name: true, departments: true },
              },
            },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ user });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id - Update user
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    body('email')
      .optional()
      .isEmail()
      .withMessage('A valid email is required')
      .normalizeEmail(),
    body('firstName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('First name must be between 1 and 100 characters'),
    body('lastName')
      .optional()
      .isString()
      .trim()
      .isLength({ min: 1, max: 100 })
      .withMessage('Last name must be between 1 and 100 characters'),
    body('role')
      .optional()
      .isIn(['ADMIN', 'DIRECTION', 'COMMERCIAL', 'SDR'])
      .withMessage('Role must be one of: ADMIN, DIRECTION, COMMERCIAL, SDR'),
    body('phone')
      .optional({ nullable: true })
      .isString()
      .trim(),
    body('teamId')
      .optional({ nullable: true })
      .isUUID()
      .withMessage('Team ID must be a valid UUID'),
    body('active')
      .optional()
      .isBoolean()
      .withMessage('Active must be a boolean'),
    body('password')
      .optional()
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/)
      .withMessage('Password must contain at least one uppercase letter')
      .matches(/[a-z]/)
      .withMessage('Password must contain at least one lowercase letter')
      .matches(/[0-9]/)
      .withMessage('Password must contain at least one number'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Verify user exists
      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { email, firstName, lastName, role, phone, teamId, active, password } = req.body;

      // If email is being changed, check for uniqueness
      if (email && email !== existingUser.email) {
        const emailTaken = await prisma.user.findUnique({ where: { email } });
        if (emailTaken) {
          res.status(409).json({ error: 'Email is already in use' });
          return;
        }
      }

      // Validate teamId if provided
      if (teamId) {
        const team = await prisma.team.findUnique({ where: { id: teamId } });
        if (!team) {
          res.status(400).json({ error: 'Team not found' });
          return;
        }
      }

      const updateData: Record<string, any> = {};
      if (email !== undefined) updateData.email = email;
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone;
      if (teamId !== undefined) updateData.teamId = teamId;
      if (active !== undefined) updateData.active = active;

      if (password) {
        const salt = await bcrypt.genSalt(12);
        updateData.passwordHash = await bcrypt.hash(password, salt);
      }

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          phone: true,
          active: true,
          teamId: true,
          team: {
            select: { id: true, name: true },
          },
          createdAt: true,
          updatedAt: true,
        },
      });

      res.json({ user: updatedUser });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// DELETE /:id - Soft-delete (deactivate) user
// ---------------------------------------------------------------------------
router.delete(
  '/:id',
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      // Prevent self-deactivation
      if (id === req.userId) {
        res.status(400).json({ error: 'You cannot deactivate your own account' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { id } });
      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      if (!user.active) {
        res.status(400).json({ error: 'User is already deactivated' });
        return;
      }

      await prisma.user.update({
        where: { id },
        data: { active: false },
      });

      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Deactivate user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /:id/stats - Get user performance statistics
// ---------------------------------------------------------------------------
router.get(
  '/:id/stats',
  [
    param('id')
      .isUUID()
      .withMessage('User ID must be a valid UUID'),
    query('from')
      .optional()
      .isISO8601()
      .withMessage('From date must be a valid ISO 8601 date'),
    query('to')
      .optional()
      .isISO8601()
      .withMessage('To date must be a valid ISO 8601 date'),
  ],
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
        return;
      }

      const { id } = req.params;

      const user = await prisma.user.findUnique({
        where: { id },
        select: { id: true, role: true, firstName: true, lastName: true, active: true },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      // Build date filter
      const fromDate = req.query.from ? new Date(req.query.from as string) : undefined;
      const toDate = req.query.to ? new Date(req.query.to as string) : undefined;

      const dateFilter: Record<string, any> = {};
      if (fromDate) dateFilter.gte = fromDate;
      if (toDate) dateFilter.lte = toDate;

      const createdAtFilter = Object.keys(dateFilter).length > 0 ? dateFilter : undefined;

      // Build stats based on user role
      if (user.role === 'SDR') {
        const [
          totalProspects,
          qualifiedProspects,
          appointmentsScheduled,
          appointmentsCompleted,
          appointmentsCancelled,
        ] = await Promise.all([
          prisma.prospect.count({
            where: {
              sdrId: id,
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
          prisma.prospect.count({
            where: {
              sdrId: id,
              status: { in: ['QUALIFIED', 'APPOINTMENT_SCHEDULED', 'APPOINTMENT_DONE', 'QUOTE_SENT', 'SIGNED', 'INSTALLED'] },
              ...(createdAtFilter ? { qualifiedAt: createdAtFilter } : {}),
            },
          }),
          prisma.appointment.count({
            where: {
              sdrId: id,
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
          prisma.appointment.count({
            where: {
              sdrId: id,
              status: 'COMPLETED',
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
          prisma.appointment.count({
            where: {
              sdrId: id,
              status: { in: ['CANCELLED', 'NO_SHOW'] },
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
        ]);

        const conversionRate = totalProspects > 0
          ? Math.round((qualifiedProspects / totalProspects) * 10000) / 100
          : 0;

        res.json({
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
          stats: {
            totalProspects,
            qualifiedProspects,
            conversionRate,
            appointmentsScheduled,
            appointmentsCompleted,
            appointmentsCancelled,
          },
        });
        return;
      }

      if (user.role === 'COMMERCIAL') {
        const [
          totalProspects,
          signedProspects,
          appointmentsCompleted,
          totalQuotes,
          signedQuotes,
          totalRevenue,
          commissions,
        ] = await Promise.all([
          prisma.prospect.count({
            where: {
              commercialId: id,
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
          prisma.prospect.count({
            where: {
              commercialId: id,
              status: { in: ['SIGNED', 'INSTALLATION_PENDING', 'INSTALLED'] },
              ...(createdAtFilter ? { signedAt: createdAtFilter } : {}),
            },
          }),
          prisma.appointment.count({
            where: {
              commercialId: id,
              status: 'COMPLETED',
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
          prisma.quote.count({
            where: {
              commercialId: id,
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
          }),
          prisma.quote.count({
            where: {
              commercialId: id,
              status: { in: ['SIGNED', 'VALIDATED'] },
              ...(createdAtFilter ? { signedAt: createdAtFilter } : {}),
            },
          }),
          prisma.quote.aggregate({
            where: {
              commercialId: id,
              status: { in: ['SIGNED', 'VALIDATED'] },
              ...(createdAtFilter ? { signedAt: createdAtFilter } : {}),
            },
            _sum: { totalHT: true },
          }),
          prisma.commission.aggregate({
            where: {
              commercialId: id,
              ...(createdAtFilter ? { createdAt: createdAtFilter } : {}),
            },
            _sum: { amount: true, paidAmount: true },
          }),
        ]);

        const closingRate = totalQuotes > 0
          ? Math.round((signedQuotes / totalQuotes) * 10000) / 100
          : 0;

        res.json({
          user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
          stats: {
            totalProspects,
            signedProspects,
            appointmentsCompleted,
            totalQuotes,
            signedQuotes,
            closingRate,
            totalRevenueHT: totalRevenue._sum.totalHT || 0,
            totalCommissions: commissions._sum.amount || 0,
            paidCommissions: commissions._sum.paidAmount || 0,
          },
        });
        return;
      }

      // For ADMIN / DIRECTION - provide a general overview
      const [
        totalUsers,
        activeUsers,
        totalProspects,
        signedProspects,
        totalQuotes,
        totalRevenue,
      ] = await Promise.all([
        prisma.user.count(),
        prisma.user.count({ where: { active: true } }),
        prisma.prospect.count({
          where: createdAtFilter ? { createdAt: createdAtFilter } : {},
        }),
        prisma.prospect.count({
          where: {
            status: { in: ['SIGNED', 'INSTALLATION_PENDING', 'INSTALLED'] },
            ...(createdAtFilter ? { signedAt: createdAtFilter } : {}),
          },
        }),
        prisma.quote.count({
          where: createdAtFilter ? { createdAt: createdAtFilter } : {},
        }),
        prisma.quote.aggregate({
          where: {
            status: { in: ['SIGNED', 'VALIDATED'] },
            ...(createdAtFilter ? { signedAt: createdAtFilter } : {}),
          },
          _sum: { totalHT: true },
        }),
      ]);

      res.json({
        user: { id: user.id, firstName: user.firstName, lastName: user.lastName, role: user.role },
        stats: {
          totalUsers,
          activeUsers,
          totalProspects,
          signedProspects,
          totalQuotes,
          totalRevenueHT: totalRevenue._sum.totalHT || 0,
        },
      });
    } catch (error) {
      console.error('Get user stats error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
