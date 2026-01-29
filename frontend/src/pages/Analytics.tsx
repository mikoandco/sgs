import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  Calendar,
  DollarSign,
  Target,
  Activity,
  BarChart3,
  PieChart,
  ArrowUp,
  ArrowDown,
  Filter,
  Download
} from 'lucide-react';
import { api } from '../services/api';
import { useAuthStore } from '../store/authStore';

interface KPICard {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: React.ReactNode;
  color: string;
}

interface ChartData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    color: string;
  }[];
}

export const Analytics: React.FC = () => {
  const { user } = useAuthStore();
  const [period, setPeriod] = useState<'week' | 'month' | 'quarter' | 'year'>('month');
  const [loading, setLoading] = useState(true);
  const [kpis, setKpis] = useState<KPICard[]>([]);
  const [pipelineData, setPipelineData] = useState<{ status: string; count: number; amount: number }[]>([]);
  const [conversionData, setConversionData] = useState<ChartData | null>(null);
  const [revenueData, setRevenueData] = useState<ChartData | null>(null);
  const [topPerformers, setTopPerformers] = useState<any[]>([]);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const [globalRes, pipelineRes] = await Promise.all([
        api.getStatsGlobal(),
        api.getStatsPipeline()
      ]);

      const global = (globalRes as any).data || {};
      const pipeline = (pipelineRes as any).data || [];

      // Build KPI cards
      setKpis([
        {
          title: 'Prospects créés',
          value: global.prospectsCreated || 0,
          change: global.prospectsChangePercent || 12,
          changeLabel: 'vs période précédente',
          icon: <Users className="w-6 h-6" />,
          color: 'blue'
        },
        {
          title: 'RDV pris',
          value: global.appointmentsBooked || 0,
          change: global.appointmentsChangePercent || 8,
          changeLabel: 'vs période précédente',
          icon: <Calendar className="w-6 h-6" />,
          color: 'purple'
        },
        {
          title: 'Devis signés',
          value: global.quotesSigned || 0,
          change: global.quotesChangePercent || 15,
          changeLabel: 'vs période précédente',
          icon: <FileText className="w-6 h-6" />,
          color: 'green'
        },
        {
          title: 'CA réalisé',
          value: formatCurrency(global.totalRevenue || 0),
          change: global.revenueChangePercent || 22,
          changeLabel: 'vs période précédente',
          icon: <DollarSign className="w-6 h-6" />,
          color: 'orange'
        },
        {
          title: 'Taux de conversion',
          value: `${(global.conversionRate || 0).toFixed(1)}%`,
          change: global.conversionChangePercent || 3,
          changeLabel: 'vs période précédente',
          icon: <Target className="w-6 h-6" />,
          color: 'cyan'
        },
        {
          title: 'Panier moyen',
          value: formatCurrency(global.averageOrderValue || 0),
          change: global.aovChangePercent || -2,
          changeLabel: 'vs période précédente',
          icon: <Activity className="w-6 h-6" />,
          color: 'pink'
        }
      ]);

      setPipelineData(pipeline);

      // Generate mock chart data for conversion funnel
      setConversionData({
        labels: ['Prospects', 'Qualifiés', 'RDV', 'Devis', 'Signés', 'Installés'],
        datasets: [{
          label: 'Conversion',
          data: [150, 120, 85, 60, 35, 28],
          color: 'blue'
        }]
      });

      // Generate mock revenue by month data
      setRevenueData({
        labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
        datasets: [{
          label: 'CA Mensuel',
          data: [45000, 52000, 48000, 61000, 58000, 72000],
          color: 'green'
        }]
      });

      // Top performers mock
      setTopPerformers([
        { name: 'Jean Dupont', role: 'COMMERCIAL', ca: 125000, quotes: 18, conversion: 45 },
        { name: 'Marie Martin', role: 'COMMERCIAL', ca: 98000, quotes: 15, conversion: 42 },
        { name: 'Pierre Durand', role: 'SDR', rdv: 45, prospects: 85, conversion: 53 },
      ]);

    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; text: string; light: string }> = {
      blue: { bg: 'bg-blue-500', text: 'text-blue-600', light: 'bg-blue-100' },
      purple: { bg: 'bg-purple-500', text: 'text-purple-600', light: 'bg-purple-100' },
      green: { bg: 'bg-green-500', text: 'text-green-600', light: 'bg-green-100' },
      orange: { bg: 'bg-orange-500', text: 'text-orange-600', light: 'bg-orange-100' },
      cyan: { bg: 'bg-cyan-500', text: 'text-cyan-600', light: 'bg-cyan-100' },
      pink: { bg: 'bg-pink-500', text: 'text-pink-600', light: 'bg-pink-100' }
    };
    return colors[color] || colors.blue;
  };

  const pipelineColors: Record<string, string> = {
    NEW: 'bg-gray-500',
    QUALIFYING: 'bg-yellow-500',
    QUALIFIED: 'bg-blue-500',
    APPOINTMENT_SCHEDULED: 'bg-purple-500',
    APPOINTMENT_DONE: 'bg-indigo-500',
    QUOTE_SENT: 'bg-orange-500',
    SIGNED: 'bg-green-500',
    INSTALLATION_PENDING: 'bg-cyan-500',
    INSTALLED: 'bg-emerald-500',
    LOST: 'bg-red-500'
  };

  const pipelineLabels: Record<string, string> = {
    NEW: 'Nouveau',
    QUALIFYING: 'Qualification',
    QUALIFIED: 'Qualifié',
    APPOINTMENT_SCHEDULED: 'RDV planifié',
    APPOINTMENT_DONE: 'RDV effectué',
    QUOTE_SENT: 'Devis envoyé',
    SIGNED: 'Signé',
    INSTALLATION_PENDING: 'Installation',
    INSTALLED: 'Installé',
    LOST: 'Perdu'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytiques</h1>
          <p className="text-gray-600">Vue d'ensemble des performances</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white rounded-lg border p-1">
            {(['week', 'month', 'quarter', 'year'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  period === p ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {p === 'week' ? '7j' : p === 'month' ? '30j' : p === 'quarter' ? '3M' : '12M'}
              </button>
            ))}
          </div>
          <button
            onClick={() => api.downloadStatsReport(period)}
            className="flex items-center gap-2 px-4 py-2 bg-white border rounded-lg hover:bg-gray-50"
          >
            <Download className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            {kpis.map((kpi, index) => {
              const colors = getColorClasses(kpi.color);
              return (
                <div key={index} className="bg-white rounded-xl border p-4">
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 ${colors.light} ${colors.text} rounded-lg flex items-center justify-center`}>
                      {kpi.icon}
                    </div>
                    {kpi.change !== undefined && (
                      <div className={`flex items-center gap-1 text-xs ${
                        kpi.change >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {kpi.change >= 0 ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
                        {Math.abs(kpi.change)}%
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-2xl font-bold text-gray-900">{kpi.value}</p>
                    <p className="text-sm text-gray-500 mt-1">{kpi.title}</p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pipeline Funnel */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Pipeline commercial</h3>
                <BarChart3 className="w-5 h-5 text-gray-400" />
              </div>
              <div className="space-y-3">
                {pipelineData.length > 0 ? pipelineData.map((item, index) => {
                  const maxCount = Math.max(...pipelineData.map(d => d.count));
                  const percentage = maxCount > 0 ? (item.count / maxCount) * 100 : 0;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="w-28 text-sm text-gray-600 truncate">
                        {pipelineLabels[item.status] || item.status}
                      </div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full ${pipelineColors[item.status] || 'bg-gray-500'} rounded-full transition-all`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <div className="w-12 text-right text-sm font-medium">{item.count}</div>
                    </div>
                  );
                }) : (
                  <div className="text-center py-8 text-gray-500">
                    <PieChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>Aucune donnée</p>
                  </div>
                )}
              </div>
            </div>

            {/* Conversion Funnel */}
            <div className="bg-white rounded-xl border p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold text-gray-900">Entonnoir de conversion</h3>
                <TrendingUp className="w-5 h-5 text-gray-400" />
              </div>
              {conversionData && (
                <div className="space-y-3">
                  {conversionData.labels.map((label, index) => {
                    const value = conversionData.datasets[0].data[index];
                    const maxValue = conversionData.datasets[0].data[0];
                    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    const convRate = index > 0
                      ? ((value / conversionData.datasets[0].data[index - 1]) * 100).toFixed(0)
                      : '100';
                    return (
                      <div key={index} className="flex items-center gap-3">
                        <div className="w-20 text-sm text-gray-600">{label}</div>
                        <div className="flex-1 h-8 bg-gray-100 rounded relative overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded transition-all flex items-center justify-end pr-2"
                            style={{ width: `${percentage}%` }}
                          >
                            <span className="text-white text-xs font-medium">{value}</span>
                          </div>
                        </div>
                        <div className="w-12 text-right text-xs text-gray-500">{convRate}%</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="bg-white rounded-xl border p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold text-gray-900">Évolution du CA</h3>
              <DollarSign className="w-5 h-5 text-gray-400" />
            </div>
            {revenueData && (
              <div className="h-64">
                <div className="flex items-end justify-between h-full gap-4">
                  {revenueData.labels.map((label, index) => {
                    const value = revenueData.datasets[0].data[index];
                    const maxValue = Math.max(...revenueData.datasets[0].data);
                    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
                    return (
                      <div key={index} className="flex-1 flex flex-col items-center h-full">
                        <div className="flex-1 w-full flex items-end justify-center">
                          <div
                            className="w-full max-w-16 bg-gradient-to-t from-green-600 to-green-400 rounded-t-lg transition-all hover:from-green-500 hover:to-green-300 cursor-pointer group relative"
                            style={{ height: `${percentage}%` }}
                          >
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                              {formatCurrency(value)}
                            </div>
                          </div>
                        </div>
                        <div className="mt-2 text-sm text-gray-600">{label}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-xl border overflow-hidden">
            <div className="px-6 py-4 border-b">
              <h3 className="font-semibold text-gray-900">Top Performers</h3>
            </div>
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collaborateur</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rôle</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Performance</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Conversion</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {topPerformers.map((performer, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-sm font-semibold text-gray-600">
                          {performer.name.split(' ').map((n: string) => n[0]).join('')}
                        </div>
                        <span className="font-medium text-gray-900">{performer.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        performer.role === 'COMMERCIAL' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {performer.role === 'COMMERCIAL' ? 'Commercial' : 'SDR'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {performer.role === 'COMMERCIAL' ? (
                        <div className="text-sm">
                          <span className="font-medium">{formatCurrency(performer.ca)}</span>
                          <span className="text-gray-500 ml-2">({performer.quotes} devis)</span>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <span className="font-medium">{performer.rdv} RDV</span>
                          <span className="text-gray-500 ml-2">({performer.prospects} prospects)</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span className="font-medium text-gray-900">{performer.conversion}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
};

export default Analytics;
