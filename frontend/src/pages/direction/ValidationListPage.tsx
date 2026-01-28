import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CheckSquare, Check, X, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react';
import api from '../../services/api';
import type { Quote } from '../../types';

export default function ValidationListPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'processed' | 'all'>('pending');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [refusalComment, setRefusalComment] = useState('');
  const [showRefusalModal, setShowRefusalModal] = useState<string | null>(null);

  useEffect(() => {
    loadQuotes();
  }, [filter]);

  const loadQuotes = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filter === 'pending') params.status = 'SIGNED';
      else if (filter === 'processed') params.status = 'VALIDATED,REFUSED';
      const res = await api.getQuotes(params);
      setQuotes(res.data || []);
    } catch (err) {
      console.error('Error loading quotes:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleValidate = async (quoteId: string, approved: boolean, comment?: string) => {
    try {
      await api.validateQuote(quoteId, { status: approved ? 'APPROVED' : 'REFUSED', comment });
      setShowRefusalModal(null);
      setRefusalComment('');
      loadQuotes();
    } catch (err) {
      console.error('Error validating quote:', err);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);
  const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR').format(new Date(date));

  const pendingCount = quotes.filter(q => q.status === 'SIGNED').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <CheckSquare className="h-7 w-7" /> Validations
          {pendingCount > 0 && <span className="px-2.5 py-0.5 bg-yellow-100 text-yellow-800 rounded-full text-sm">{pendingCount} en attente</span>}
        </h1>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'En attente', value: quotes.filter(q => q.status === 'SIGNED').length, color: 'yellow' },
          { label: 'Validés ce mois', value: quotes.filter(q => q.status === 'VALIDATED').length, color: 'green' },
          { label: 'Refusés ce mois', value: quotes.filter(q => q.status === 'REFUSED').length, color: 'red' },
        ].map(stat => (
          <div key={stat.label} className="bg-white rounded-lg shadow-sm border p-4">
            <p className="text-sm text-gray-500">{stat.label}</p>
            <p className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-4">
        <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
          {(['pending', 'processed', 'all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-4 py-1.5 rounded-md text-sm ${filter === f ? 'bg-white shadow' : ''}`}>
              {f === 'pending' ? 'En attente' : f === 'processed' ? 'Traités' : 'Tous'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>
      ) : quotes.length === 0 ? (
        <div className="bg-white rounded-lg border p-12 text-center text-gray-500">Aucun dossier à afficher</div>
      ) : (
        <div className="space-y-4">
          {quotes.map(quote => (
            <div key={quote.id} className="bg-white rounded-lg shadow-sm border overflow-hidden">
              <div className="p-4 flex items-center justify-between cursor-pointer" onClick={() => setExpandedId(expandedId === quote.id ? null : quote.id)}>
                <div className="flex items-center gap-4">
                  <div>
                    <div className="font-semibold">{quote.quoteNumber}</div>
                    <Link to={`/prospects/${quote.prospect?.id}`} onClick={(e) => e.stopPropagation()} className="text-sm text-primary-600 hover:underline">
                      {quote.prospect?.companyName}
                    </Link>
                  </div>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    quote.status === 'SIGNED' ? 'bg-yellow-100 text-yellow-800' :
                    quote.status === 'VALIDATED' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {quote.status === 'SIGNED' ? 'En attente' : quote.status === 'VALIDATED' ? 'Validé' : 'Refusé'}
                  </span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-lg font-bold">{formatCurrency(quote.totalTTC)}</div>
                    <div className="text-xs text-gray-500">{quote.paymentMode === 'CASH' ? 'Comptant' : 'Leasing'}</div>
                  </div>
                  <div className="text-sm text-gray-500">{quote.commercial?.firstName} {quote.commercial?.lastName}</div>
                  {expandedId === quote.id ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>

              {expandedId === quote.id && (
                <div className="border-t p-4 bg-gray-50">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Détails</h4>
                      <dl className="text-sm space-y-1">
                        <div><dt className="inline text-gray-500">Total HT:</dt> <dd className="inline">{formatCurrency(quote.totalHT)}</dd></div>
                        <div><dt className="inline text-gray-500">TVA:</dt> <dd className="inline">{formatCurrency(quote.totalTVA)}</dd></div>
                        <div><dt className="inline text-gray-500">Signé le:</dt> <dd className="inline">{quote.signedAt ? formatDate(quote.signedAt) : '-'}</dd></div>
                      </dl>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-2">Paiement</h4>
                      <dl className="text-sm space-y-1">
                        {quote.paymentMode === 'CASH' ? (
                          <>
                            <div><dt className="inline text-gray-500">Acompte:</dt> <dd className="inline">{formatCurrency(quote.depositAmount || 0)}</dd></div>
                            <div><dt className="inline text-gray-500">N° chèque:</dt> <dd className="inline">{quote.checkNumber || '-'}</dd></div>
                          </>
                        ) : (
                          <>
                            <div><dt className="inline text-gray-500">Organisme:</dt> <dd className="inline">{quote.leasingOrganism}</dd></div>
                            <div><dt className="inline text-gray-500">Durée:</dt> <dd className="inline">{quote.leasingDuration} mois</dd></div>
                            <div><dt className="inline text-gray-500">Mensualité:</dt> <dd className="inline">{formatCurrency(quote.monthlyPayment || 0)}</dd></div>
                          </>
                        )}
                      </dl>
                    </div>
                  </div>

                  {quote.status === 'SIGNED' && (
                    <div className="flex gap-3 pt-4 border-t">
                      <button onClick={() => handleValidate(quote.id, true)}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                        <Check className="h-5 w-5" /> Approuver
                      </button>
                      <button onClick={() => setShowRefusalModal(quote.id)}
                        className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
                        <X className="h-5 w-5" /> Refuser
                      </button>
                      <button className="flex items-center gap-2 px-4 py-2 border border-yellow-500 text-yellow-700 rounded-lg hover:bg-yellow-50">
                        <MessageSquare className="h-5 w-5" /> Demander complément
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showRefusalModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold mb-4">Motif du refus</h3>
            <textarea value={refusalComment} onChange={(e) => setRefusalComment(e.target.value)}
              placeholder="Expliquez le motif du refus..." className="w-full px-3 py-2 border rounded-lg" rows={4} />
            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => { setShowRefusalModal(null); setRefusalComment(''); }} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={() => handleValidate(showRefusalModal, false, refusalComment)} disabled={!refusalComment.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50">Confirmer le refus</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
