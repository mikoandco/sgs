import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sgs-secret-key';

// ---------------------------------------------------------------------------
// POST /register  (ADMIN only)
// ---------------------------------------------------------------------------
router.post(
  '/register',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password, firstName, lastName, role, phone, teamId } = req.body;

      if (!email || !password || !firstName || !lastName || !role) {
        res.status(400).json({ error: 'Missing required fields: email, password, firstName, lastName, role' });
        return;
      }

      const existingUser = await prisma.user.findUnique({ where: { email } });
      if (existingUser) {
        res.status(409).json({ error: 'A user with this email already exists' });
        return;
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          firstName,
          lastName,
          role,
          phone,
          teamId,
        },
      });

      const { passwordHash: _hash, ...userWithoutPassword } = user;

      res.status(201).json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /login
// ---------------------------------------------------------------------------
router.post(
  '/login',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ error: 'Email and password are required' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });

      if (!user) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      if (!user.active) {
        res.status(403).json({ error: 'Account is deactivated. Contact an administrator.' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Invalid email or password' });
        return;
      }

      const token = jwt.sign(
        {
          id: user.id,
          email: user.email,
          role: user.role,
          firstName: user.firstName,
          lastName: user.lastName,
        },
        JWT_SECRET,
        { expiresIn: '7d' },
      );

      const { passwordHash: _hash, ...userWithoutPassword } = user;

      res.json({ token, user: userWithoutPassword });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /profile  (authenticated)
// ---------------------------------------------------------------------------
router.get(
  '/profile',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await prisma.user.findUnique({
        where: { id: (req as any).userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const { passwordHash: _hash, ...userWithoutPassword } = user;

      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Get profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// GET /users  (DIRECTION, ADMIN)
// ---------------------------------------------------------------------------
router.get(
  '/users',
  authenticate,
  authorize('DIRECTION', 'ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { role, active } = req.query;

      const where: Record<string, any> = {};

      if (role) {
        where.role = role as string;
      }

      if (active !== undefined) {
        where.active = active === 'true';
      }

      const users = await prisma.user.findMany({
        where,
        include: { team: true },
        orderBy: { createdAt: 'desc' },
      });

      const usersWithoutPassword = users.map(({ passwordHash, ...rest }) => rest);

      res.json({ users: usersWithoutPassword });
    } catch (error) {
      console.error('List users error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /users/:id  (ADMIN only)
// ---------------------------------------------------------------------------
router.put(
  '/users/:id',
  authenticate,
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { firstName, lastName, role, phone, active, teamId } = req.body;

      const existingUser = await prisma.user.findUnique({ where: { id } });
      if (!existingUser) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (role !== undefined) updateData.role = role;
      if (phone !== undefined) updateData.phone = phone;
      if (active !== undefined) updateData.active = active;
      if (teamId !== undefined) updateData.teamId = teamId;

      const updatedUser = await prisma.user.update({
        where: { id },
        data: updateData,
      });

      const { passwordHash: _hash, ...userWithoutPassword } = updatedUser;

      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Update user error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
