import { useNavigate } from 'react-router-dom';
import {
  Plus,
  Calendar,
  FileText,
  Users,
  Phone,
  ClipboardList,
  TrendingUp,
  Settings,
  Upload,
  Bell
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';

export const QuickActions: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const actions = [
    // SDR Actions
    ...(user?.role === 'SDR' || user?.role === 'ADMIN' ? [
      {
        icon: Plus,
        label: 'Nouveau prospect',
        description: 'Créer une fiche prospect',
        color: 'bg-blue-500',
        onClick: () => navigate('/prospects/new'),
      },
      {
        icon: Phone,
        label: 'Appels du jour',
        description: 'Voir les rappels',
        color: 'bg-green-500',
        onClick: () => navigate('/alerts'),
      },
      {
        icon: Upload,
        label: 'Importer CSV',
        description: 'Import en masse',
        color: 'bg-purple-500',
        onClick: () => navigate('/settings?tab=import'),
      },
    ] : []),

    // Commercial Actions
    ...(user?.role === 'COMMERCIAL' || user?.role === 'ADMIN' ? [
      {
        icon: Calendar,
        label: 'Mes RDV',
        description: 'Voir le planning',
        color: 'bg-indigo-500',
        onClick: () => navigate('/appointments/calendar'),
      },
      {
        icon: FileText,
        label: 'Nouveau devis',
        description: 'Créer un devis',
        color: 'bg-orange-500',
        onClick: () => navigate('/quotes'),
      },
      {
        icon: ClipboardList,
        label: 'Mes prospects',
        description: 'Liste complète',
        color: 'bg-teal-500',
        onClick: () => navigate('/prospects'),
      },
    ] : []),

    // Direction Actions
    ...(user?.role === 'DIRECTION' || user?.role === 'ADMIN' ? [
      {
        icon: TrendingUp,
        label: 'Statistiques',
        description: 'Tableaux de bord',
        color: 'bg-pink-500',
        onClick: () => navigate('/direction/stats'),
      },
      {
        icon: Users,
        label: 'Validations',
        description: 'Devis en attente',
        color: 'bg-yellow-500',
        onClick: () => navigate('/direction/validations'),
      },
      {
        icon: Bell,
        label: 'Commissions',
        description: 'Gestion des primes',
        color: 'bg-red-500',
        onClick: () => navigate('/direction/commissions'),
      },
    ] : []),

    // Admin Actions
    ...(user?.role === 'ADMIN' ? [
      {
        icon: Settings,
        label: 'Administration',
        description: 'Configuration',
        color: 'bg-gray-700',
        onClick: () => navigate('/admin/users'),
      },
    ] : []),
  ];

  return (
    <div className="bg-white rounded-xl border p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Actions rapides</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {actions.map((action, index) => {
          const Icon = action.icon;
          return (
            <button
              key={index}
              onClick={action.onClick}
              className="flex flex-col items-center p-4 rounded-xl border border-gray-200 hover:border-primary-300 hover:bg-primary-50 transition-all group"
            >
              <div className={`w-12 h-12 ${action.color} rounded-xl flex items-center justify-center mb-3 group-hover:scale-110 transition-transform`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
              <span className="text-sm font-medium text-gray-900 text-center">{action.label}</span>
              <span className="text-xs text-gray-500 text-center mt-1">{action.description}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
