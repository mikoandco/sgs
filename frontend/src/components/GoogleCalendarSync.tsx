import { useState, useEffect, useCallback } from 'react';
import {
  Calendar,
  Check,
  X,
  RefreshCw,
  Link2,
  Unlink,
  AlertCircle,
  CheckCircle,
  Clock,
  ArrowLeftRight,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';

interface GoogleCalendarStatus {
  connected: boolean;
  email?: string;
  syncEnabled?: boolean;
  lastSyncAt?: string;
}

export const GoogleCalendarSync: React.FC = () => {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      setLoading(true);
      const response = await api.getGoogleCalendarStatus();
      setStatus(response as GoogleCalendarStatus);
      setError(null);
    } catch (err) {
      setError('Impossible de charger le statut de synchronisation');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Check for OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const calendarConnected = urlParams.get('calendar_connected');
    const calendarError = urlParams.get('calendar_error');

    if (calendarConnected === 'true') {
      setSuccess('Google Calendar connecté avec succès !');
      fetchStatus();
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
    } else if (calendarError) {
      setError('Erreur lors de la connexion à Google Calendar');
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [fetchStatus]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);
      const response = await api.getGoogleConnectUrl();
      const data = response as { url: string };
      window.location.href = data.url;
    } catch (err) {
      setError('Erreur lors de la connexion à Google Calendar');
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Voulez-vous vraiment déconnecter Google Calendar ?')) return;

    try {
      setDisconnecting(true);
      setError(null);
      await api.disconnectGoogleCalendar();
      setStatus({ connected: false });
      setSuccess('Google Calendar déconnecté');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('Erreur lors de la déconnexion');
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSync = async () => {
    try {
      setSyncing(true);
      setError(null);
      const response = await api.syncGoogleCalendar();
      const data = response as { success: boolean; syncedEvents?: number };
      if (data.success) {
        setSuccess(`Synchronisation terminée (${data.syncedEvents || 0} événements)`);
        setTimeout(() => setSuccess(null), 3000);
        fetchStatus();
      }
    } catch (err) {
      setError('Erreur lors de la synchronisation');
    } finally {
      setSyncing(false);
    }
  };

  const handleToggleSync = async (enabled: boolean) => {
    try {
      await api.toggleGoogleSync(enabled);
      setStatus(prev => prev ? { ...prev, syncEnabled: enabled } : null);
    } catch (err) {
      setError('Erreur lors de la mise à jour des paramètres');
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-red-100 text-red-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Google Calendar</h3>
            <p className="text-sm text-gray-500">Synchronisation bidirectionnelle</p>
          </div>
        </div>
        {status?.connected && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-2 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Synchronisation...' : 'Synchroniser'}
          </button>
        )}
      </div>

      <div className="p-6 space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-800">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-800">{success}</p>
            <button onClick={() => setSuccess(null)} className="ml-auto text-green-600 hover:text-green-800">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Connection Status */}
        {status?.connected ? (
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">Connecté</p>
                  <p className="text-sm text-green-600">{status.email}</p>
                </div>
              </div>
              <button
                onClick={handleDisconnect}
                disabled={disconnecting}
                className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded-lg hover:bg-red-50"
              >
                {disconnecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Unlink className="w-4 h-4" />
                )}
                Déconnecter
              </button>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="font-medium text-gray-700">Non connecté</p>
                  <p className="text-sm text-gray-500">Connectez Google Calendar pour synchroniser vos RDV</p>
                </div>
              </div>
              <button
                onClick={handleConnect}
                disabled={connecting}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {connecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Link2 className="w-4 h-4" />
                )}
                Connecter
              </button>
            </div>
          </div>
        )}

        {/* Sync Settings (only when connected) */}
        {status?.connected && (
          <>
            {/* Sync Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <ArrowLeftRight className="w-5 h-5 text-blue-600" />
                  <p className="font-medium text-blue-800">Synchronisation bidirectionnelle</p>
                </div>
                <p className="text-sm text-blue-600">
                  Les RDV créés dans le CRM apparaissent dans Google Calendar et vice versa
                </p>
              </div>
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3 mb-2">
                  <Clock className="w-5 h-5 text-gray-500" />
                  <p className="font-medium text-gray-700">Dernière synchronisation</p>
                </div>
                <p className="text-sm text-gray-600">
                  {status.lastSyncAt
                    ? new Date(status.lastSyncAt).toLocaleString('fr-FR')
                    : 'Jamais synchronisé'}
                </p>
              </div>
            </div>

            {/* Sync Toggle */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Paramètres de synchronisation</h4>
              <div className="space-y-3">
                <label className="flex items-center justify-between cursor-pointer">
                  <span className="text-sm text-gray-700">Activer la synchronisation automatique</span>
                  <button
                    onClick={() => handleToggleSync(!status.syncEnabled)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      status.syncEnabled ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        status.syncEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </label>
                <p className="text-xs text-gray-500">
                  Lorsque activée, les modifications sont automatiquement synchronisées dans les deux sens
                </p>
              </div>
            </div>

            {/* Features */}
            <div className="pt-4 border-t">
              <h4 className="text-sm font-medium text-gray-700 mb-3">Fonctionnalités</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Création de RDV synchronisée dans les deux sens
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Modification et annulation synchronisées
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Notifications en temps réel via webhooks
                </li>
                <li className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-green-500" />
                  Rappels automatiques configurés sur Google
                </li>
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default GoogleCalendarSync;
