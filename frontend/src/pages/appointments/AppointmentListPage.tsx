import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, MapPin, Phone, User, List, Grid, Navigation } from 'lucide-react';
import api from '../../services/api';
import type { Appointment } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  SCHEDULED: 'Planifié', CONFIRMED: 'Confirmé', IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé', CANCELLED: 'Annulé', NO_SHOW: 'Absent', RESCHEDULED: 'Reporté',
};

const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800', CONFIRMED: 'bg-green-100 text-green-800',
  IN_PROGRESS: 'bg-yellow-100 text-yellow-800', COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-red-100 text-red-800', NO_SHOW: 'bg-red-100 text-red-800', RESCHEDULED: 'bg-yellow-100 text-yellow-800',
};

export default function AppointmentListPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [statusFilter, setStatusFilter] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadAppointments();
  }, [statusFilter, startDate, endDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (statusFilter) params.status = statusFilter;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      const res = await api.getAppointments(params);
      setAppointments(res.data || []);
    } catch (err) {
      console.error('Error loading appointments:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));

  const openMaps = (apt: Appointment) => {
    const { prospect } = apt;
    if (prospect?.lat && prospect?.lng) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${prospect.lat},${prospect.lng}`, '_blank');
    } else if (prospect?.address) {
      window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${prospect.address}, ${prospect.postalCode} ${prospect.city}`)}`, '_blank');
    }
  };

  const isToday = (date: string) => {
    const d = new Date(date);
    const today = new Date();
    return d.toDateString() === today.toDateString();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Rendez-vous</h1>
        <div className="flex gap-2">
          <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}>
            <List className="h-5 w-5" />
          </button>
          <button onClick={() => setViewMode('card')} className={`p-2 rounded-lg ${viewMode === 'card' ? 'bg-primary-100 text-primary-700' : 'hover:bg-gray-100'}`}>
            <Grid className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Du</label>
            <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Au</label>
            <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">Tous</option>
              {Object.entries(STATUS_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : appointments.length === 0 ? (
        <div className="text-center py-12 text-gray-500 bg-white rounded-lg border">Aucun rendez-vous trouvé</div>
      ) : viewMode === 'list' ? (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date/Heure</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Société</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Adresse</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commercial</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((apt) => (
                <tr key={apt.id} className={isToday(apt.scheduledAt) ? 'bg-yellow-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{formatDate(apt.scheduledAt)}</div>
                    <div className="text-xs text-gray-500">{apt.duration} min</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Link to={`/prospects/${apt.prospect?.id}`} className="text-primary-600 hover:underline font-medium">
                      {apt.prospect?.companyName}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-gray-500">{apt.prospect?.address}</div>
                    <div className="text-sm text-gray-500">{apt.prospect?.postalCode} {apt.prospect?.city}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm">{apt.prospect?.decisionMakerName}</div>
                    <a href={`tel:${apt.prospect?.decisionMakerMobile}`} className="text-sm text-primary-600">{apt.prospect?.decisionMakerMobile}</a>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {apt.commercial?.firstName} {apt.commercial?.lastName}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[apt.status] || 'bg-gray-100'}`}>
                      {STATUS_LABELS[apt.status] || apt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button onClick={() => openMaps(apt)} className="flex items-center gap-1 text-sm text-green-600 hover:text-green-800">
                      <Navigation className="h-4 w-4" /> Y aller
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {appointments.map((apt) => (
            <div key={apt.id} className={`bg-white rounded-lg shadow-sm border p-4 ${isToday(apt.scheduledAt) ? 'ring-2 ring-yellow-400' : ''}`}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Calendar className="h-4 w-4" />
                    {formatDate(apt.scheduledAt)}
                  </div>
                  {isToday(apt.scheduledAt) && <span className="text-xs text-yellow-600 font-medium">Aujourd'hui</span>}
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[apt.status]}`}>
                  {STATUS_LABELS[apt.status]}
                </span>
              </div>
              <Link to={`/prospects/${apt.prospect?.id}`} className="font-semibold text-gray-900 hover:text-primary-600">
                {apt.prospect?.companyName}
              </Link>
              <div className="mt-2 space-y-1 text-sm text-gray-500">
                <div className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {apt.prospect?.address}, {apt.prospect?.city}</div>
                <div className="flex items-center gap-2"><User className="h-4 w-4" /> {apt.prospect?.decisionMakerName}</div>
                <div className="flex items-center gap-2"><Phone className="h-4 w-4" /> {apt.prospect?.decisionMakerMobile}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openMaps(apt)} className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                  <Navigation className="h-4 w-4" /> Y aller
                </button>
                <Link to={`/prospects/${apt.prospect?.id}`} className="flex-1 flex items-center justify-center px-3 py-2 bg-gray-50 text-gray-700 rounded-lg hover:bg-gray-100">
                  Voir fiche
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
