import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import {
  LayoutDashboard, Users, Calendar, FileText, Bell, CheckSquare,
  DollarSign, BarChart3, Settings, UserCog, Package, HelpCircle,
  Map, LogOut, Menu, X, ChevronDown, Shield, UserPlus, CreditCard,
  FileSignature, Trophy, User, TrendingUp, Download, Mail, Zap
} from 'lucide-react';
import NotificationDropdown from './NotificationDropdown';

const navItems = {
  SDR: [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/prospects', icon: Users, label: 'Prospects' },
    { to: '/prospects/new', icon: UserPlus, label: 'Nouveau prospect' },
    { to: '/appointments', icon: Calendar, label: 'Rendez-vous' },
    { to: '/calendar', icon: Calendar, label: 'Calendrier' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
    { to: '/gamification', icon: Trophy, label: 'Classement' },
  ],
  COMMERCIAL: [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/prospects', icon: Users, label: 'Clients / Prospects' },
    { to: '/appointments', icon: Calendar, label: 'Mes RDV' },
    { to: '/calendar', icon: Calendar, label: 'Calendrier' },
    { to: '/quotes', icon: FileText, label: 'Devis' },
    { to: '/contracts', icon: FileSignature, label: 'Contrats' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
    { to: '/commissions', icon: DollarSign, label: 'Mes commissions' },
    { to: '/gamification', icon: Trophy, label: 'Classement' },
  ],
  DIRECTION: [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/prospects', icon: Users, label: 'Prospects / Clients' },
    { to: '/quotes', icon: FileText, label: 'Devis' },
    { to: '/validations', icon: CheckSquare, label: 'Validations' },
    { to: '/payments', icon: CreditCard, label: 'Paiements' },
    { to: '/contracts', icon: FileSignature, label: 'Contrats' },
    { to: '/commissions', icon: DollarSign, label: 'Commissions' },
    { to: '/stats', icon: BarChart3, label: 'Statistiques' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytiques' },
    { to: '/reports', icon: Download, label: 'Rapports' },
    { to: '/gamification', icon: Trophy, label: 'Classement' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
  ],
  ADMIN: [
    { to: '/', icon: LayoutDashboard, label: 'Tableau de bord' },
    { to: '/prospects', icon: Users, label: 'Prospects / Clients' },
    { to: '/quotes', icon: FileText, label: 'Devis' },
    { to: '/validations', icon: CheckSquare, label: 'Validations' },
    { to: '/payments', icon: CreditCard, label: 'Paiements' },
    { to: '/contracts', icon: FileSignature, label: 'Contrats' },
    { to: '/commissions', icon: DollarSign, label: 'Commissions' },
    { to: '/stats', icon: BarChart3, label: 'Statistiques' },
    { to: '/analytics', icon: TrendingUp, label: 'Analytiques' },
    { to: '/reports', icon: Download, label: 'Rapports' },
    { to: '/gamification', icon: Trophy, label: 'Classement' },
    { to: '/alerts', icon: Bell, label: 'Alertes' },
    { to: '/admin/users', icon: UserCog, label: 'Utilisateurs' },
    { to: '/admin/products', icon: Package, label: 'Catalogue' },
    { to: '/admin/questions', icon: HelpCircle, label: 'Questions' },
    { to: '/admin/zones', icon: Map, label: 'Zones' },
    { to: '/admin/commissions', icon: Settings, label: 'Config Commissions' },
    { to: '/admin/emails', icon: Mail, label: 'Modèles Emails' },
    { to: '/admin/workflows', icon: Zap, label: 'Automatisations' },
  ],
};

export default function Layout() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const items = user ? navItems[user.role] || navItems.SDR : [];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-64 bg-sgs-blue transform transition-transform lg:translate-x-0 lg:static lg:z-auto
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-blue-800">
          <div className="flex items-center gap-2">
            <Shield className="h-8 w-8 text-white" />
            <div>
              <h1 className="text-white font-bold text-lg leading-tight">Solution GS</h1>
              <p className="text-blue-300 text-xs">CRM Commercial</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-white">
            <X className="h-5 w-5" />
          </button>
        </div>

        <nav className="mt-4 px-3 space-y-1 flex-1 overflow-y-auto">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-blue-700 text-white'
                    : 'text-blue-200 hover:bg-blue-800 hover:text-white'
                }`
              }
            >
              <item.icon className="h-5 w-5 flex-shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-600">
            <Menu className="h-6 w-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <NotificationDropdown />
          </div>

          <div className="relative ml-4">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 text-sm text-gray-700 hover:text-gray-900"
            >
              <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold text-sm">
                {user?.firstName?.[0]}{user?.lastName?.[0]}
              </div>
              <span className="hidden sm:block">{user?.firstName} {user?.lastName}</span>
              <span className="hidden sm:block text-xs text-gray-500">({user?.role})</span>
              <ChevronDown className="h-4 w-4" />
            </button>

            {userMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setUserMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border z-20 py-1">
                  <NavLink
                    to="/profile"
                    onClick={() => setUserMenuOpen(false)}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <User className="h-4 w-4" />
                    Mon profil
                  </NavLink>
                  <hr className="my-1 border-gray-200" />
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <LogOut className="h-4 w-4" />
                    Se deconnecter
                  </button>
                </div>
              </>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
