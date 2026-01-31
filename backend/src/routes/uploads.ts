import { Router, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate } from '../middleware/auth';
import { AuthRequest } from '../types';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
const prisma = new PrismaClient();

// Configure upload directory
const uploadDir = process.env.UPLOAD_DIR || './uploads';

// Ensure upload directories exist
const directories = ['documents', 'photos', 'signatures', 'audits', 'checks'];
directories.forEach(dir => {
  const fullPath = path.join(uploadDir, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
  }
});

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const category = (req.query.category as string) || 'documents';
    const destPath = path.join(uploadDir, category);
    cb(null, destPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `${uuidv4()}${ext}`;
    cb(null, filename);
  },
});

// File filter
const fileFilter = (req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ];

  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Type de fichier non autorisé'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

// All routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// POST / - Upload a file
// ---------------------------------------------------------------------------
router.post('/', upload.single('file'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    const { prospectId, type, name } = req.body;
    const category = (req.query.category as string) || 'documents';

    const fileUrl = `/uploads/${category}/${req.file.filename}`;

    // If prospectId is provided, create a Document record
    if (prospectId) {
      const document = await prisma.document.create({
        data: {
          prospectId,
          type: type || category,
          name: name || req.file.originalname,
          url: fileUrl,
        },
      });

      // Create timeline entry
      await prisma.timelineEntry.create({
        data: {
          prospectId,
          userId: req.userId!,
          type: 'DOCUMENT_ADDED',
          content: `Document ajouté: ${name || req.file.originalname}`,
          metadata: JSON.stringify({ documentId: document.id, type }),
        },
      });

      res.status(201).json({
        data: {
          document,
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    } else {
      res.status(201).json({
        data: {
          url: fileUrl,
          filename: req.file.filename,
          originalName: req.file.originalname,
          size: req.file.size,
          mimetype: req.file.mimetype,
        },
      });
    }
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload du fichier' });
  }
});

// ---------------------------------------------------------------------------
// POST /multiple - Upload multiple files
// ---------------------------------------------------------------------------
router.post('/multiple', upload.array('files', 10), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const files = req.files as Express.Multer.File[];
    if (!files || files.length === 0) {
      res.status(400).json({ error: 'Aucun fichier fourni' });
      return;
    }

    const { prospectId, type } = req.body;
    const category = (req.query.category as string) || 'documents';

    const results: Array<{
      document?: unknown;
      url: string;
      filename: string;
      originalName: string;
      size: number;
    }> = [];

    for (const file of files) {
      const fileUrl = `/uploads/${category}/${file.filename}`;

      if (prospectId) {
        const document = await prisma.document.create({
          data: {
            prospectId,
            type: type || category,
            name: file.originalname,
            url: fileUrl,
          },
        });
        results.push({
          document,
          url: fileUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
        });
      } else {
        results.push({
          url: fileUrl,
          filename: file.filename,
          originalName: file.originalname,
          size: file.size,
        });
      }
    }

    res.status(201).json({ data: results });
  } catch (error) {
    console.error('Error uploading files:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload des fichiers' });
  }
});

// ---------------------------------------------------------------------------
// POST /signature - Upload signature (base64)
// ---------------------------------------------------------------------------
router.post('/signature', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { signature, prospectId, type } = req.body;

    if (!signature) {
      res.status(400).json({ error: 'Signature manquante' });
      return;
    }

    // Decode base64
    const matches = signature.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ error: 'Format de signature invalide' });
      return;
    }

    const ext = matches[1];
    const data = matches[2];
    const buffer = Buffer.from(data, 'base64');

    const filename = `${uuidv4()}.${ext}`;
    const filePath = path.join(uploadDir, 'signatures', filename);

    fs.writeFileSync(filePath, buffer);

    const fileUrl = `/uploads/signatures/${filename}`;

    // If prospectId provided, save as document
    if (prospectId) {
      await prisma.document.create({
        data: {
          prospectId,
          type: type || 'signature',
          name: `Signature ${type || 'client'}`,
          url: fileUrl,
        },
      });
    }

    res.status(201).json({
      data: {
        url: fileUrl,
        filename,
      },
    });
  } catch (error) {
    console.error('Error saving signature:', error);
    res.status(500).json({ error: 'Erreur lors de la sauvegarde de la signature' });
  }
});

// ---------------------------------------------------------------------------
// POST /audit-photo - Upload audit photo with metadata
// ---------------------------------------------------------------------------
router.post('/audit-photo', upload.single('photo'), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Aucune photo fournie' });
      return;
    }

    const { prospectId, category, annotations, lat, lng } = req.body;

    if (!prospectId) {
      res.status(400).json({ error: 'prospectId est requis' });
      return;
    }

    const fileUrl = `/uploads/audits/${req.file.filename}`;

    const auditPhoto = await prisma.auditPhoto.create({
      data: {
        prospectId,
        category: category || 'general',
        url: fileUrl,
        annotations: annotations || null,
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
      },
    });

    res.status(201).json({ data: auditPhoto });
  } catch (error) {
    console.error('Error uploading audit photo:', error);
    res.status(500).json({ error: 'Erreur lors de l\'upload de la photo d\'audit' });
  }
});

// ---------------------------------------------------------------------------
// GET /prospect/:prospectId - Get all documents for a prospect
// ---------------------------------------------------------------------------
router.get('/prospect/:prospectId', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { prospectId } = req.params;

    const [documents, auditPhotos] = await Promise.all([
      prisma.document.findMany({
        where: { prospectId },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.auditPhoto.findMany({
        where: { prospectId },
        orderBy: { takenAt: 'desc' },
      }),
    ]);

    res.json({
      data: {
        documents,
        auditPhotos,
      },
    });
  } catch (error) {
    console.error('Error fetching prospect documents:', error);
    res.status(500).json({ error: 'Erreur lors de la récupération des documents' });
  }
});

// ---------------------------------------------------------------------------
// DELETE /:id - Delete a document
// ---------------------------------------------------------------------------
router.delete('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const document = await prisma.document.findUnique({ where: { id } });
    if (!document) {
      res.status(404).json({ error: 'Document non trouvé' });
      return;
    }

    // Delete file from disk
    const filePath = path.join(process.cwd(), document.url);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.document.delete({ where: { id } });

    res.json({ message: 'Document supprimé' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Erreur lors de la suppression du document' });
  }
});

export default router;
