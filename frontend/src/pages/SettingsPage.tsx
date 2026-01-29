import React, { useState } from 'react';
import {
  Settings,
  Bell,
  Mail,
  Shield,
  Palette,
  Globe,
  Calendar,
  Smartphone,
  Save,
  Check,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import CalendarSync from '../components/CalendarSync';

interface NotificationSettings {
  emailNewProspect: boolean;
  emailAppointmentReminder: boolean;
  emailQuoteSigned: boolean;
  emailPaymentReceived: boolean;
  pushAlerts: boolean;
  pushMessages: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
}

interface DisplaySettings {
  theme: 'light' | 'dark' | 'system';
  compactMode: boolean;
  showWelcome: boolean;
  defaultView: 'list' | 'card';
  itemsPerPage: number;
  language: string;
  dateFormat: string;
  currency: string;
}

export const SettingsPage: React.FC = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState<'notifications' | 'display' | 'calendar' | 'security'>('notifications');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [notifications, setNotifications] = useState<NotificationSettings>({
    emailNewProspect: true,
    emailAppointmentReminder: true,
    emailQuoteSigned: true,
    emailPaymentReceived: true,
    pushAlerts: true,
    pushMessages: false,
    dailyDigest: false,
    weeklyReport: true
  });

  const [display, setDisplay] = useState<DisplaySettings>({
    theme: 'light',
    compactMode: false,
    showWelcome: true,
    defaultView: 'list',
    itemsPerPage: 25,
    language: 'fr',
    dateFormat: 'DD/MM/YYYY',
    currency: 'EUR'
  });

  const handleSave = async () => {
    setSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Affichage', icon: Palette },
    { id: 'calendar', label: 'Calendrier', icon: Calendar },
    { id: 'security', label: 'Sécurité', icon: Shield }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres</h1>
          <p className="text-gray-600">Personnalisez votre expérience</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
            saved
              ? 'bg-green-600 text-white'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          {saving ? 'Enregistrement...' : saved ? 'Enregistré !' : 'Enregistrer'}
        </button>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border">
        <div className="border-b">
          <nav className="flex">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as typeof activeTab)}
                  className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Notifications Tab */}
          {activeTab === 'notifications' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Notifications par email
                </h3>
                <div className="space-y-4">
                  {[
                    { key: 'emailNewProspect', label: 'Nouveau prospect assigné', desc: 'Recevez un email quand un prospect vous est assigné' },
                    { key: 'emailAppointmentReminder', label: 'Rappel de rendez-vous', desc: 'Rappel 24h avant chaque rendez-vous' },
                    { key: 'emailQuoteSigned', label: 'Devis signé', desc: 'Notification quand un client signe un devis' },
                    { key: 'emailPaymentReceived', label: 'Paiement reçu', desc: 'Notification quand un paiement est encaissé' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof NotificationSettings] as boolean}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          [item.key]: e.target.checked
                        })}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Smartphone className="w-5 h-5" />
                  Notifications push
                </h3>
                <div className="space-y-4">
                  {[
                    { key: 'pushAlerts', label: 'Alertes urgentes', desc: 'Notifications pour les alertes prioritaires' },
                    { key: 'pushMessages', label: 'Messages', desc: 'Notifications pour les nouveaux commentaires' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof NotificationSettings] as boolean}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          [item.key]: e.target.checked
                        })}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Résumés périodiques</h3>
                <div className="space-y-4">
                  {[
                    { key: 'dailyDigest', label: 'Résumé quotidien', desc: 'Recevez un email chaque matin avec vos tâches du jour' },
                    { key: 'weeklyReport', label: 'Rapport hebdomadaire', desc: 'Synthèse de vos performances chaque lundi' }
                  ].map((item) => (
                    <label key={item.key} className="flex items-start gap-4 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={notifications[item.key as keyof NotificationSettings] as boolean}
                        onChange={(e) => setNotifications({
                          ...notifications,
                          [item.key]: e.target.checked
                        })}
                        className="mt-1 w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">{item.label}</p>
                        <p className="text-sm text-gray-500">{item.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Display Tab */}
          {activeTab === 'display' && (
            <div className="space-y-8">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Thème</h3>
                <div className="flex gap-4">
                  {[
                    { value: 'light', label: 'Clair', icon: Sun },
                    { value: 'dark', label: 'Sombre', icon: Moon },
                    { value: 'system', label: 'Système', icon: Monitor }
                  ].map((theme) => {
                    const Icon = theme.icon;
                    return (
                      <button
                        key={theme.value}
                        onClick={() => setDisplay({ ...display, theme: theme.value as DisplaySettings['theme'] })}
                        className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-colors ${
                          display.theme === theme.value
                            ? 'border-blue-600 bg-blue-50 text-blue-700'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                        {theme.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Options d'affichage</h3>
                <div className="space-y-4">
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Mode compact</p>
                      <p className="text-sm text-gray-500">Affiche plus d'éléments à l'écran</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={display.compactMode}
                      onChange={(e) => setDisplay({ ...display, compactMode: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                  <label className="flex items-center justify-between cursor-pointer">
                    <div>
                      <p className="font-medium text-gray-900">Message de bienvenue</p>
                      <p className="text-sm text-gray-500">Affiche le message de bienvenue sur le tableau de bord</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={display.showWelcome}
                      onChange={(e) => setDisplay({ ...display, showWelcome: e.target.checked })}
                      className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Vue par défaut</label>
                  <select
                    value={display.defaultView}
                    onChange={(e) => setDisplay({ ...display, defaultView: e.target.value as 'list' | 'card' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="list">Liste</option>
                    <option value="card">Cartes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Éléments par page</label>
                  <select
                    value={display.itemsPerPage}
                    onChange={(e) => setDisplay({ ...display, itemsPerPage: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="10">10</option>
                    <option value="25">25</option>
                    <option value="50">50</option>
                    <option value="100">100</option>
                  </select>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  Régionalisation
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Langue</label>
                    <select
                      value={display.language}
                      onChange={(e) => setDisplay({ ...display, language: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Format de date</label>
                    <select
                      value={display.dateFormat}
                      onChange={(e) => setDisplay({ ...display, dateFormat: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Devise</label>
                    <select
                      value={display.currency}
                      onChange={(e) => setDisplay({ ...display, currency: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="EUR">Euro (€)</option>
                      <option value="USD">Dollar ($)</option>
                      <option value="GBP">Livre (£)</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Calendar Tab */}
          {activeTab === 'calendar' && (
            <CalendarSync userId={user?.id} />
          )}

          {/* Security Tab */}
          {activeTab === 'security' && (
            <div className="space-y-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-medium text-yellow-800 mb-1">Sessions actives</h4>
                <p className="text-sm text-yellow-700">
                  Vous êtes actuellement connecté depuis 1 appareil.
                </p>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Historique de connexion</h3>
                <div className="border rounded-lg divide-y">
                  {[
                    { device: 'Chrome sur Windows', location: 'Paris, France', date: 'Aujourd\'hui, 14:32', current: true },
                    { device: 'Safari sur iPhone', location: 'Lyon, France', date: 'Hier, 09:15', current: false },
                    { device: 'Chrome sur MacOS', location: 'Paris, France', date: '26 Jan 2024, 18:45', current: false }
                  ].map((session, index) => (
                    <div key={index} className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900 flex items-center gap-2">
                          {session.device}
                          {session.current && (
                            <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
                              Session actuelle
                            </span>
                          )}
                        </p>
                        <p className="text-sm text-gray-500">{session.location} • {session.date}</p>
                      </div>
                      {!session.current && (
                        <button className="text-sm text-red-600 hover:underline">
                          Révoquer
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentification à deux facteurs</h3>
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">2FA non activé</p>
                      <p className="text-sm text-gray-500">
                        Renforcez la sécurité de votre compte avec l'authentification à deux facteurs
                      </p>
                    </div>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                      Activer
                    </button>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t">
                <button className="text-red-600 hover:underline text-sm">
                  Déconnecter toutes les autres sessions
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
