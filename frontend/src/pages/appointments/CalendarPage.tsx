import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import api from '../../services/api';
import type { Appointment, Prospect, User } from '../../types';
import { useAuthStore } from '../../store/authStore';

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi'];
const HOURS = Array.from({ length: 22 }, (_, i) => 8 + i * 0.5);

export default function CalendarPage() {
  const { user } = useAuthStore();
  const [searchParams] = useSearchParams();
  const [weekStart, setWeekStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay() + 1);
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [commercials, setCommercials] = useState<User[]>([]);
  const [selectedCommercial, setSelectedCommercial] = useState(user?.id || '');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalData, setModalData] = useState({ date: '', time: '', prospectId: '', duration: 90, notes: '' });
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [prospectSearch, setProspectSearch] = useState('');

  useEffect(() => {
    loadData();
    if (searchParams.get('prospectId')) {
      setModalData(prev => ({ ...prev, prospectId: searchParams.get('prospectId') || '' }));
      setShowModal(true);
    }
  }, [weekStart, selectedCommercial]);

  const loadData = async () => {
    try {
      setLoading(true);
      const endDate = new Date(weekStart);
      endDate.setDate(endDate.getDate() + 5);

      const [aptsRes, usersRes] = await Promise.all([
        api.getAppointments({
          commercialId: selectedCommercial,
          startDate: weekStart.toISOString().split('T')[0],
          endDate: endDate.toISOString().split('T')[0],
        }),
        api.getUsers({ role: 'COMMERCIAL' }),
      ]);
      setAppointments(aptsRes.data || []);
      setCommercials(usersRes.data || []);
    } catch (err) {
      console.error('Error loading calendar:', err);
    } finally {
      setLoading(false);
    }
  };

  const searchProspects = async (q: string) => {
    if (q.length < 2) return;
    try {
      const res = await api.getProspects({ search: q });
      setProspects(res.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const navigateWeek = (dir: number) => {
    setWeekStart(prev => {
      const d = new Date(prev);
      d.setDate(d.getDate() + dir * 7);
      return d;
    });
  };

  const getDateForDay = (dayIndex: number) => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + dayIndex);
    return d;
  };

  const formatWeekRange = () => {
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 4);
    return `Semaine du ${weekStart.getDate()} ${weekStart.toLocaleDateString('fr-FR', { month: 'long' })} ${weekStart.getFullYear()}`;
  };

  const getAppointmentsForSlot = (dayIndex: number, hour: number) => {
    const date = getDateForDay(dayIndex);
    return appointments.filter(apt => {
      const aptDate = new Date(apt.scheduledAt);
      return aptDate.getDate() === date.getDate() &&
        aptDate.getMonth() === date.getMonth() &&
        aptDate.getHours() === Math.floor(hour) &&
        (hour % 1 === 0 ? aptDate.getMinutes() < 30 : aptDate.getMinutes() >= 30);
    });
  };

  const handleSlotClick = (dayIndex: number, hour: number) => {
    const date = getDateForDay(dayIndex);
    const h = Math.floor(hour);
    const m = hour % 1 === 0 ? '00' : '30';
    setModalData({
      date: date.toISOString().split('T')[0],
      time: `${h.toString().padStart(2, '0')}:${m}`,
      prospectId: '',
      duration: 90,
      notes: '',
    });
    setShowModal(true);
  };

  const handleCreateAppointment = async () => {
    try {
      await api.createAppointment({
        prospectId: modalData.prospectId,
        commercialId: selectedCommercial,
        scheduledAt: `${modalData.date}T${modalData.time}:00`,
        duration: modalData.duration,
        notes: modalData.notes,
      });
      setShowModal(false);
      loadData();
    } catch (err) {
      console.error('Error creating appointment:', err);
    }
  };

  const STATUS_COLORS: Record<string, string> = {
    SCHEDULED: 'bg-blue-500', CONFIRMED: 'bg-green-500', COMPLETED: 'bg-gray-400', CANCELLED: 'bg-red-500 line-through',
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Calendrier</h1>
        {(user?.role === 'DIRECTION' || user?.role === 'ADMIN') && (
          <select value={selectedCommercial} onChange={(e) => setSelectedCommercial(e.target.value)} className="px-3 py-2 border rounded-lg">
            {commercials.map(c => (
              <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
            ))}
          </select>
        )}
      </div>

      <div className="flex items-center justify-between bg-white rounded-lg shadow-sm border p-4">
        <button onClick={() => navigateWeek(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h2 className="text-lg font-semibold">{formatWeekRange()}</h2>
        <button onClick={() => navigateWeek(1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="w-16 p-2 text-xs text-gray-500"></th>
                {DAYS.map((day, i) => {
                  const date = getDateForDay(i);
                  const isToday = date.toDateString() === new Date().toDateString();
                  return (
                    <th key={day} className={`p-3 text-center ${isToday ? 'bg-primary-50' : ''}`}>
                      <div className="font-medium">{day}</div>
                      <div className={`text-sm ${isToday ? 'text-primary-600 font-bold' : 'text-gray-500'}`}>
                        {date.getDate()}/{date.getMonth() + 1}
                      </div>
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody>
              {HOURS.map((hour) => (
                <tr key={hour} className="border-b">
                  <td className="p-1 text-xs text-gray-400 text-right pr-2 w-16">
                    {hour % 1 === 0 ? `${hour}:00` : ''}
                  </td>
                  {DAYS.map((_, dayIndex) => {
                    const slotApts = getAppointmentsForSlot(dayIndex, hour);
                    return (
                      <td key={dayIndex} className="p-0.5 h-8 border-l hover:bg-gray-50 cursor-pointer relative" onClick={() => handleSlotClick(dayIndex, hour)}>
                        {slotApts.map(apt => (
                          <Link key={apt.id} to={`/prospects/${apt.prospect?.id}`} onClick={(e) => e.stopPropagation()}
                            className={`absolute inset-x-0.5 ${STATUS_COLORS[apt.status] || 'bg-blue-500'} text-white text-xs p-1 rounded truncate`}
                            style={{ height: `${(apt.duration / 30) * 32}px`, zIndex: 10 }}>
                            {apt.prospect?.companyName}
                          </Link>
                        ))}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Planifier un RDV</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prospect</label>
                <input type="text" placeholder="Rechercher un prospect..." value={prospectSearch}
                  onChange={(e) => { setProspectSearch(e.target.value); searchProspects(e.target.value); }}
                  className="w-full px-3 py-2 border rounded-lg" />
                {prospects.length > 0 && (
                  <ul className="mt-1 border rounded-lg max-h-40 overflow-y-auto">
                    {prospects.map(p => (
                      <li key={p.id} onClick={() => { setModalData(prev => ({ ...prev, prospectId: p.id })); setProspects([]); setProspectSearch(p.companyName); }}
                        className="px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm">
                        {p.companyName} - {p.city}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                  <input type="date" value={modalData.date} onChange={(e) => setModalData(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heure</label>
                  <input type="time" value={modalData.time} onChange={(e) => setModalData(prev => ({ ...prev, time: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                <select value={modalData.duration} onChange={(e) => setModalData(prev => ({ ...prev, duration: Number(e.target.value) }))}
                  className="w-full px-3 py-2 border rounded-lg">
                  <option value={30}>30 min</option>
                  <option value={60}>1h</option>
                  <option value={90}>1h30</option>
                  <option value={120}>2h</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={modalData.notes} onChange={(e) => setModalData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border rounded-lg" rows={3} />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={handleCreateAppointment} disabled={!modalData.prospectId} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Plus className="h-5 w-5" /> Créer le RDV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
