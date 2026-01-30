import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Plus, Shield, Monitor, Filter, LayoutGrid, List, Download } from 'lucide-react';
import api from '../../services/api';
import type { Prospect, User } from '../../types';
import { useAuthStore } from '../../store/authStore';
import BatchActions from '../../components/BatchActions';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [needFilter, setNeedFilter] = useState('');
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    loadProspects();
    loadUsers();
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

  const loadUsers = async () => {
    try {
      const res = await api.getUsers();
      setUsers((res as any).users || []);
    } catch (err) {
      console.error('Error loading users:', err);
    }
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));
  };

  const canCreate = user?.role === 'SDR' || user?.role === 'ADMIN';
  const canBatchEdit = user?.role === 'ADMIN' || user?.role === 'DIRECTION';

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === prospects.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(prospects.map(p => p.id));
    }
  };

  const handleExport = () => {
    api.exportProspects({
      status: statusFilter,
      need: needFilter,
      search: search
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-900">Prospects & Clients</h1>
          <span className="px-2.5 py-0.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
            {prospects.length}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Exporter
          </button>
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
            <div className="flex border border-gray-300 rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <List className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode('card')}
                className={`p-2 ${viewMode === 'card' ? 'bg-primary-50 text-primary-600' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
              >
                <LayoutGrid className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {viewMode === 'list' ? (
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
                  {canBatchEdit && (
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedIds.length === prospects.length && prospects.length > 0}
                        onChange={toggleSelectAll}
                        className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </th>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Société</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Décisionnaire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Téléphone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Besoin</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">Commercial</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {prospects.map((prospect) => (
                  <tr
                    key={prospect.id}
                    onClick={() => navigate(`/prospects/${prospect.id}`)}
                    className={`hover:bg-gray-50 cursor-pointer ${selectedIds.includes(prospect.id) ? 'bg-primary-50' : ''}`}
                  >
                    {canBatchEdit && (
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.includes(prospect.id)}
                          onChange={() => {}}
                          onClick={(e) => toggleSelect(prospect.id, e)}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                      </td>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">{prospect.companyName}</div>
                      <div className="text-sm text-gray-500">{prospect.city}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {prospect.decisionMakerName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden md:table-cell">
                      {prospect.decisionMakerMobile}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap hidden lg:table-cell">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden xl:table-cell">
                      {prospect.commercial ? `${prospect.commercial.firstName} ${prospect.commercial.lastName}` : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                      {formatDate(prospect.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
            </div>
          ) : prospects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-gray-500">
              Aucun prospect trouvé
            </div>
          ) : (
            prospects.map((prospect) => (
              <div
                key={prospect.id}
                onClick={() => navigate(`/prospects/${prospect.id}`)}
                className={`bg-white rounded-xl border p-4 hover:shadow-md cursor-pointer transition-shadow ${
                  selectedIds.includes(prospect.id) ? 'ring-2 ring-primary-500' : ''
                }`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{prospect.companyName}</h3>
                    <p className="text-sm text-gray-500">{prospect.city}</p>
                  </div>
                  {canBatchEdit && (
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(prospect.id)}
                      onChange={() => {}}
                      onClick={(e) => toggleSelect(prospect.id, e)}
                      className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                    />
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Contact:</span>
                    <span className="text-gray-900">{prospect.decisionMakerName}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500">Tél:</span>
                    <span className="text-gray-900">{prospect.decisionMakerMobile}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[prospect.status] || 'bg-gray-100 text-gray-800'}`}>
                    {STATUS_LABELS[prospect.status] || prospect.status}
                  </span>
                  {prospect.need && (
                    <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                      {prospect.need === 'SECURITY' && <Shield className="h-4 w-4 text-blue-600" />}
                      {prospect.need === 'DISPLAY' && <Monitor className="h-4 w-4 text-purple-600" />}
                      {prospect.need === 'MIXED' && (
                        <>
                          <Shield className="h-4 w-4 text-blue-600" />
                          <Monitor className="h-4 w-4 text-purple-600" />
                        </>
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Batch Actions Bar */}
      {selectedIds.length > 0 && (
        <BatchActions
          selectedIds={selectedIds}
          onClear={() => setSelectedIds([])}
          onSuccess={loadProspects}
          users={users}
        />
      )}
    </div>
  );
}
