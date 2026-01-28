import express from 'express';
import cors from 'cors';
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

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

app.listen(PORT, () => {
  console.log(`SGS CRM Backend running on port ${PORT}`);
});

export default app;
