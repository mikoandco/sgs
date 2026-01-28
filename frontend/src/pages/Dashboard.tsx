import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  FileText,
  TrendingUp,
  AlertCircle,
  DollarSign,
  Target,
  Award,
  Clock,
  CheckCircle,
  XCircle,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { api } from '../services/api';

interface DashboardStats {
  teleprospection?: {
    prospectsCreated: number;
    prospectsQualified: number;
    appointmentsBooked: number;
    conversionRate: number;
  };
  commercial?: {
    quotesCreated: number;
    quotesSigned: number;
    totalCA: number;
    conversionRate: number;
    referralCount: number;
  };
  pipeline?: {
    byStatus: Array<{ status: string; _count: number; _sum: { totalTTC: number } }>;
    monthlyCA: number;
    quarterlyCA: number;
  };
  global?: {
    totalProspects: number;
    totalQuotes: number;
    totalCA: number;
    monthlyGrowth: number;
  };
}

export const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<DashboardStats>({});
  const [alerts, setAlerts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, [user?.role]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const role = user?.role;

      if (role === 'SDR') {
        const [teleStats, alertsRes] = await Promise.all([
          api.getStatsTeleprospection(),
          api.getAlerts({ limit: '5' }),
        ]);
        setStats({ teleprospection: (teleStats as any).data });
        setAlerts((alertsRes as any).data || []);
      } else if (role === 'COMMERCIAL') {
        const [commStats, alertsRes] = await Promise.all([
          api.getStatsCommercial(),
          api.getAlerts({ limit: '5' }),
        ]);
        setStats({ commercial: (commStats as any).data });
        setAlerts((alertsRes as any).data || []);
      } else if (role === 'DIRECTION' || role === 'ADMIN') {
        const [pipelineRes, globalRes, alertsRes] = await Promise.all([
          api.getStatsPipeline(),
          api.getStatsGlobal(),
          api.getAlerts({ limit: '10' }),
        ]);
        setStats({
          pipeline: (pipelineRes as any).data,
          global: (globalRes as any).data,
        });
        setAlerts((alertsRes as any).data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // SDR Dashboard
  if (user?.role === 'SDR') {
    const teleStats = stats.teleprospection;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour {user.firstName} !
            </h1>
            <p className="text-gray-600">Voici votre activité du jour</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500">{new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prospects créés</p>
                <p className="text-3xl font-bold text-gray-900">{teleStats?.prospectsCreated || 0}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Prospects qualifiés</p>
                <p className="text-3xl font-bold text-gray-900">{teleStats?.prospectsQualified || 0}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">RDV pris</p>
                <p className="text-3xl font-bold text-gray-900">{teleStats?.appointmentsBooked || 0}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taux de conversion</p>
                <p className="text-3xl font-bold text-gray-900">{formatPercent(teleStats?.conversionRate || 0)}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Target className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes & Relances</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune alerte en attente</p>
          ) : (
            <div className="space-y-3">
              {alerts.map((alert: any) => (
                <div key={alert.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <div className={`w-2 h-2 rounded-full ${
                    alert.priority === 'HIGH' ? 'bg-red-500' :
                    alert.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.title}</p>
                    <p className="text-sm text-gray-500">{alert.message}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(alert.dueDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Commercial Dashboard
  if (user?.role === 'COMMERCIAL') {
    const commStats = stats.commercial;
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Bonjour {user.firstName} !
            </h1>
            <p className="text-gray-600">Voici vos performances</p>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Devis créés</p>
                <p className="text-3xl font-bold text-gray-900">{commStats?.quotesCreated || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Devis signés</p>
                <p className="text-3xl font-bold text-gray-900">{commStats?.quotesSigned || 0}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">CA réalisé</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(commStats?.totalCA || 0)}</p>
              </div>
              <DollarSign className="w-8 h-8 text-emerald-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Conversion</p>
                <p className="text-3xl font-bold text-gray-900">{formatPercent(commStats?.conversionRate || 0)}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Parrainages</p>
                <p className="text-3xl font-bold text-gray-900">{commStats?.referralCount || 0}</p>
              </div>
              <Award className="w-8 h-8 text-orange-600" />
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Rendez-vous du jour</h2>
          <div className="text-center py-8">
            <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Consultez votre calendrier</p>
          </div>
        </div>

        {/* Alerts */}
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-4">Aucune alerte</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 5).map((alert: any) => (
                <div key={alert.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <AlertCircle className={`w-5 h-5 ${
                    alert.priority === 'HIGH' ? 'text-red-500' :
                    alert.priority === 'MEDIUM' ? 'text-yellow-500' : 'text-blue-500'
                  }`} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{alert.title}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Direction / Admin Dashboard
  const globalStats = stats.global;
  const pipelineStats = stats.pipeline;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tableau de bord Direction</h1>
          <p className="text-gray-600">Vue d'ensemble de l'activité commerciale</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => api.downloadStatsReport('month')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Exporter le rapport
          </button>
        </div>
      </div>

      {/* Main KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100">CA Total</p>
              <p className="text-3xl font-bold">{formatCurrency(globalStats?.totalCA || 0)}</p>
            </div>
            <DollarSign className="w-10 h-10 text-blue-200" />
          </div>
          <div className="mt-4 flex items-center gap-1 text-sm">
            {(globalStats?.monthlyGrowth || 0) >= 0 ? (
              <>
                <ArrowUpRight className="w-4 h-4" />
                <span>+{formatPercent(globalStats?.monthlyGrowth || 0)} ce mois</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-4 h-4" />
                <span>{formatPercent(globalStats?.monthlyGrowth || 0)} ce mois</span>
              </>
            )}
          </div>
        </div>

        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100">Prospects</p>
              <p className="text-3xl font-bold">{globalStats?.totalProspects || 0}</p>
            </div>
            <Users className="w-10 h-10 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100">Devis</p>
              <p className="text-3xl font-bold">{globalStats?.totalQuotes || 0}</p>
            </div>
            <FileText className="w-10 h-10 text-purple-200" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100">CA Mensuel</p>
              <p className="text-3xl font-bold">{formatCurrency(pipelineStats?.monthlyCA || 0)}</p>
            </div>
            <TrendingUp className="w-10 h-10 text-orange-200" />
          </div>
        </div>
      </div>

      {/* Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pipeline des devis</h2>
          <div className="space-y-4">
            {pipelineStats?.byStatus?.map((item: any) => (
              <div key={item.status} className="flex items-center gap-4">
                <div className="w-24 text-sm text-gray-600">{item.status}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-4">
                  <div
                    className="bg-blue-600 h-4 rounded-full"
                    style={{ width: `${Math.min(100, (item._count / (globalStats?.totalQuotes || 1)) * 100)}%` }}
                  />
                </div>
                <div className="w-16 text-right text-sm font-medium">{item._count}</div>
                <div className="w-24 text-right text-sm text-gray-500">
                  {formatCurrency(item._sum?.totalTTC || 0)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Alertes importantes</h2>
          {alerts.length === 0 ? (
            <p className="text-gray-500 text-center py-8">Aucune alerte</p>
          ) : (
            <div className="space-y-3">
              {alerts.slice(0, 6).map((alert: any) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                    alert.priority === 'HIGH' ? 'bg-red-500' :
                    alert.priority === 'MEDIUM' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{alert.title}</p>
                    <p className="text-sm text-gray-500">{alert.prospect?.companyName}</p>
                  </div>
                  <div className="text-xs text-gray-400">
                    {new Date(alert.dueDate).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
