import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Clock, AlertTriangle, ChevronDown } from 'lucide-react';
import api from '../../services/api';
import type { Alert } from '../../types';
import { useAuthStore } from '../../store/authStore';

const PRIORITY_LABELS: Record<string, string> = { HIGH: 'Haute', MEDIUM: 'Moyenne', LOW: 'Basse' };
const PRIORITY_COLORS: Record<string, string> = { HIGH: 'border-red-500 bg-red-50', MEDIUM: 'border-yellow-500 bg-yellow-50', LOW: 'border-gray-300 bg-gray-50' };
const STATUS_LABELS: Record<string, string> = { PENDING: 'En attente', IN_PROGRESS: 'En cours', DONE: 'Traité', POSTPONED: 'Reporté', ESCALATED: 'Escaladé' };

export default function AlertListPage() {
  const { user } = useAuthStore();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'mine' | 'all'>('mine');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  useEffect(() => {
    loadAlerts();
  }, [filter, statusFilter, priorityFilter]);

  const loadAlerts = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filter === 'mine' && user?.id) params.assigneeId = user.id;
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      const res = await api.getAlerts(params);
      setAlerts(res.data || []);
    } catch (err) {
      console.error('Error loading alerts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    try {
      await api.updateAlert(alertId, { status: newStatus });
      loadAlerts();
    } catch (err) {
      console.error('Error updating alert:', err);
    }
  };

  const isOverdue = (dueDate: string) => new Date(dueDate) < new Date();

  const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));

  const canSeeAll = user?.role === 'ADMIN' || user?.role === 'DIRECTION';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="h-7 w-7" /> Alertes & Relances
        </h1>
        {canSeeAll && (
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setFilter('mine')} className={`px-3 py-1.5 rounded-md text-sm ${filter === 'mine' ? 'bg-white shadow' : ''}`}>Mes alertes</button>
            <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-md text-sm ${filter === 'all' ? 'bg-white shadow' : ''}`}>Toutes</button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex gap-4">
          <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">Toutes priorités</option>
            {Object.entries(PRIORITY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
            <option value="">Tous statuts</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : alerts.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center">
          <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
          <p className="text-gray-500">Aucune alerte en attente</p>
        </div>
      ) : (
        <div className="space-y-4">
          {alerts.map((alert) => (
            <div key={alert.id} className={`bg-white rounded-lg shadow-sm border-l-4 p-4 ${PRIORITY_COLORS[alert.priority] || 'border-gray-300'}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                      alert.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                      alert.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {PRIORITY_LABELS[alert.priority]}
                    </span>
                    <span className="text-xs text-gray-500">{alert.type}</span>
                  </div>
                  <h3 className="font-semibold text-gray-900">{alert.title}</h3>
                  {alert.message && <p className="text-sm text-gray-600 mt-1">{alert.message}</p>}
                  {alert.prospect && (
                    <Link to={`/prospects/${alert.prospect.id}`} className="text-sm text-primary-600 hover:underline mt-2 inline-block">
                      {alert.prospect.companyName}
                    </Link>
                  )}
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span className={`flex items-center gap-1 ${isOverdue(alert.dueDate) && alert.status === 'PENDING' ? 'text-red-600 font-medium' : ''}`}>
                      <Clock className="h-3 w-3" />
                      {isOverdue(alert.dueDate) && alert.status === 'PENDING' ? 'En retard - ' : ''}{formatDate(alert.dueDate)}
                    </span>
                    {alert.assignee && <span>Assigné à: {alert.assignee.firstName} {alert.assignee.lastName}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    alert.status === 'DONE' ? 'bg-green-100 text-green-800' :
                    alert.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    alert.status === 'POSTPONED' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {STATUS_LABELS[alert.status]}
                  </span>
                  {alert.status !== 'DONE' && (
                    <div className="relative group">
                      <button className="p-1 hover:bg-gray-100 rounded"><ChevronDown className="h-5 w-5" /></button>
                      <div className="absolute right-0 mt-1 w-40 bg-white rounded-lg shadow-lg border py-1 hidden group-hover:block z-10">
                        {alert.status === 'PENDING' && (
                          <button onClick={() => handleStatusChange(alert.id, 'IN_PROGRESS')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50">
                            Traiter
                          </button>
                        )}
                        <button onClick={() => handleStatusChange(alert.id, 'DONE')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-green-600">
                          Marquer fait
                        </button>
                        <button onClick={() => handleStatusChange(alert.id, 'POSTPONED')} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 text-yellow-600">
                          Reporter
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
