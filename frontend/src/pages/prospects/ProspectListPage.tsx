import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Shield, Monitor, Filter } from 'lucide-react';
import api from '../../services/api';
import type { Prospect } from '../../types';
import { useAuthStore } from '../../store/authStore';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau',
  QUALIFYING: 'En qualification',
  QUALIFIED: 'Qualifié',
  APPOINTMENT_SCHEDULED: 'RDV planifié',
  APPOINTMENT_DONE: 'RDV effectué',
  QUOTE_SENT: 'Devis envoyé',
  SIGNED: 'Signé',
  INSTALLATION_PENDING: 'Installation en cours',
  INSTALLED: 'Installé',
  LOST: 'Perdu',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-gray-100 text-gray-800',
  QUALIFYING: 'bg-blue-100 text-blue-800',
  QUALIFIED: 'bg-yellow-100 text-yellow-800',
  APPOINTMENT_SCHEDULED: 'bg-blue-100 text-blue-800',
  APPOINTMENT_DONE: 'bg-indigo-100 text-indigo-800',
  QUOTE_SENT: 'bg-purple-100 text-purple-800',
  SIGNED: 'bg-green-100 text-green-800',
  INSTALLATION_PENDING: 'bg-orange-100 text-orange-800',
  INSTALLED: 'bg-green-100 text-green-800',
  LOST: 'bg-red-100 text-red-800',
};

export default function ProspectListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [needFilter, setNeedFilter] = useState('');

  useEffect(() => {
    loadProspects();
  }, [search, statusFilter, needFilter]);

  const loadProspects = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (needFilter) params.need = needFilter;
      const res = await api.getProspects(params);
      setProspects(res.data || []);
    } catch (err) {
      console.error('Error loading prospects:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  };

  const canCreate = user?.role === 'SDR' || user?.role === 'ADMIN';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Prospects & Clients</h1>
          <span className="px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
            {prospects.length}
          </span>
        </div>
        {canCreate && (
          <button
            onClick={() => navigate('/prospects/new')}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
          >
            <Plus className="h-5 w-5" />
            Nouveau prospect
          </button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom de société ou décisionnaire..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="pl-9 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
              >
                <option value="">Tous les statuts</option>
                {Object.entries(STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <select
              value={needFilter}
              onChange={(e) => setNeedFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 appearance-none bg-white"
            >
              <option value="">Tous les besoins</option>
              <option value="SECURITY">Sécurité</option>
              <option value="DISPLAY">Affichage</option>
              <option value="MIXED">Mixte</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
          </div>
        ) : prospects.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            Aucun prospect trouvé
          </div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Société</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Décisionnaire</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Téléphone</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Besoin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commercial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {prospects.map((prospect) => (
                <tr
                  key={prospect.id}
                  onClick={() => navigate(`/prospects/${prospect.id}`)}
                  className="hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{prospect.companyName}</div>
                    <div className="text-sm text-gray-500">{prospect.city}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {prospect.decisionMakerName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prospect.decisionMakerMobile}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {prospect.need && (
                      <span className="inline-flex items-center gap-1 text-sm">
                        {prospect.need === 'SECURITY' && <><Shield className="h-4 w-4 text-blue-600" /> Sécurité</>}
                        {prospect.need === 'DISPLAY' && <><Monitor className="h-4 w-4 text-purple-600" /> Affichage</>}
                        {prospect.need === 'MIXED' && <><Shield className="h-4 w-4 text-blue-600" /><Monitor className="h-4 w-4 text-purple-600" /> Mixte</>}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[prospect.status] || 'bg-gray-100 text-gray-800'}`}>
                      {STATUS_LABELS[prospect.status] || prospect.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {prospect.commercial ? `${prospect.commercial.firstName} ${prospect.commercial.lastName}` : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatDate(prospect.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
