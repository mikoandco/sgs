import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Phone, Mail, MapPin, Calendar, FileText, Bell, Users, Shield, Monitor, Building2, Send } from 'lucide-react';
import api from '../../services/api';
import type { Prospect, TimelineEntry } from '../../types';

const STATUS_LABELS: Record<string, string> = {
  NEW: 'Nouveau', QUALIFYING: 'En qualification', QUALIFIED: 'Qualifié',
  APPOINTMENT_SCHEDULED: 'RDV planifié', APPOINTMENT_DONE: 'RDV effectué',
  QUOTE_SENT: 'Devis envoyé', SIGNED: 'Signé', INSTALLATION_PENDING: 'Installation en cours',
  INSTALLED: 'Installé', LOST: 'Perdu',
};

const TIMELINE_COLORS: Record<string, string> = {
  CALL: 'bg-blue-100 text-blue-800', EMAIL: 'bg-purple-100 text-purple-800',
  NOTE: 'bg-gray-100 text-gray-800', APPOINTMENT_SCHEDULED: 'bg-green-100 text-green-800',
  QUOTE_CREATED: 'bg-indigo-100 text-indigo-800', STATUS_CHANGE: 'bg-yellow-100 text-yellow-800',
};

export default function ProspectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [loading, setLoading] = useState(true);
  const [noteType, setNoteType] = useState('NOTE');
  const [noteContent, setNoteContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (id) loadProspect();
  }, [id]);

  const loadProspect = async () => {
    try {
      setLoading(true);
      const res = await api.getProspect(id!);
      setProspect(res.data);
    } catch (err) {
      console.error('Error loading prospect:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteContent.trim()) return;
    try {
      setSubmitting(true);
      await api.addTimelineEntry(id!, { type: noteType, content: noteContent });
      setNoteContent('');
      loadProspect();
    } catch (err) {
      console.error('Error adding note:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: string) => new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  }).format(new Date(date));

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" />
      </div>
    );
  }

  if (!prospect) {
    return <div className="text-center py-12 text-gray-500">Prospect non trouvé</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{prospect.companyName}</h1>
            <span className={`px-2.5 py-0.5 text-sm font-medium rounded-full ${
              prospect.status === 'SIGNED' || prospect.status === 'INSTALLED' ? 'bg-green-100 text-green-800' :
              prospect.status === 'LOST' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
            }`}>
              {STATUS_LABELS[prospect.status]}
            </span>
            {prospect.need && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-gray-100 rounded-full text-sm">
                {prospect.need === 'SECURITY' && <><Shield className="h-4 w-4 text-blue-600" /> Sécurité</>}
                {prospect.need === 'DISPLAY' && <><Monitor className="h-4 w-4 text-purple-600" /> Affichage</>}
                {prospect.need === 'MIXED' && <>Mixte</>}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-1">{prospect.address}, {prospect.postalCode} {prospect.city}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-400" /> Informations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Entreprise</h3>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-gray-500 inline">Société :</dt> <dd className="inline font-medium">{prospect.companyName}</dd></div>
                  <div><dt className="text-gray-500 inline">Adresse :</dt> <dd className="inline">{prospect.address}</dd></div>
                  <div><dt className="text-gray-500 inline">Ville :</dt> <dd className="inline">{prospect.postalCode} {prospect.city}</dd></div>
                  {prospect.siret && <div><dt className="text-gray-500 inline">SIRET :</dt> <dd className="inline">{prospect.siret}</dd></div>}
                  {prospect.activitySector && <div><dt className="text-gray-500 inline">Secteur :</dt> <dd className="inline">{prospect.activitySector}</dd></div>}
                </dl>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">Décisionnaire</h3>
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-gray-500 inline">Nom :</dt> <dd className="inline font-medium">{prospect.decisionMakerName}</dd></div>
                  {prospect.decisionMakerFunction && <div><dt className="text-gray-500 inline">Fonction :</dt> <dd className="inline">{prospect.decisionMakerFunction}</dd></div>}
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <a href={`tel:${prospect.decisionMakerMobile}`} className="text-primary-600 hover:underline">{prospect.decisionMakerMobile}</a>
                  </div>
                  {prospect.decisionMakerEmail && (
                    <div className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <a href={`mailto:${prospect.decisionMakerEmail}`} className="text-primary-600 hover:underline">{prospect.decisionMakerEmail}</a>
                    </div>
                  )}
                </dl>
                {prospect.hasAssociate && (
                  <div className="mt-4 pt-4 border-t">
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Associé</h3>
                    <p className="text-sm">{prospect.associateName} - {prospect.associatePhone}</p>
                  </div>
                )}
              </div>
            </div>
            {prospect.isTabacSubvention && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">Éligible subvention Tabac (jusqu'à 10 000 €)</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Historique</h2>
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {(prospect.timelineEntries || []).map((entry: TimelineEntry) => (
                <div key={entry.id} className="flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-xs font-semibold flex-shrink-0">
                    {entry.user?.firstName?.[0]}{entry.user?.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{entry.user?.firstName} {entry.user?.lastName}</span>
                      <span className={`px-1.5 py-0.5 text-xs rounded ${TIMELINE_COLORS[entry.type] || 'bg-gray-100 text-gray-800'}`}>
                        {entry.type}
                      </span>
                      <span className="text-xs text-gray-500">{formatDate(entry.createdAt)}</span>
                    </div>
                    <p className="text-sm text-gray-700 mt-1">{entry.content}</p>
                  </div>
                </div>
              ))}
              {(!prospect.timelineEntries || prospect.timelineEntries.length === 0) && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune entrée</p>
              )}
            </div>
            <form onSubmit={handleAddNote} className="mt-4 pt-4 border-t flex gap-2">
              <select value={noteType} onChange={(e) => setNoteType(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                <option value="NOTE">Note</option>
                <option value="CALL">Appel</option>
                <option value="EMAIL">Email</option>
                <option value="RELANCE">Relance</option>
              </select>
              <input
                type="text"
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                placeholder="Ajouter une note..."
                className="flex-1 px-3 py-2 border rounded-lg text-sm"
              />
              <button type="submit" disabled={submitting || !noteContent.trim()} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
                <Send className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
            <div className="space-y-2">
              <Link to={`/calendar?prospectId=${prospect.id}`} className="flex items-center gap-2 w-full px-4 py-2 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100">
                <Calendar className="h-5 w-5" /> Planifier RDV
              </Link>
              <Link to={`/quotes/new/${prospect.id}`} className="flex items-center gap-2 w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100">
                <FileText className="h-5 w-5" /> Créer devis
              </Link>
              <button className="flex items-center gap-2 w-full px-4 py-2 bg-yellow-50 text-yellow-700 rounded-lg hover:bg-yellow-100">
                <Bell className="h-5 w-5" /> Ajouter alerte
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" /> Rendez-vous
            </h2>
            {(prospect.appointments || []).length > 0 ? (
              <ul className="space-y-2">
                {prospect.appointments?.slice(0, 5).map((apt: { id: string; scheduledAt: string; status: string; commercial?: { firstName: string; lastName: string } }) => (
                  <li key={apt.id} className="text-sm p-2 bg-gray-50 rounded">
                    <div className="font-medium">{formatDate(apt.scheduledAt)}</div>
                    <div className="text-gray-500">{apt.status} - {apt.commercial?.firstName} {apt.commercial?.lastName}</div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun rendez-vous</p>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <FileText className="h-5 w-5 text-gray-400" /> Devis
            </h2>
            {(prospect.quotes || []).length > 0 ? (
              <ul className="space-y-2">
                {prospect.quotes?.slice(0, 5).map((quote: { id: string; quoteNumber: string; totalTTC: number; status: string }) => (
                  <li key={quote.id} className="text-sm p-2 bg-gray-50 rounded">
                    <Link to={`/quotes/${quote.id}`} className="hover:text-primary-600">
                      <div className="font-medium">{quote.quoteNumber}</div>
                      <div className="text-gray-500">{formatCurrency(quote.totalTTC)} - {quote.status}</div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">Aucun devis</p>
            )}
          </div>

          {prospect.isReferred && prospect.referredBy && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-gray-400" /> Parrainage
              </h2>
              <p className="text-sm">
                Parrainé par : <Link to={`/prospects/${prospect.referredBy.id}`} className="text-primary-600 hover:underline font-medium">
                  {prospect.referredBy.companyName}
                </Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
