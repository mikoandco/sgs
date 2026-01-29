import { Router, Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();

// Get comments for a prospect
router.get('/prospect/:prospectId', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prospectId } = req.params;

    const comments = await prisma.comment.findMany({
      where: { prospectId },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Failed to fetch comments' });
  }
});

// Add a comment
router.post('/', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { prospectId, content, mentions } = req.body;
    const userId = req.user!.id;

    const comment = await prisma.comment.create({
      data: {
        prospectId,
        authorId: userId,
        content,
        mentions: mentions || []
      },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    // Create timeline entry for the prospect
    await prisma.timelineEntry.create({
      data: {
        prospectId,
        userId,
        type: 'COMMENT',
        description: `Commentaire ajouté`
      }
    });

    // Notify mentioned users (if any)
    if (mentions && mentions.length > 0) {
      const author = await prisma.user.findUnique({ where: { id: userId } });
      for (const mentionedUserId of mentions) {
        // In-app notification could be added here
        console.log(`Notify user ${mentionedUserId} about mention by ${author?.firstName}`);
      }
    }

    res.status(201).json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Failed to create comment' });
  }
});

// Update a comment
router.put('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user!.id;

    // Check if user is the author
    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.authorId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to edit this comment' });
    }

    const comment = await prisma.comment.update({
      where: { id },
      data: { content, updatedAt: new Date() },
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true }
        }
      }
    });

    res.json(comment);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Failed to update comment' });
  }
});

// Delete a comment
router.delete('/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const existing = await prisma.comment.findUnique({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    if (existing.authorId !== userId && req.user!.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    await prisma.comment.delete({ where: { id } });

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Failed to delete comment' });
  }
});

// Get recent comments across all prospects (for activity feed)
router.get('/recent', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;

    const comments = await prisma.comment.findMany({
      take: limit,
      include: {
        author: {
          select: { id: true, firstName: true, lastName: true, role: true }
        },
        prospect: {
          select: { id: true, companyName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(comments);
  } catch (error) {
    console.error('Error fetching recent comments:', error);
    res.status(500).json({ error: 'Failed to fetch recent comments' });
  }
});

export default router;
