import React, { useState } from 'react';
import {
  Calendar,
  Link2,
  Check,
  Copy,
  ExternalLink,
  RefreshCw,
  Smartphone,
  Monitor,
  AlertCircle,
  Clock
} from 'lucide-react';

interface CalendarSyncProps {
  userId?: string;
}

export const CalendarSync: React.FC<CalendarSyncProps> = ({ userId }) => {
  const [copied, setCopied] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const [syncing, setSyncing] = useState(false);

  // Generate a unique iCal URL for the user
  const icalUrl = `${window.location.origin}/api/calendar/ical/${userId || 'demo'}`;

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(icalUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    // Simulate sync
    await new Promise(resolve => setTimeout(resolve, 1500));
    setLastSync(new Date());
    setSyncing(false);
  };

  const calendarProviders = [
    {
      name: 'Google Calendar',
      icon: '📅',
      color: 'bg-blue-50 border-blue-200',
      instructions: 'Paramètres → Ajouter un agenda → À partir d\'une URL',
      url: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(icalUrl)}`
    },
    {
      name: 'Apple Calendar',
      icon: '🍎',
      color: 'bg-gray-50 border-gray-200',
      instructions: 'Fichier → Nouvel abonnement à un calendrier',
      url: `webcal://${icalUrl.replace(/^https?:\/\//, '')}`
    },
    {
      name: 'Outlook',
      icon: '📧',
      color: 'bg-blue-50 border-blue-200',
      instructions: 'Ajouter un calendrier → S\'abonner depuis le web',
      url: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(icalUrl)}`
    }
  ];

  return (
    <div className="bg-white rounded-xl border">
      <div className="px-6 py-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
            <Calendar className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900">Synchronisation Calendrier</h3>
            <p className="text-sm text-gray-500">Synchronisez vos RDV avec vos agendas</p>
          </div>
        </div>
        <button
          onClick={handleSync}
          disabled={syncing}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50 disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Synchroniser
        </button>
      </div>

      <div className="p-6 space-y-6">
        {/* Sync Status */}
        <div className={`p-4 rounded-lg border ${syncEnabled ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
          <div className="flex items-center gap-3">
            {syncEnabled ? (
              <Check className="w-5 h-5 text-green-600" />
            ) : (
              <AlertCircle className="w-5 h-5 text-yellow-600" />
            )}
            <div>
              <p className={`font-medium ${syncEnabled ? 'text-green-800' : 'text-yellow-800'}`}>
                {syncEnabled ? 'Synchronisation active' : 'Synchronisation non configurée'}
              </p>
              {lastSync && (
                <p className="text-sm text-gray-600 mt-1">
                  Dernière sync : {lastSync.toLocaleString('fr-FR')}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* iCal URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            URL du calendrier (iCal)
          </label>
          <div className="flex gap-2">
            <div className="flex-1 flex items-center px-3 py-2 bg-gray-50 border rounded-lg text-sm font-mono text-gray-600 overflow-hidden">
              <Link2 className="w-4 h-4 mr-2 flex-shrink-0 text-gray-400" />
              <span className="truncate">{icalUrl}</span>
            </div>
            <button
              onClick={handleCopyUrl}
              className={`px-3 py-2 border rounded-lg flex items-center gap-2 text-sm transition-colors ${
                copied ? 'bg-green-50 border-green-300 text-green-700' : 'hover:bg-gray-50'
              }`}
            >
              {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copié' : 'Copier'}
            </button>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            Utilisez cette URL pour vous abonner à votre calendrier depuis n'importe quelle application
          </p>
        </div>

        {/* Calendar Providers */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-3">Ajouter à votre agenda</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {calendarProviders.map((provider) => (
              <a
                key={provider.name}
                href={provider.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSyncEnabled(true)}
                className={`p-4 rounded-lg border ${provider.color} hover:shadow-sm transition-shadow`}
              >
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">{provider.icon}</span>
                  <span className="font-medium text-gray-900">{provider.name}</span>
                </div>
                <p className="text-xs text-gray-600">{provider.instructions}</p>
                <div className="mt-2 flex items-center gap-1 text-xs text-blue-600">
                  <ExternalLink className="w-3 h-3" />
                  Ouvrir
                </div>
              </a>
            ))}
          </div>
        </div>

        {/* Sync Settings */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium text-gray-700 mb-3">Paramètres de synchronisation</h4>
          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Synchroniser mes rendez-vous</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                defaultChecked
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Recevoir des rappels 1h avant</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Inclure les alertes en attente</span>
            </label>
          </div>
        </div>

        {/* Device Info */}
        <div className="flex items-center gap-6 pt-4 border-t text-sm text-gray-500">
          <div className="flex items-center gap-2">
            <Monitor className="w-4 h-4" />
            <span>Desktop : OK</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4" />
            <span>Mobile : OK</span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            <span>Mise à jour toutes les 15 min</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalendarSync;
