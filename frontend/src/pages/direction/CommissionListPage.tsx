import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, Clock, CheckCircle } from 'lucide-react';
import api from '../../services/api';
import type { Commission, User } from '../../types';
import { useAuthStore } from '../../store/authStore';

const TYPE_LABELS: Record<string, string> = { sale: 'Vente', referral_bonus: 'Bonus parrainage', performance_bonus: 'Bonus performance' };
const STATUS_LABELS: Record<string, string> = { PENDING: 'En attente', PARTIAL: 'Partiel', PAID: 'Payé' };
const STATUS_COLORS: Record<string, string> = { PENDING: 'bg-yellow-100 text-yellow-800', PARTIAL: 'bg-blue-100 text-blue-800', PAID: 'bg-green-100 text-green-800' };

export default function CommissionListPage() {
  const { user } = useAuthStore();
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [commercials, setCommercials] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCommercial, setSelectedCommercial] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());

  const isCommercial = user?.role === 'COMMERCIAL';
  const canManage = user?.role === 'DIRECTION' || user?.role === 'ADMIN';

  useEffect(() => {
    loadData();
  }, [selectedCommercial, statusFilter, month, year]);

  const loadData = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (isCommercial) params.commercialId = user!.id;
      else if (selectedCommercial) params.commercialId = selectedCommercial;
      if (statusFilter) params.status = statusFilter;

      const [commissionsRes, usersRes] = await Promise.all([
        api.getCommissions(params),
        canManage ? api.getUsers({ role: 'COMMERCIAL' }) : Promise.resolve({ data: [] }),
      ]);
      setCommissions(commissionsRes.data || []);
      setCommercials(usersRes.data || []);
    } catch (err) {
      console.error('Error loading commissions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkPaid = async (commissionId: string) => {
    try {
      await api.updateCommission(commissionId, { status: 'PAID', paidAmount: commissions.find(c => c.id === commissionId)?.amount });
      loadData();
    } catch (err) {
      console.error('Error updating commission:', err);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR').format(new Date(date));

  const totalEarned = commissions.reduce((sum, c) => sum + c.amount, 0);
  const totalPaid = commissions.filter(c => c.status === 'PAID').reduce((sum, c) => sum + c.amount, 0);
  const totalPending = commissions.filter(c => c.status === 'PENDING').reduce((sum, c) => sum + c.amount, 0);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <DollarSign className="h-7 w-7" /> {isCommercial ? 'Mes Commissions' : 'Gestion des Commissions'}
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg"><TrendingUp className="h-6 w-6 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total gagné</p>
              <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalEarned)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg"><CheckCircle className="h-6 w-6 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">Total versé</p>
              <p className="text-2xl font-bold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-yellow-100 rounded-lg"><Clock className="h-6 w-6 text-yellow-600" /></div>
            <div>
              <p className="text-sm text-gray-500">En attente</p>
              <p className="text-2xl font-bold text-yellow-600">{formatCurrency(totalPending)}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex flex-wrap gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Mois</label>
            <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>{new Date(2000, i).toLocaleDateString('fr-FR', { month: 'long' })}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Année</label>
            <select value={year} onChange={(e) => setYear(Number(e.target.value))} className="px-3 py-2 border rounded-lg">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          {canManage && (
            <div>
              <label className="block text-xs text-gray-500 mb-1">Commercial</label>
              <select value={selectedCommercial} onChange={(e) => setSelectedCommercial(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="">Tous</option>
                {commercials.map(c => <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block text-xs text-gray-500 mb-1">Statut</label>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
              <option value="">Tous</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : commissions.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">Aucune commission à afficher</div>
      ) : (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                {canManage && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commercial</th>}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Versé</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Statut</th>
                {canManage && <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {commissions.map((commission) => (
                <tr key={commission.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">{formatDate(commission.createdAt)}</td>
                  {canManage && <td className="px-6 py-4 whitespace-nowrap text-sm">{commission.commercial?.firstName} {commission.commercial?.lastName}</td>}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="px-2 py-1 text-xs bg-gray-100 rounded">{TYPE_LABELS[commission.type] || commission.type}</span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">{commission.description || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-right">{formatCurrency(commission.amount)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right">{formatCurrency(commission.paidAmount || 0)}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${STATUS_COLORS[commission.status]}`}>
                      {STATUS_LABELS[commission.status]}
                    </span>
                  </td>
                  {canManage && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      {commission.status !== 'PAID' && (
                        <button onClick={() => handleMarkPaid(commission.id)} className="text-sm text-green-600 hover:text-green-800">
                          Marquer payé
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
