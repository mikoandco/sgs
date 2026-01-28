import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  Search,
  Filter,
  Check,
  X,
  Clock,
  DollarSign,
  FileText,
  Building,
  ChevronDown
} from 'lucide-react';
import { api } from '../services/api';

interface Payment {
  id: string;
  quoteId: string;
  amount: number;
  type: string;
  mode: string;
  status: string;
  reference: string | null;
  receivedAt: string | null;
  createdAt: string;
  quote: {
    quoteNumber: string;
    prospect: {
      id: string;
      companyName: string;
      decisionMakerName: string;
    };
    commercial: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface PaymentStats {
  pending: { amount: number; count: number };
  received: { total: number; monthly: number; yearly: number };
  byStatus: Array<{ status: string; _sum: { amount: number }; _count: number }>;
  byMode: Array<{ mode: string; _sum: { amount: number }; _count: number }>;
}

export const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [stats, setStats] = useState<PaymentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [showValidateModal, setShowValidateModal] = useState(false);
  const [validationComment, setValidationComment] = useState('');

  useEffect(() => {
    fetchPayments();
    fetchStats();
  }, [filter]);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;

      const res = await api.getPayments(params);
      setPayments((res as any).data || []);
    } catch (error) {
      console.error('Error fetching payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getPaymentStats();
      setStats((res as any).data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleMarkReceived = async (payment: Payment) => {
    try {
      await api.updatePayment(payment.id, { status: 'RECEIVED', receivedAt: new Date().toISOString() });
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error updating payment:', error);
    }
  };

  const handleValidate = async (approved: boolean) => {
    if (!selectedPayment) return;

    try {
      await api.validatePayment(selectedPayment.id, {
        approved,
        comment: validationComment
      });
      setShowValidateModal(false);
      setSelectedPayment(null);
      setValidationComment('');
      fetchPayments();
      fetchStats();
    } catch (error) {
      console.error('Error validating payment:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium">En attente</span>;
      case 'RECEIVED':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-medium">Reçu</span>;
      case 'VALIDATED':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">Validé</span>;
      case 'REJECTED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium">Rejeté</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return <span className="text-purple-600">Acompte</span>;
      case 'balance':
        return <span className="text-blue-600">Solde</span>;
      case 'full':
        return <span className="text-green-600">Total</span>;
      default:
        return <span className="text-gray-600">{type}</span>;
    }
  };

  const filteredPayments = payments.filter(payment => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      payment.quote.quoteNumber.toLowerCase().includes(searchLower) ||
      payment.quote.prospect.companyName.toLowerCase().includes(searchLower) ||
      payment.quote.prospect.decisionMakerName.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-600">Suivi et validation des paiements</p>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">En attente</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.pending.amount)}</p>
                <p className="text-xs text-gray-400">{stats.pending.count} paiements</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Reçu ce mois</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.received.monthly)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total annuel</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.received.yearly)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <Check className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Total reçu</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.received.total)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un paiement..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="RECEIVED">Reçus</option>
              <option value="VALIDATED">Validés</option>
              <option value="REJECTED">Rejetés</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun paiement trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Devis</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Montant</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredPayments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Building className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{payment.quote.prospect.companyName}</p>
                        <p className="text-sm text-gray-500">{payment.quote.prospect.decisionMakerName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <span className="text-sm font-mono">{payment.quote.quoteNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {getTypeBadge(payment.type)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-semibold text-gray-900">{formatCurrency(payment.amount)}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-600 capitalize">{payment.mode}</span>
                  </td>
                  <td className="px-6 py-4">
                    {getStatusBadge(payment.status)}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-sm text-gray-500">
                      {new Date(payment.createdAt).toLocaleDateString('fr-FR')}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      {payment.status === 'PENDING' && (
                        <button
                          onClick={() => handleMarkReceived(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Marquer comme reçu"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {payment.status === 'RECEIVED' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedPayment(payment);
                              setShowValidateModal(true);
                            }}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg"
                            title="Valider"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Validation Modal */}
      {showValidateModal && selectedPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Valider le paiement</h2>
            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-500">Montant</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(selectedPayment.amount)}</p>
                <p className="text-sm text-gray-600 mt-2">
                  {selectedPayment.quote.prospect.companyName} - {selectedPayment.quote.quoteNumber}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commentaire (optionnel)
                </label>
                <textarea
                  value={validationComment}
                  onChange={(e) => setValidationComment(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Ajouter un commentaire..."
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleValidate(true)}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Valider
                </button>
                <button
                  onClick={() => handleValidate(false)}
                  className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center justify-center gap-2"
                >
                  <X className="w-4 h-4" />
                  Rejeter
                </button>
              </div>

              <button
                onClick={() => {
                  setShowValidateModal(false);
                  setSelectedPayment(null);
                  setValidationComment('');
                }}
                className="w-full py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Payments;
