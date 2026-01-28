import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FileText,
  ArrowLeft,
  Edit,
  PenTool,
  Download,
  Building2,
  User,
  Phone,
  MapPin,
  CheckCircle,
  XCircle,
  Clock,
  CreditCard,
  FileDown,
  Loader2,
  ShieldCheck,
  Link as LinkIcon,
  CircleDot,
  AlertTriangle,
  Banknote,
  CalendarDays,
} from 'lucide-react';
import api from '../../services/api';
import type { Quote, QuoteStatus, PaymentStatus, ValidationStatus } from '../../types';
import { useAuthStore } from '../../store/authStore';

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

const formatDateTime = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PENDING: 'En attente',
  RECEIVED: 'Reçu',
  VALIDATED: 'Validé',
  REJECTED: 'Rejeté',
};

const PAYMENT_STATUS_COLORS: Record<PaymentStatus, string> = {
  PENDING: 'bg-yellow-100 text-yellow-700',
  RECEIVED: 'bg-blue-100 text-blue-700',
  VALIDATED: 'bg-green-100 text-green-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const VALIDATION_STATUS_LABELS: Record<ValidationStatus, string> = {
  PENDING: 'En attente',
  APPROVED: 'Approuvé',
  REFUSED: 'Refusé',
  INFO_REQUESTED: 'Info demandée',
};

const VALIDATION_STATUS_ICONS: Record<ValidationStatus, React.ElementType> = {
  PENDING: Clock,
  APPROVED: CheckCircle,
  REFUSED: XCircle,
  INFO_REQUESTED: AlertTriangle,
};

const VALIDATION_STATUS_COLORS: Record<ValidationStatus, string> = {
  PENDING: 'text-yellow-500',
  APPROVED: 'text-green-500',
  REFUSED: 'text-red-500',
  INFO_REQUESTED: 'text-orange-500',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function QuoteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const [quote, setQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);

  const canSeeMargin = user?.role === 'COMMERCIAL' || user?.role === 'ADMIN';

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    api.getQuote(id)
      .then((res) => setQuote(res.data))
      .catch(() => navigate('/quotes'))
      .finally(() => setLoading(false));
  }, [id, navigate]);

  const handleSign = async () => {
    if (!quote) return;
    try {
      await api.signQuote(quote.id, { paymentMode: quote.paymentMode || 'CASH' });
      const res = await api.getQuote(quote.id);
      setQuote(res.data);
    } catch {
      // Error handled silently
    }
  };

  const handleGeneratePdf = () => {
    if (quote?.pdfUrl) {
      window.open(quote.pdfUrl, '_blank');
    }
  };

  // ---------------------------------------------------------------------------
  // Loading
  // ---------------------------------------------------------------------------

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  if (!quote) return null;

  const prospect = quote.prospect;
  const lines = quote.lines ?? [];
  const upsells = quote.upsells ?? [];
  const payments = quote.payments ?? [];
  const validations = quote.validations ?? [];

  const subtotalHT = lines.reduce((sum, l) => sum + l.totalHT, 0);

  return (
    <div className="space-y-6">
      {/* Back + Header */}
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/quotes')} className="btn-secondary px-2 py-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <FileText className="h-6 w-6 text-primary-600 flex-shrink-0" />
            <h1 className="text-2xl font-bold text-gray-900">{quote.quoteNumber}</h1>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[quote.status]}`}
            >
              {STATUS_LABELS[quote.status]}
            </span>
          </div>
          {prospect && (
            <p className="text-gray-500 mt-1">
              {prospect.companyName} — Créé le {formatDate(quote.createdAt)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {quote.status === 'DRAFT' && (
            <button
              onClick={() => navigate(`/quotes/${quote.id}/edit`)}
              className="btn-secondary flex items-center gap-2"
            >
              <Edit className="h-4 w-4" />
              Modifier
            </button>
          )}
          {(quote.status === 'SENT' || quote.status === 'DRAFT') && (
            <button onClick={handleSign} className="btn-primary flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Signer
            </button>
          )}
          <button onClick={handleGeneratePdf} className="btn-secondary flex items-center gap-2">
            <Download className="h-4 w-4" />
            PDF
          </button>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT — 2/3 */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Client */}
          {prospect && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 className="h-5 w-5 text-gray-400" />
                Client
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Entreprise</p>
                  <p className="font-medium text-gray-900">{prospect.companyName}</p>
                </div>
                <div>
                  <p className="text-gray-500">Adresse</p>
                  <p className="font-medium text-gray-900">
                    {prospect.address}
                    {prospect.addressComplement && `, ${prospect.addressComplement}`}
                    <br />
                    {prospect.postalCode} {prospect.city}
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <User className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Décideur</p>
                    <p className="font-medium text-gray-900">{prospect.decisionMakerName}</p>
                    {prospect.decisionMakerFunction && (
                      <p className="text-gray-400 text-xs">{prospect.decisionMakerFunction}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-gray-500">Téléphone</p>
                    <p className="font-medium text-gray-900">{prospect.decisionMakerMobile}</p>
                    {prospect.phone && (
                      <p className="text-gray-600 text-xs">Fixe : {prospect.phone}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Card: Lignes du devis */}
          <div className="card p-0 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Lignes du devis</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Réf</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Désignation</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Qté</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Prix unitaire HT</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Total HT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {lines.map((line) => (
                    <tr key={line.id}>
                      <td className="px-4 py-3 text-gray-500">{line.product?.reference ?? '-'}</td>
                      <td className="px-4 py-3 text-gray-900">{line.designation}</td>
                      <td className="px-4 py-3 text-right text-gray-700">{line.quantity}</td>
                      <td className="px-4 py-3 text-right text-gray-700">
                        {formatCurrency(line.unitPriceHT)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(line.totalHT)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-gray-200 bg-gray-50">
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-medium text-gray-600">
                      Sous-total HT
                    </td>
                    <td className="px-4 py-2 text-right font-medium text-gray-900">
                      {formatCurrency(subtotalHT)}
                    </td>
                  </tr>
                  {(quote.discountPercent ?? 0) > 0 && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right font-medium text-red-600">
                        Remise ({quote.discountPercent}%)
                      </td>
                      <td className="px-4 py-2 text-right font-medium text-red-600">
                        -{formatCurrency(quote.discountAmount ?? 0)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right font-semibold text-gray-700">
                      Total HT
                    </td>
                    <td className="px-4 py-2 text-right font-semibold text-gray-900">
                      {formatCurrency(quote.totalHT)}
                    </td>
                  </tr>
                  <tr>
                    <td colSpan={4} className="px-4 py-2 text-right text-gray-600">
                      TVA (20%)
                    </td>
                    <td className="px-4 py-2 text-right text-gray-700">
                      {formatCurrency(quote.totalTVA)}
                    </td>
                  </tr>
                  <tr className="border-t border-gray-300">
                    <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">
                      Total TTC
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-primary-600 text-lg">
                      {formatCurrency(quote.totalTTC)}
                    </td>
                  </tr>
                  {canSeeMargin && quote.marginPercent != null && (
                    <tr>
                      <td colSpan={4} className="px-4 py-2 text-right text-gray-500 text-xs">
                        Marge
                      </td>
                      <td className="px-4 py-2 text-right text-gray-500 text-xs">
                        {quote.marginPercent.toFixed(1)}%
                      </td>
                    </tr>
                  )}
                </tfoot>
              </table>
            </div>
          </div>

          {/* Card: Options complémentaires */}
          {upsells.length > 0 && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Options complémentaires</h2>
              <ul className="divide-y divide-gray-100">
                {upsells.map((upsell) => (
                  <li key={upsell.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded flex items-center justify-center ${
                          upsell.selected
                            ? 'bg-green-500 text-white'
                            : 'border-2 border-gray-300'
                        }`}
                      >
                        {upsell.selected && <CheckCircle className="h-3.5 w-3.5" />}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{upsell.name}</p>
                        {upsell.description && (
                          <p className="text-xs text-gray-500">{upsell.description}</p>
                        )}
                      </div>
                    </div>
                    <span className="text-sm font-medium text-gray-700">
                      {formatCurrency(upsell.priceHT)}
                      {upsell.isMonthly && <span className="text-gray-400 text-xs"> /mois</span>}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Card: Paiement */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              Paiement
            </h2>

            {quote.paymentMode === 'CASH' && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Banknote className="h-4 w-4 text-green-500" />
                  <span className="font-medium text-gray-900">Paiement comptant</span>
                </div>
                {quote.depositPercent != null && (
                  <div className="grid grid-cols-2 gap-4 pl-6">
                    <div>
                      <p className="text-gray-500">Acompte ({quote.depositPercent}%)</p>
                      <p className="font-medium text-gray-900">
                        {formatCurrency(quote.depositAmount ?? 0)}
                      </p>
                    </div>
                    {quote.checkNumber && (
                      <div>
                        <p className="text-gray-500">N° Chèque</p>
                        <p className="font-medium text-gray-900">{quote.checkNumber}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {quote.paymentMode === 'LEASING' && (
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-blue-500" />
                  <span className="font-medium text-gray-900">Leasing</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pl-6">
                  <div>
                    <p className="text-gray-500">Organisme</p>
                    <p className="font-medium text-gray-900">
                      {quote.leasingOrganism ?? '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Durée</p>
                    <p className="font-medium text-gray-900">
                      {quote.leasingDuration ? `${quote.leasingDuration} mois` : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Mensualité</p>
                    <p className="font-medium text-gray-900">
                      {quote.monthlyPayment ? formatCurrency(quote.monthlyPayment) : '-'}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!quote.paymentMode && (
              <p className="text-sm text-gray-400 italic">Mode de paiement non défini</p>
            )}
          </div>

          {/* Card: Signatures */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <PenTool className="h-5 w-5 text-gray-400" />
              Signatures
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="flex items-center gap-3">
                {quote.clientSignatureUrl ? (
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-300 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Signature client</p>
                  <p className="text-xs text-gray-500">
                    {quote.clientSignatureUrl
                      ? `Signé le ${quote.signedAt ? formatDate(quote.signedAt) : '-'}`
                      : 'En attente'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {quote.commercialSignatureUrl ? (
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                ) : (
                  <Clock className="h-6 w-6 text-gray-300 flex-shrink-0" />
                )}
                <div>
                  <p className="text-sm font-medium text-gray-900">Signature commercial</p>
                  <p className="text-xs text-gray-500">
                    {quote.commercialSignatureUrl ? 'Signé' : 'En attente'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card: Subvention Tabac */}
          {quote.isTabacSubvention && (
            <div className="card border-l-4 border-orange-400">
              <h2 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-orange-500" />
                Subvention Tabac
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Montant éligible</p>
                  <p className="font-medium text-gray-900">
                    {quote.eligibleAmount != null
                      ? formatCurrency(quote.eligibleAmount)
                      : 'Non calculé'}
                  </p>
                </div>
                <div>
                  <p className="text-gray-500">Statut</p>
                  <p className="font-medium text-gray-900">
                    {prospect?.subventionStatus ?? 'En cours'}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT — 1/3 */}
        <div className="space-y-6">
          {/* Card: Statut du dossier */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Statut du dossier</h2>
            {validations.length > 0 ? (
              <div className="space-y-4">
                {validations.map((v) => {
                  const Icon = VALIDATION_STATUS_ICONS[v.status] ?? Clock;
                  const colorClass = VALIDATION_STATUS_COLORS[v.status] ?? 'text-gray-400';
                  return (
                    <div key={v.id} className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        <Icon className={`h-5 w-5 ${colorClass}`} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-900">{v.type}</p>
                        <p className="text-xs text-gray-500">
                          {VALIDATION_STATUS_LABELS[v.status]} — {formatDateTime(v.createdAt)}
                        </p>
                        {v.comment && (
                          <p className="text-xs text-gray-400 mt-0.5 italic">{v.comment}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucune étape de validation</p>
            )}
          </div>

          {/* Card: Paiements */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-gray-400" />
              Paiements
            </h2>
            {payments.length > 0 ? (
              <ul className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <li key={p.id} className="py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {p.type} — {p.mode}
                        </p>
                        {p.reference && (
                          <p className="text-xs text-gray-500">Réf: {p.reference}</p>
                        )}
                        {p.receivedAt && (
                          <p className="text-xs text-gray-400">
                            Reçu le {formatDate(p.receivedAt)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">
                          {formatCurrency(p.amount)}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            PAYMENT_STATUS_COLORS[p.status]
                          }`}
                        >
                          {PAYMENT_STATUS_LABELS[p.status]}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-400 italic">Aucun paiement enregistré</p>
            )}
          </div>

          {/* Card: Documents */}
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <FileDown className="h-5 w-5 text-gray-400" />
              Documents
            </h2>
            <ul className="space-y-2">
              {quote.pdfUrl && (
                <li>
                  <a
                    href={quote.pdfUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800"
                  >
                    <FileText className="h-4 w-4" />
                    Devis PDF
                  </a>
                </li>
              )}
              {quote.clientSignatureUrl && (
                <li>
                  <a
                    href={quote.clientSignatureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800"
                  >
                    <PenTool className="h-4 w-4" />
                    Signature client
                  </a>
                </li>
              )}
              {quote.commercialSignatureUrl && (
                <li>
                  <a
                    href={quote.commercialSignatureUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800"
                  >
                    <PenTool className="h-4 w-4" />
                    Signature commercial
                  </a>
                </li>
              )}
              {quote.checkPhotoUrl && (
                <li>
                  <a
                    href={quote.checkPhotoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-primary-600 hover:text-primary-800"
                  >
                    <Banknote className="h-4 w-4" />
                    Photo du chèque
                  </a>
                </li>
              )}
              {!quote.pdfUrl && !quote.clientSignatureUrl && !quote.commercialSignatureUrl && !quote.checkPhotoUrl && (
                <li className="text-sm text-gray-400 italic">Aucun document</li>
              )}
            </ul>
          </div>

          {/* Card: Phase */}
          {quote.phase != null && (
            <div className="card">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <CircleDot className="h-5 w-5 text-gray-400" />
                Phase
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      quote.phase === 1
                        ? 'bg-primary-100 text-primary-700'
                        : 'bg-purple-100 text-purple-700'
                    }`}
                  >
                    {quote.phase}
                  </span>
                  <span className="font-medium text-gray-900">Phase {quote.phase}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[quote.status]}`}>
                    {STATUS_LABELS[quote.status]}
                  </span>
                </div>
                {quote.linkedQuoteId && (
                  <Link
                    to={`/quotes/${quote.linkedQuoteId}`}
                    className="flex items-center gap-2 text-primary-600 hover:text-primary-800"
                  >
                    <LinkIcon className="h-4 w-4" />
                    Voir la phase {quote.phase === 1 ? 2 : 1}
                  </Link>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
