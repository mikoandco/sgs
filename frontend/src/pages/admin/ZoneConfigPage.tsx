import { useState, useEffect } from 'react';
import { Map, Plus, Edit2, X } from 'lucide-react';
import api from '../../services/api';
import type { Zone, User } from '../../types';

const DAYS = [
  { key: 'MONDAY', label: 'Lundi' },
  { key: 'TUESDAY', label: 'Mardi' },
  { key: 'WEDNESDAY', label: 'Mercredi' },
  { key: 'THURSDAY', label: 'Jeudi' },
  { key: 'FRIDAY', label: 'Vendredi' },
];

export default function ZoneConfigPage() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [commercials, setCommercials] = useState<User[]>([]);
  const [assignments, setAssignments] = useState<Record<string, Record<string, string>>>({});
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<Zone | null>(null);
  const [formData, setFormData] = useState({ name: '', departments: '', postalCodes: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [zonesRes, usersRes] = await Promise.all([api.getAdminZones(), api.getUsers({ role: 'COMMERCIAL' })]);

      const zonesData = Array.isArray(zonesRes.data) ? zonesRes.data : [];
      setZones(zonesData);

      const usersData = usersRes.data as { users?: User[] } | User[];
      if (Array.isArray(usersData)) {
        setCommercials(usersData);
      } else if (usersData?.users) {
        setCommercials(usersData.users);
      }

      // Build assignments map from zone data
      const assignmentMap: Record<string, Record<string, string>> = {};
      zonesData.forEach((zone: Zone & { assignments?: Array<{ user?: { id: string }; dayOfWeek: string }> }) => {
        zone.assignments?.forEach(a => {
          if (a.user?.id) {
            if (!assignmentMap[a.user.id]) assignmentMap[a.user.id] = {};
            assignmentMap[a.user.id][a.dayOfWeek] = zone.id;
          }
        });
      });
      setAssignments(assignmentMap);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const data = { name: formData.name, departments: formData.departments.split(',').map(d => d.trim()).filter(Boolean), postalCodes: formData.postalCodes ? formData.postalCodes.split(',').map(p => p.trim()).filter(Boolean) : undefined };
      if (editingZone) await api.updateZone(editingZone.id, data);
      else await api.createZone(data);
      setShowModal(false); setEditingZone(null); resetForm(); loadData();
    } catch (err) { console.error(err); }
  };

  const handleAssignment = async (userId: string, dayOfWeek: string, zoneId: string) => {
    try {
      await api.createZoneAssignment({ userId, zoneId, dayOfWeek });
      setAssignments(prev => ({ ...prev, [userId]: { ...prev[userId], [dayOfWeek]: zoneId } }));
    } catch (err) { console.error(err); }
  };

  const resetForm = () => setFormData({ name: '', departments: '', postalCodes: '' });

  const openEdit = (zone: Zone) => {
    setEditingZone(zone);
    setFormData({ name: zone.name, departments: zone.departments.join(', '), postalCodes: zone.postalCodes?.join(', ') || '' });
    setShowModal(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Map className="h-7 w-7" /> Configuration des zones</h1>
        <button onClick={() => { resetForm(); setEditingZone(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="h-5 w-5" /> Nouvelle zone
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="font-semibold mb-4">Zones géographiques</h2>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : (
            <div className="space-y-3">
              {zones.map(zone => (
                <div key={zone.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="font-medium">{zone.name}</h3>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {zone.departments.map(d => <span key={d} className="px-2 py-0.5 bg-primary-100 text-primary-700 text-xs rounded">{d}</span>)}
                    </div>
                    {zone.postalCodes && zone.postalCodes.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">{zone.postalCodes.length} codes postaux</p>
                    )}
                  </div>
                  <button onClick={() => openEdit(zone)} className="p-2 hover:bg-gray-200 rounded"><Edit2 className="h-4 w-4" /></button>
                </div>
              ))}
              {zones.length === 0 && <p className="text-center text-gray-500 py-8">Aucune zone configurée</p>}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="font-semibold mb-4">Affectation des commerciaux</h2>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="py-2 text-left">Commercial</th>
                    {DAYS.map(day => <th key={day.key} className="py-2 text-center px-2">{day.label.substring(0, 3)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {commercials.map(commercial => (
                    <tr key={commercial.id} className="border-b">
                      <td className="py-2 font-medium">{commercial.firstName} {commercial.lastName}</td>
                      {DAYS.map(day => (
                        <td key={day.key} className="py-2 px-1">
                          <select
                            value={assignments[commercial.id]?.[day.key] || ''}
                            onChange={(e) => handleAssignment(commercial.id, day.key, e.target.value)}
                            className="w-full px-1 py-1 border rounded text-xs"
                          >
                            <option value="">—</option>
                            {zones.map(zone => <option key={zone.id} value={zone.id}>{zone.name}</option>)}
                          </select>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {commercials.length === 0 && <p className="text-center text-gray-500 py-8">Aucun commercial</p>}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingZone ? 'Modifier la zone' : 'Nouvelle zone'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nom de la zone</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Paris / Hauts-de-Seine" /></div>
              <div><label className="block text-sm font-medium mb-1">Départements (séparés par virgule)</label><input type="text" value={formData.departments} onChange={(e) => setFormData({ ...formData, departments: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="75, 92" /></div>
              <div><label className="block text-sm font-medium mb-1">Codes postaux spécifiques (optionnel)</label><input type="text" value={formData.postalCodes} onChange={(e) => setFormData({ ...formData, postalCodes: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="75001, 75002" /></div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
