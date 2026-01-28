import { Router, Response } from 'express';
import { PrismaClient, ProductFamily } from '@prisma/client';
import { authenticate, authorize } from '../middleware/auth';
import { AuthRequest } from '../types';

const prisma = new PrismaClient();
const router = Router();

// All product routes require authentication
router.use(authenticate);

// ---------------------------------------------------------------------------
// GET / - List products with filters
// ---------------------------------------------------------------------------
router.get('/', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { family, active, search } = req.query;

    const where: Record<string, any> = {};

    // Default: only active products
    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true;
    }

    if (family) {
      where.family = family as ProductFamily;
    }

    if (search) {
      const term = search as string;
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { reference: { contains: term, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      orderBy: [{ family: 'asc' }, { name: 'asc' }],
    });

    res.json({ data: products });
  } catch (error) {
    console.error('List products error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /kits - List kits with items and product details
// ---------------------------------------------------------------------------
router.get('/kits', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { active } = req.query;

    const where: Record<string, any> = {};

    if (active !== undefined) {
      where.active = active === 'true';
    } else {
      where.active = true;
    }

    const kits = await prisma.kit.findMany({
      where,
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    res.json({ data: kits });
  } catch (error) {
    console.error('List kits error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// GET /:id - Get product by id with accessories
// ---------------------------------------------------------------------------
router.get('/:id', async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        accessories: {
          include: {
            accessory: true,
          },
        },
      },
    });

    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json({ data: product });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ---------------------------------------------------------------------------
// POST / - Create product (ADMIN only)
// ---------------------------------------------------------------------------
router.post(
  '/',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { reference, name, family, unitPriceHT, purchasePrice, unit, laborHours, active } = req.body;

      if (!reference || !name || !family || unitPriceHT === undefined) {
        res.status(400).json({ error: 'reference, name, family and unitPriceHT are required' });
        return;
      }

      const existing = await prisma.product.findUnique({ where: { reference } });
      if (existing) {
        res.status(409).json({ error: 'A product with this reference already exists' });
        return;
      }

      const product = await prisma.product.create({
        data: {
          reference,
          name,
          family,
          unitPriceHT,
          purchasePrice: purchasePrice ?? null,
          unit: unit || 'piece',
          laborHours: laborHours ?? null,
          active: active !== undefined ? active : true,
        },
      });

      res.status(201).json({ data: product });
    } catch (error) {
      console.error('Create product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /:id - Update product (ADMIN only) - partial update
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { reference, name, family, unitPriceHT, purchasePrice, unit, laborHours, active } = req.body;

      const existingProduct = await prisma.product.findUnique({ where: { id } });
      if (!existingProduct) {
        res.status(404).json({ error: 'Product not found' });
        return;
      }

      // Check duplicate reference if changing
      if (reference && reference !== existingProduct.reference) {
        const duplicate = await prisma.product.findUnique({ where: { reference } });
        if (duplicate) {
          res.status(409).json({ error: 'A product with this reference already exists' });
          return;
        }
      }

      const updateData: Record<string, any> = {};
      if (reference !== undefined) updateData.reference = reference;
      if (name !== undefined) updateData.name = name;
      if (family !== undefined) updateData.family = family;
      if (unitPriceHT !== undefined) updateData.unitPriceHT = unitPriceHT;
      if (purchasePrice !== undefined) updateData.purchasePrice = purchasePrice;
      if (unit !== undefined) updateData.unit = unit;
      if (laborHours !== undefined) updateData.laborHours = laborHours;
      if (active !== undefined) updateData.active = active;

      const product = await prisma.product.update({
        where: { id },
        data: updateData,
      });

      res.json({ data: product });
    } catch (error) {
      console.error('Update product error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// POST /kits - Create kit (ADMIN only)
// ---------------------------------------------------------------------------
router.post(
  '/kits',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, description, items } = req.body;

      if (!name || !Array.isArray(items) || items.length === 0) {
        res.status(400).json({ error: 'name and items (non-empty array) are required' });
        return;
      }

      // Validate all product IDs exist
      const productIds = items.map((item: { productId: string }) => item.productId);
      const products = await prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== productIds.length) {
        res.status(400).json({ error: 'One or more product IDs are invalid' });
        return;
      }

      const kit = await prisma.$transaction(async (tx) => {
        const created = await tx.kit.create({
          data: {
            name,
            description: description ?? null,
          },
        });

        await Promise.all(
          items.map((item: { productId: string; quantity: number }) =>
            tx.kitItem.create({
              data: {
                kitId: created.id,
                productId: item.productId,
                quantity: item.quantity,
              },
            }),
          ),
        );

        return tx.kit.findUnique({
          where: { id: created.id },
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      });

      res.status(201).json({ data: kit });
    } catch (error) {
      console.error('Create kit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

// ---------------------------------------------------------------------------
// PUT /kits/:id - Update kit (ADMIN only)
// ---------------------------------------------------------------------------
router.put(
  '/kits/:id',
  authorize('ADMIN'),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const { name, description, active, items } = req.body;

      const existingKit = await prisma.kit.findUnique({ where: { id } });
      if (!existingKit) {
        res.status(404).json({ error: 'Kit not found' });
        return;
      }

      // If items provided, validate product IDs
      if (items && Array.isArray(items)) {
        const productIds = items.map((item: { productId: string }) => item.productId);
        const products = await prisma.product.findMany({
          where: { id: { in: productIds } },
        });

        if (products.length !== productIds.length) {
          res.status(400).json({ error: 'One or more product IDs are invalid' });
          return;
        }
      }

      const kit = await prisma.$transaction(async (tx) => {
        const updateData: Record<string, any> = {};
        if (name !== undefined) updateData.name = name;
        if (description !== undefined) updateData.description = description;
        if (active !== undefined) updateData.active = active;

        // Delete existing items and recreate if items provided
        if (items && Array.isArray(items)) {
          await tx.kitItem.deleteMany({ where: { kitId: id } });

          await Promise.all(
            items.map((item: { productId: string; quantity: number }) =>
              tx.kitItem.create({
                data: {
                  kitId: id,
                  productId: item.productId,
                  quantity: item.quantity,
                },
              }),
            ),
          );
        }

        return tx.kit.update({
          where: { id },
          data: updateData,
          include: {
            items: {
              include: { product: true },
            },
          },
        });
      });

      res.json({ data: kit });
    } catch (error) {
      console.error('Update kit error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  },
);

export default router;
