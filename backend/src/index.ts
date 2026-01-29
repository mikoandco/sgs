import express from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth';
import prospectRoutes from './routes/prospects';
import appointmentRoutes from './routes/appointments';
import quoteRoutes from './routes/quotes';
import productRoutes from './routes/products';
import alertRoutes from './routes/alerts';
import commissionRoutes from './routes/commissions';
import validationRoutes from './routes/validations';
import statsRoutes from './routes/stats';
import adminRoutes from './routes/admin';
import uploadRoutes from './routes/uploads';
import paymentRoutes from './routes/payments';
import contractRoutes from './routes/contracts';
import exportRoutes from './routes/exports';
import notificationRoutes from './routes/notifications';
import commentRoutes from './routes/comments';

const app = express();
const PORT = process.env.PORT || 3001;

// Trust proxy for Railway/production
app.set('trust proxy', 1);

// CORS configuration
const corsOptions = {
  origin: process.env.FRONTEND_URL || '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/prospects', prospectRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/quotes', quoteRoutes);
app.use('/api/products', productRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/commissions', commissionRoutes);
app.use('/api/validations', validationRoutes);
app.use('/api/stats', statsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/contracts', contractRoutes);
app.use('/api/exports', exportRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/comments', commentRoutes);

app.listen(PORT, () => {
  console.log(`SGS CRM Backend running on port ${PORT}`);
});

export default app;
