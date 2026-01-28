import {
  Users,
  Calendar,
  FileText,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Target,
  BarChart3,
  ArrowRight,
  Clock,
  CheckCircle,
  PhoneCall,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { UserRole } from '../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

const formatNumber = (value: number) =>
  new Intl.NumberFormat('fr-FR').format(value);

const formatPercent = (value: number) => `${value.toFixed(1)} %`;

// ---------------------------------------------------------------------------
// KPI card type & data by role
// ---------------------------------------------------------------------------

interface KpiCard {
  label: string;
  value: string;
  icon: React.ElementType;
  color: string; // Tailwind color class prefix, e.g. "blue", "green"
}

function getKpiCards(role: UserRole): KpiCard[] {
  switch (role) {
    case 'SDR':
      return [
        {
          label: 'Prospects \u00e0 traiter',
          value: formatNumber(47),
          icon: Users,
          color: 'blue',
        },
        {
          label: 'RDV planifi\u00e9s',
          value: formatNumber(12),
          icon: Calendar,
          color: 'green',
        },
        {
          label: 'Alertes',
          value: formatNumber(5),
          icon: AlertTriangle,
          color: 'yellow',
        },
        {
          label: 'Taux de conversion',
          value: formatPercent(23.4),
          icon: TrendingUp,
          color: 'purple',
        },
      ];
    case 'COMMERCIAL':
      return [
        {
          label: "RDV aujourd'hui",
          value: formatNumber(4),
          icon: Calendar,
          color: 'blue',
        },
        {
          label: 'Devis en cours',
          value: formatNumber(8),
          icon: FileText,
          color: 'orange',
        },
        {
          label: 'CA du mois',
          value: formatCurrency(34500),
          icon: DollarSign,
          color: 'green',
        },
        {
          label: 'Commissions',
          value: formatCurrency(2870),
          icon: Target,
          color: 'purple',
        },
      ];
    case 'DIRECTION':
    case 'ADMIN':
    default:
      return [
        {
          label: 'CA du mois',
          value: formatCurrency(127800),
          icon: DollarSign,
          color: 'green',
        },
        {
          label: 'Dossiers en attente',
          value: formatNumber(15),
          icon: FileText,
          color: 'orange',
        },
        {
          label: 'Taux de closing',
          value: formatPercent(31.2),
          icon: TrendingUp,
          color: 'blue',
        },
        {
          label: 'Pipeline',
          value: formatCurrency(284000),
          icon: BarChart3,
          color: 'purple',
        },
      ];
  }
}

// ---------------------------------------------------------------------------
// Color helpers for KPI cards
// ---------------------------------------------------------------------------

const colorMap: Record<string, { bg: string; text: string; ring: string }> = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', ring: 'ring-blue-200' },
  green: { bg: 'bg-green-100', text: 'text-green-600', ring: 'ring-green-200' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', ring: 'ring-yellow-200' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', ring: 'ring-orange-200' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', ring: 'ring-purple-200' },
};

// ---------------------------------------------------------------------------
// Quick action data by role
// ---------------------------------------------------------------------------

interface QuickAction {
  label: string;
  icon: React.ElementType;
  path: string;
  variant: 'primary' | 'secondary';
}

function getQuickActions(role: UserRole): QuickAction[] {
  switch (role) {
    case 'SDR':
      return [
        { label: 'Nouveau prospect', icon: Users, path: '/prospects/new', variant: 'primary' },
        { label: 'Voir alertes', icon: AlertTriangle, path: '/alerts', variant: 'secondary' },
      ];
    case 'COMMERCIAL':
      return [
        { label: 'Mes RDV', icon: Calendar, path: '/appointments', variant: 'primary' },
        { label: 'Nouveau devis', icon: FileText, path: '/quotes', variant: 'secondary' },
      ];
    case 'DIRECTION':
    case 'ADMIN':
    default:
      return [
        { label: 'Validations', icon: CheckCircle, path: '/validations', variant: 'primary' },
        { label: 'Statistiques', icon: BarChart3, path: '/stats', variant: 'secondary' },
      ];
  }
}

// ---------------------------------------------------------------------------
// Recent activity placeholder data
// ---------------------------------------------------------------------------

interface ActivityItem {
  id: string;
  icon: React.ElementType;
  text: string;
  time: string;
  color: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    icon: PhoneCall,
    text: 'Appel sortant vers Tabac Le Mistral - RDV pris',
    time: 'Il y a 15 min',
    color: 'green',
  },
  {
    id: '2',
    icon: FileText,
    text: 'Devis #D-2024-0147 envoy\u00e9 \u00e0 Brasserie du Port',
    time: 'Il y a 1h',
    color: 'blue',
  },
  {
    id: '3',
    icon: CheckCircle,
    text: 'Devis #D-2024-0139 valid\u00e9 par la direction',
    time: 'Il y a 2h',
    color: 'green',
  },
  {
    id: '4',
    icon: AlertTriangle,
    text: 'Alerte relance : PMU de la Gare - sans nouvelle depuis 7j',
    time: 'Il y a 3h',
    color: 'yellow',
  },
  {
    id: '5',
    icon: Clock,
    text: 'RDV demain 10h - Pressing Central, 12 rue Foch',
    time: 'Il y a 4h',
    color: 'blue',
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function DashboardPage() {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  if (!user) return null;

  const role = user.role;
  const kpis = getKpiCards(role);
  const quickActions = getQuickActions(role);

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          Bonjour, {user.firstName}
        </h1>
        <p className="text-gray-500 mt-1">
          Voici votre tableau de bord pour aujourd&apos;hui.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpis.map((kpi) => {
          const colors = colorMap[kpi.color] ?? colorMap.blue;
          const Icon = kpi.icon;
          return (
            <div key={kpi.label} className="card flex items-start gap-4">
              <div
                className={`flex-shrink-0 flex items-center justify-center w-12 h-12 rounded-lg ring-1 ${colors.bg} ${colors.ring}`}
              >
                <Icon className={`w-6 h-6 ${colors.text}`} />
              </div>
              <div className="min-w-0">
                <p className="text-sm text-gray-500 truncate">{kpi.label}</p>
                <p className="text-xl font-semibold text-gray-900 mt-0.5">{kpi.value}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Two-column section: Recent activity + Quick actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Activit&eacute; r&eacute;cente
          </h2>
          <ul className="divide-y divide-gray-100">
            {recentActivity.map((item) => {
              const colors = colorMap[item.color] ?? colorMap.blue;
              const Icon = item.icon;
              return (
                <li key={item.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                  <div
                    className={`flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full ${colors.bg}`}
                  >
                    <Icon className={`w-4 h-4 ${colors.text}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-700">{item.text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{item.time}</p>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Quick Actions */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Actions rapides
          </h2>
          <div className="space-y-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              const btnClass =
                action.variant === 'primary' ? 'btn-primary' : 'btn-secondary';
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className={`${btnClass} w-full flex items-center justify-between gap-2`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="w-5 h-5" />
                    {action.label}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
