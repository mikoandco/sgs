import React, { useState } from 'react';
import {
  FileText,
  Download,
  Calendar,
  Users,
  DollarSign,
  FileSignature,
  CreditCard,
  Filter,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface ReportType {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  permissions: string[];
  format: string[];
}

const reportTypes: ReportType[] = [
  {
    id: 'prospects',
    name: 'Export Prospects',
    description: 'Liste complète des prospects avec leurs informations et statuts',
    icon: <Users className="w-6 h-6" />,
    color: 'blue',
    permissions: ['SDR', 'COMMERCIAL', 'DIRECTION', 'ADMIN'],
    format: ['CSV', 'PDF']
  },
  {
    id: 'quotes',
    name: 'Export Devis',
    description: 'Tous les devis avec montants, statuts et détails clients',
    icon: <FileText className="w-6 h-6" />,
    color: 'green',
    permissions: ['COMMERCIAL', 'DIRECTION', 'ADMIN'],
    format: ['CSV', 'PDF']
  },
  {
    id: 'commissions',
    name: 'Export Commissions',
    description: 'Détail des commissions par commercial et période',
    icon: <DollarSign className="w-6 h-6" />,
    color: 'orange',
    permissions: ['DIRECTION', 'ADMIN'],
    format: ['CSV', 'PDF']
  },
  {
    id: 'payments',
    name: 'Export Paiements',
    description: 'Suivi des encaissements et paiements en attente',
    icon: <CreditCard className="w-6 h-6" />,
    color: 'purple',
    permissions: ['DIRECTION', 'ADMIN'],
    format: ['CSV']
  },
  {
    id: 'contracts',
    name: 'Export Contrats',
    description: 'Contrats de maintenance et télésurveillance',
    icon: <FileSignature className="w-6 h-6" />,
    color: 'cyan',
    permissions: ['DIRECTION', 'ADMIN'],
    format: ['CSV', 'PDF']
  },
  {
    id: 'stats',
    name: 'Rapport Statistiques',
    description: 'Rapport complet de performance avec graphiques',
    icon: <Calendar className="w-6 h-6" />,
    color: 'pink',
    permissions: ['DIRECTION', 'ADMIN'],
    format: ['PDF']
  }
];

export const Reports: React.FC = () => {
  const { user } = useAuthStore();
  const [generating, setGenerating] = useState<string | null>(null);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [filters, setFilters] = useState({
    status: '',
    commercial: '',
    zone: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [recentExports, setRecentExports] = useState<{ id: string; name: string; date: string; status: string }[]>([
    { id: '1', name: 'prospects_export_2024-01-25.csv', date: '2024-01-25 14:32', status: 'completed' },
    { id: '2', name: 'quotes_export_2024-01-24.csv', date: '2024-01-24 09:15', status: 'completed' },
    { id: '3', name: 'commissions_Q1_2024.pdf', date: '2024-01-20 16:45', status: 'completed' },
  ]);

  const handleExport = async (reportId: string, format: string) => {
    setGenerating(reportId);

    const params = {
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
      ...filters
    };

    try {
      switch (reportId) {
        case 'prospects':
          api.exportProspects(params);
          break;
        case 'quotes':
          api.exportQuotes(params);
          break;
        case 'commissions':
          api.exportCommissions(params);
          break;
        case 'stats':
          await api.downloadStatsReport('month');
          break;
        default:
          console.log('Export not implemented for:', reportId);
      }

      // Add to recent exports
      setRecentExports([
        {
          id: Date.now().toString(),
          name: `${reportId}_export_${new Date().toISOString().split('T')[0]}.${format.toLowerCase()}`,
          date: new Date().toLocaleString('fr-FR'),
          status: 'completed'
        },
        ...recentExports.slice(0, 4)
      ]);
    } catch (error) {
      console.error('Export error:', error);
    } finally {
      setGenerating(null);
    }
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; light: string; border: string }> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-50', border: 'border-blue-200' },
      green: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-50', border: 'border-green-200' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-50', border: 'border-orange-200' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-50', border: 'border-purple-200' },
      cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-50', border: 'border-cyan-200' },
      pink: { bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-50', border: 'border-pink-200' }
    };
    return colors[color] || colors.blue;
  };

  // Filter reports based on user role
  const availableReports = reportTypes.filter(report =>
    report.permissions.includes(user?.role || '')
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rapports & Exports</h1>
          <p className="text-gray-600">Générez et téléchargez vos données</p>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className={`flex items-center gap-2 px-4 py-2 border rounded-lg transition-colors ${
            showFilters ? 'bg-blue-50 border-blue-300 text-blue-700' : 'hover:bg-gray-50'
          }`}
        >
          <Filter className="w-4 h-4" />
          Filtres
        </button>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les statuts</option>
                <option value="NEW">Nouveau</option>
                <option value="QUALIFIED">Qualifié</option>
                <option value="SIGNED">Signé</option>
                <option value="INSTALLED">Installé</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Commercial</label>
              <select
                value={filters.commercial}
                onChange={(e) => setFilters({ ...filters, commercial: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tous les commerciaux</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Report Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {availableReports.map((report) => {
          const colors = getColorClasses(report.color);
          return (
            <div
              key={report.id}
              className={`bg-white rounded-xl border ${colors.border} p-6 hover:shadow-md transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${colors.light} ${colors.text} rounded-lg flex items-center justify-center`}>
                  {report.icon}
                </div>
                {generating === report.id && (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                )}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{report.name}</h3>
              <p className="text-sm text-gray-600 mb-4">{report.description}</p>
              <div className="flex gap-2">
                {report.format.map((format) => (
                  <button
                    key={format}
                    onClick={() => handleExport(report.id, format)}
                    disabled={generating === report.id}
                    className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                      format === 'CSV'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-700 hover:bg-red-200'
                    } disabled:opacity-50`}
                  >
                    <Download className="w-4 h-4" />
                    {format}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Recent Exports */}
      <div className="bg-white rounded-xl border">
        <div className="px-6 py-4 border-b">
          <h3 className="font-semibold text-gray-900">Exports récents</h3>
        </div>
        <div className="divide-y">
          {recentExports.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucun export récent</p>
            </div>
          ) : (
            recentExports.map((export_) => (
              <div key={export_.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                    export_.name.endsWith('.csv') ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                  }`}>
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{export_.name}</p>
                    <p className="text-sm text-gray-500">{export_.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {export_.status === 'completed' ? (
                    <span className="flex items-center gap-1 text-sm text-green-600">
                      <CheckCircle className="w-4 h-4" />
                      Terminé
                    </span>
                  ) : export_.status === 'processing' ? (
                    <span className="flex items-center gap-1 text-sm text-orange-600">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                      En cours
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-sm text-red-600">
                      <AlertTriangle className="w-4 h-4" />
                      Erreur
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Help Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
        <h4 className="font-semibold text-blue-900 mb-2">Besoin d'un rapport personnalisé ?</h4>
        <p className="text-sm text-blue-700">
          Contactez l'équipe technique pour créer des rapports sur mesure adaptés à vos besoins spécifiques.
          Les exports incluent les données de la période sélectionnée et respectent vos droits d'accès.
        </p>
      </div>
    </div>
  );
};

export default Reports;
