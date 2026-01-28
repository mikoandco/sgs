import React, { useState, useEffect } from 'react';
import {
  FileText,
  Search,
  Plus,
  Calendar,
  AlertTriangle,
  RefreshCw,
  Building,
  ChevronDown,
  X,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { api } from '../services/api';

interface Contract {
  id: string;
  prospectId: string;
  type: string;
  status: string;
  startDate: string;
  endDate: string;
  monthlyFee: number | null;
  totalAmount: number | null;
  createdAt: string;
  prospect: {
    id: string;
    companyName: string;
    decisionMakerName: string;
    decisionMakerMobile: string;
    commercial?: {
      id: string;
      firstName: string;
      lastName: string;
    };
  };
}

interface ContractStats {
  totalActive: number;
  totalMRR: number;
  expiringThisMonth: number;
  byType: Array<{ type: string; _count: number; _sum: { monthlyFee: number } }>;
}

export const Contracts: React.FC = () => {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [expiringContracts, setExpiringContracts] = useState<Contract[]>([]);
  const [stats, setStats] = useState<ContractStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ACTIVE');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [newEndDate, setNewEndDate] = useState('');

  useEffect(() => {
    fetchContracts();
    fetchExpiringContracts();
    fetchStats();
  }, [filter, typeFilter]);

  const fetchContracts = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filter !== 'all') params.status = filter;
      if (typeFilter !== 'all') params.type = typeFilter;

      const res = await api.getContracts(params);
      setContracts((res as any).data || []);
    } catch (error) {
      console.error('Error fetching contracts:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExpiringContracts = async () => {
    try {
      const res = await api.getExpiringContracts(30);
      setExpiringContracts((res as any).data || []);
    } catch (error) {
      console.error('Error fetching expiring contracts:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.getContractStats();
      setStats((res as any).data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const handleRenewContract = async () => {
    if (!selectedContract || !newEndDate) return;

    try {
      await api.renewContract(selectedContract.id, { newEndDate });
      setShowRenewModal(false);
      setSelectedContract(null);
      setNewEndDate('');
      fetchContracts();
      fetchExpiringContracts();
      fetchStats();
    } catch (error) {
      console.error('Error renewing contract:', error);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium flex items-center gap-1"><CheckCircle className="w-3 h-3" /> Actif</span>;
      case 'EXPIRED':
        return <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs font-medium flex items-center gap-1"><XCircle className="w-3 h-3" /> Expiré</span>;
      case 'PENDING':
        return <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs font-medium flex items-center gap-1"><Clock className="w-3 h-3" /> En attente</span>;
      case 'CANCELLED':
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">Annulé</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded-full text-xs font-medium">{status}</span>;
    }
  };

  const getTypeBadge = (type: string) => {
    switch (type) {
      case 'maintenance':
        return <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">Maintenance</span>;
      case 'telesurveillance':
        return <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">Télésurveillance</span>;
      case 'extended_warranty':
        return <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded text-xs">Garantie étendue</span>;
      default:
        return <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">{type}</span>;
    }
  };

  const getDaysUntilExpiry = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const filteredContracts = contracts.filter(contract => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      contract.prospect.companyName.toLowerCase().includes(searchLower) ||
      contract.prospect.decisionMakerName.toLowerCase().includes(searchLower) ||
      contract.type.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des Contrats</h1>
          <p className="text-gray-600">Maintenance, télésurveillance et garanties</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau contrat
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Contrats actifs</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalActive}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">MRR</p>
                <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.totalMRR)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Expirent ce mois</p>
                <p className="text-2xl font-bold text-gray-900">{stats.expiringThisMonth}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border p-6">
            <div>
              <p className="text-sm text-gray-500 mb-2">Par type</p>
              <div className="space-y-1">
                {stats.byType.map(item => (
                  <div key={item.type} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{item.type}</span>
                    <span className="font-medium">{item._count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expiring Soon Alert */}
      {expiringContracts.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
            <div>
              <h3 className="font-medium text-orange-900">Contrats expirant bientôt</h3>
              <p className="text-sm text-orange-700 mt-1">
                {expiringContracts.length} contrat(s) expire(nt) dans les 30 prochains jours
              </p>
              <div className="mt-3 space-y-2">
                {expiringContracts.slice(0, 3).map(contract => {
                  const days = getDaysUntilExpiry(contract.endDate);
                  return (
                    <div key={contract.id} className="flex items-center justify-between bg-white p-2 rounded">
                      <span className="text-sm font-medium">{contract.prospect.companyName}</span>
                      <span className={`text-sm ${days <= 7 ? 'text-red-600' : 'text-orange-600'}`}>
                        {days <= 0 ? 'Expiré' : `${days} jours`}
                      </span>
                      <button
                        onClick={() => {
                          setSelectedContract(contract);
                          setShowRenewModal(true);
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800"
                      >
                        Renouveler
                      </button>
                    </div>
                  );
                })}
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
              placeholder="Rechercher un contrat..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="px-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="ACTIVE">Actifs</option>
              <option value="PENDING">En attente</option>
              <option value="EXPIRED">Expirés</option>
              <option value="CANCELLED">Annulés</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-4 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">Tous les types</option>
              <option value="maintenance">Maintenance</option>
              <option value="telesurveillance">Télésurveillance</option>
              <option value="extended_warranty">Garantie étendue</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredContracts.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun contrat trouvé</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Début</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mensualité</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredContracts.map((contract) => {
                const daysUntilExpiry = getDaysUntilExpiry(contract.endDate);
                const isExpiringSoon = contract.status === 'ACTIVE' && daysUntilExpiry <= 30 && daysUntilExpiry > 0;

                return (
                  <tr key={contract.id} className={`hover:bg-gray-50 ${isExpiringSoon ? 'bg-orange-50' : ''}`}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                          <Building className="w-5 h-5 text-gray-500" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{contract.prospect.companyName}</p>
                          <p className="text-sm text-gray-500">{contract.prospect.decisionMakerName}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {getTypeBadge(contract.type)}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(contract.status)}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">{formatDate(contract.startDate)}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">{formatDate(contract.endDate)}</span>
                        {isExpiringSoon && (
                          <span className="px-1.5 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
                            {daysUntilExpiry}j
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {contract.monthlyFee ? (
                        <span className="font-medium text-gray-900">{formatCurrency(contract.monthlyFee)}/mois</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {contract.status === 'ACTIVE' && (
                          <button
                            onClick={() => {
                              setSelectedContract(contract);
                              setShowRenewModal(true);
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Renouveler"
                          >
                            <RefreshCw className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Renew Modal */}
      {showRenewModal && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Renouveler le contrat</h2>
              <button
                onClick={() => {
                  setShowRenewModal(false);
                  setSelectedContract(null);
                  setNewEndDate('');
                }}
                className="p-1 hover:bg-gray-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-medium text-gray-900">{selectedContract.prospect.companyName}</p>
                <p className="text-sm text-gray-600">{getTypeBadge(selectedContract.type)}</p>
                <p className="text-sm text-gray-500 mt-2">
                  Expire le {formatDate(selectedContract.endDate)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nouvelle date de fin
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="date"
                    value={newEndDate}
                    onChange={(e) => setNewEndDate(e.target.value)}
                    min={selectedContract.endDate.split('T')[0]}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleRenewContract}
                  disabled={!newEndDate}
                  className="flex-1 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Renouveler
                </button>
                <button
                  onClick={() => {
                    setShowRenewModal(false);
                    setSelectedContract(null);
                    setNewEndDate('');
                  }}
                  className="flex-1 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Contracts;
