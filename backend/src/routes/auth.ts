import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';
import { sendEmail, emailTemplates } from '../services/email';

const prisma = new PrismaClient();
const router = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'sgs-secret-key';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// In-memory store for password reset tokens (in production, use database or Redis)
const resetTokens: Map<string, { email: string; expires: Date }> = new Map();

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

// ---------------------------------------------------------------------------
// POST /forgot-password
// ---------------------------------------------------------------------------
router.post(
  '/forgot-password',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { email } = req.body;

      if (!email) {
        res.status(400).json({ error: 'Email is required' });
        return;
      }

      const user = await prisma.user.findUnique({ where: { email } });

      // Always return success to prevent email enumeration
      if (!user) {
        res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
        return;
      }

      // Generate reset token
      const token = crypto.randomBytes(32).toString('hex');
      const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Store token
      resetTokens.set(token, { email, expires });

      // Clean up expired tokens
      for (const [t, data] of resetTokens.entries()) {
        if (data.expires < new Date()) {
          resetTokens.delete(t);
        }
      }

      // Send email
      const resetLink = `${FRONTEND_URL}/reset-password?token=${token}`;
      await sendEmail({
        to: email,
        ...emailTemplates.passwordReset({
          userName: `${user.firstName} ${user.lastName}`,
          resetLink,
        }),
      });

      res.json({ message: 'Si un compte existe avec cet email, vous recevrez un lien de réinitialisation.' });
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /reset-password
// ---------------------------------------------------------------------------
router.post(
  '/reset-password',
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        res.status(400).json({ error: 'Token and password are required' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters' });
        return;
      }

      const tokenData = resetTokens.get(token);

      if (!tokenData) {
        res.status(400).json({ error: 'Invalid or expired reset token' });
        return;
      }

      if (tokenData.expires < new Date()) {
        resetTokens.delete(token);
        res.status(400).json({ error: 'Reset token has expired' });
        return;
      }

      // Update password
      const passwordHash = await bcrypt.hash(password, 10);
      await prisma.user.update({
        where: { email: tokenData.email },
        data: { passwordHash },
      });

      // Delete used token
      resetTokens.delete(token);

      res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /change-password (authenticated)
// ---------------------------------------------------------------------------
router.post(
  '/change-password',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { id: req.userId },
      });

      if (!user) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);
      if (!isPasswordValid) {
        res.status(401).json({ error: 'Current password is incorrect' });
        return;
      }

      const passwordHash = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({
        where: { id: req.userId },
        data: { passwordHash },
      });

      res.json({ message: 'Mot de passe mis à jour avec succès' });
    } catch (error) {
      console.error('Change password error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /profile (authenticated) - Update own profile
// ---------------------------------------------------------------------------
router.put(
  '/profile',
  authenticate,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { firstName, lastName, phone } = req.body;

      const updateData: Record<string, any> = {};
      if (firstName !== undefined) updateData.firstName = firstName;
      if (lastName !== undefined) updateData.lastName = lastName;
      if (phone !== undefined) updateData.phone = phone;

      const updatedUser = await prisma.user.update({
        where: { id: req.userId },
        data: updateData,
      });

      const { passwordHash: _hash, ...userWithoutPassword } = updatedUser;

      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Update profile error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
