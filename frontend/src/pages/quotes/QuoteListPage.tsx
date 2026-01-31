import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  Search,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Filter,
  Eye,
} from 'lucide-react';
import api from '../../services/api';
import type { Quote, QuoteStatus, User } from '../../types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(value);

const formatDate = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

const STATUS_LABELS: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé',
  SIGNED: 'Signé',
  VALIDATED: 'Validé',
  REFUSED: 'Refusé',
  EXPIRED: 'Expiré',
};

const STATUS_COLORS: Record<QuoteStatus, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SENT: 'bg-blue-100 text-blue-700',
  SIGNED: 'bg-green-100 text-green-700',
  VALIDATED: 'bg-green-100 text-green-700',
  REFUSED: 'bg-red-100 text-red-700',
  EXPIRED: 'bg-yellow-100 text-yellow-700',
};

const ALL_STATUSES: QuoteStatus[] = ['DRAFT', 'SENT', 'SIGNED', 'VALIDATED', 'REFUSED', 'EXPIRED'];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuoteListPage() {
  const navigate = useNavigate();

  // Data
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [commercials, setCommercials] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [commercialFilter, setCommercialFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  // Fetch commercials on mount
  useEffect(() => {
    api.getUsers({ role: 'COMMERCIAL' }).then((res) => {
      const data = res.data as { users?: User[] } | User[];
      if (Array.isArray(data)) {
        setCommercials(data);
      } else if (data?.users) {
        setCommercials(data.users);
      }
    }).catch(() => {});
  }, []);

  // Fetch quotes when filters or page change
  useEffect(() => {
    setLoading(true);
    const params: Record<string, string> = {
      page: String(page),
      limit: String(limit),
    };
    if (statusFilter) params.status = statusFilter;
    if (commercialFilter) params.commercialId = commercialFilter;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;

    api.getQuotes(params)
      .then((res) => {
        setQuotes(res.data);
        if (res.pagination) {
          setTotalPages(res.pagination.totalPages);
          setTotal(res.pagination.total);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [page, statusFilter, commercialFilter, dateFrom, dateTo]);

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (v: string) => void) => (value: string) => {
    setter(value);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FileText className="h-7 w-7 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Devis</h1>
          {!loading && (
            <span className="text-sm text-gray-500">({total} résultat{total !== 1 ? 's' : ''})</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Filter className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Filtres</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Status filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
            <select
              value={statusFilter}
              onChange={(e) => handleFilterChange(setStatusFilter)(e.target.value)}
              className="input w-full"
            >
              <option value="">Tous les statuts</option>
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </div>

          {/* Commercial filter */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Commercial</label>
            <select
              value={commercialFilter}
              onChange={(e) => handleFilterChange(setCommercialFilter)(e.target.value)}
              className="input w-full"
            >
              <option value="">Tous les commerciaux</option>
              {commercials.map((c) => (
                <option key={c.id} value={c.id}>{c.firstName} {c.lastName}</option>
              ))}
            </select>
          </div>

          {/* Date from */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date début</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => handleFilterChange(setDateFrom)(e.target.value)}
              className="input w-full"
            />
          </div>

          {/* Date to */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Date fin</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => handleFilterChange(setDateTo)(e.target.value)}
              className="input w-full"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden p-0">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
          </div>
        ) : quotes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Search className="h-12 w-12 mb-3" />
            <p className="text-lg font-medium">Aucun devis trouvé</p>
            <p className="text-sm">Modifiez vos filtres ou créez un nouveau devis.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">N° Devis</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Client</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Commercial</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total HT</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Total TTC</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Statut</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {quotes.map((quote) => (
                  <tr
                    key={quote.id}
                    onClick={() => navigate(`/quotes/${quote.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 font-medium text-primary-600">
                      {quote.quoteNumber}
                    </td>
                    <td className="px-4 py-3 text-gray-900">
                      {quote.prospect?.companyName ?? '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {quote.commercial
                        ? `${quote.commercial.firstName} ${quote.commercial.lastName}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(quote.totalHT)}
                    </td>
                    <td className="px-4 py-3 text-right text-gray-900 font-medium">
                      {formatCurrency(quote.totalTTC)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          STATUS_COLORS[quote.status]
                        }`}
                      >
                        {STATUS_LABELS[quote.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {formatDate(quote.createdAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/quotes/${quote.id}`);
                        }}
                        className="inline-flex items-center gap-1 text-primary-600 hover:text-primary-800 text-xs font-medium"
                      >
                        <Eye className="h-4 w-4" />
                        Voir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-sm text-gray-600">
              Page {page} sur {totalPages} — {total} devis au total
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (page <= 3) {
                  pageNum = i + 1;
                } else if (page >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = page - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setPage(pageNum)}
                    className={`px-3 py-1.5 text-sm rounded-lg font-medium ${
                      page === pageNum
                        ? 'bg-primary-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
