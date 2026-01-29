import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useAuthStore } from './store/authStore';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import Dashboard from './pages/Dashboard';
import ProspectListPage from './pages/prospects/ProspectListPage';
import ProspectDetailPage from './pages/prospects/ProspectDetailPage';
import ProspectWizardPage from './pages/prospects/ProspectWizardPage';
import AppointmentListPage from './pages/appointments/AppointmentListPage';
import CalendarPage from './pages/appointments/CalendarPage';
import QuoteListPage from './pages/quotes/QuoteListPage';
import QuoteDetailPage from './pages/quotes/QuoteDetailPage';
import QuoteEditorPage from './pages/quotes/QuoteEditorPage';
import AlertListPage from './pages/alerts/AlertListPage';
import ValidationListPage from './pages/direction/ValidationListPage';
import CommissionListPage from './pages/direction/CommissionListPage';
import StatsPage from './pages/direction/StatsPage';
import UserListPage from './pages/admin/UserListPage';
import ProductListPage from './pages/admin/ProductListPage';
import QuestionConfigPage from './pages/admin/QuestionConfigPage';
import ZoneConfigPage from './pages/admin/ZoneConfigPage';
import CommissionConfigPage from './pages/admin/CommissionConfigPage';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Payments from './pages/Payments';
import Contracts from './pages/Contracts';
import ProfilePage from './pages/ProfilePage';
import Gamification from './pages/Gamification';
import Analytics from './pages/Analytics';
import Reports from './pages/Reports';

function ProtectedRoute({ children, roles }: { children: React.ReactNode; roles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" />;
  return <>{children}</>;
}

export default function App() {
  const { initialize, isAuthenticated } = useAuthStore();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initialize().finally(() => setReady(true));
  }, [initialize]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" /> : <LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />

          {/* Prospects */}
          <Route path="prospects" element={<ProspectListPage />} />
          <Route path="prospects/new" element={<ProtectedRoute roles={['SDR', 'ADMIN']}><ProspectWizardPage /></ProtectedRoute>} />
          <Route path="prospects/:id" element={<ProspectDetailPage />} />

          {/* Appointments */}
          <Route path="appointments" element={<AppointmentListPage />} />
          <Route path="calendar" element={<CalendarPage />} />

          {/* Quotes */}
          <Route path="quotes" element={<QuoteListPage />} />
          <Route path="quotes/new/:prospectId" element={<ProtectedRoute roles={['COMMERCIAL', 'ADMIN']}><QuoteEditorPage /></ProtectedRoute>} />
          <Route path="quotes/:id" element={<QuoteDetailPage />} />
          <Route path="quotes/:id/edit" element={<ProtectedRoute roles={['COMMERCIAL', 'ADMIN']}><QuoteEditorPage /></ProtectedRoute>} />

          {/* Alerts */}
          <Route path="alerts" element={<AlertListPage />} />

          {/* Direction */}
          <Route path="validations" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN']}><ValidationListPage /></ProtectedRoute>} />
          <Route path="commissions" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN', 'COMMERCIAL']}><CommissionListPage /></ProtectedRoute>} />
          <Route path="stats" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN']}><StatsPage /></ProtectedRoute>} />
          <Route path="payments" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN']}><Payments /></ProtectedRoute>} />
          <Route path="contracts" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN', 'COMMERCIAL']}><Contracts /></ProtectedRoute>} />

          {/* Profile & Gamification */}
          <Route path="profile" element={<ProfilePage />} />
          <Route path="gamification" element={<Gamification />} />

          {/* Analytics & Reports */}
          <Route path="analytics" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN']}><Analytics /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute roles={['DIRECTION', 'ADMIN']}><Reports /></ProtectedRoute>} />

          {/* Admin */}
          <Route path="admin/users" element={<ProtectedRoute roles={['ADMIN']}><UserListPage /></ProtectedRoute>} />
          <Route path="admin/products" element={<ProtectedRoute roles={['ADMIN']}><ProductListPage /></ProtectedRoute>} />
          <Route path="admin/questions" element={<ProtectedRoute roles={['ADMIN']}><QuestionConfigPage /></ProtectedRoute>} />
          <Route path="admin/zones" element={<ProtectedRoute roles={['ADMIN']}><ZoneConfigPage /></ProtectedRoute>} />
          <Route path="admin/commissions" element={<ProtectedRoute roles={['ADMIN']}><CommissionConfigPage /></ProtectedRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
