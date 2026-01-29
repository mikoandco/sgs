import React, { useState } from 'react';
import {
  Zap,
  Plus,
  Edit3,
  Trash2,
  Play,
  Pause,
  Clock,
  Mail,
  Bell,
  Users,
  FileText,
  CheckCircle,
  XCircle,
  ChevronRight,
  Settings,
  AlertTriangle,
  Save,
  X
} from 'lucide-react';

interface WorkflowRule {
  id: string;
  name: string;
  description: string;
  trigger: {
    type: string;
    condition: string;
    value?: string | number;
  };
  action: {
    type: string;
    target: string;
    template?: string;
    delay?: number;
  };
  active: boolean;
  executionCount: number;
  lastExecuted?: string;
  createdAt: string;
}

const defaultRules: WorkflowRule[] = [
  {
    id: '1',
    name: 'Relance prospect sans contact',
    description: 'Alerte SDR si un prospect n\'a pas été contacté depuis 7 jours',
    trigger: {
      type: 'time_based',
      condition: 'no_contact',
      value: 7
    },
    action: {
      type: 'create_alert',
      target: 'sdr',
      delay: 0
    },
    active: true,
    executionCount: 45,
    lastExecuted: '2024-01-28T10:30:00',
    createdAt: '2024-01-01'
  },
  {
    id: '2',
    name: 'Rappel RDV J-1',
    description: 'Email de rappel au client la veille du rendez-vous',
    trigger: {
      type: 'event',
      condition: 'appointment_scheduled',
      value: 1
    },
    action: {
      type: 'send_email',
      target: 'client',
      template: 'appointment_reminder',
      delay: -24 // 24h before
    },
    active: true,
    executionCount: 128,
    lastExecuted: '2024-01-28T09:00:00',
    createdAt: '2024-01-01'
  },
  {
    id: '3',
    name: 'Devis expirant',
    description: 'Alerte commercial si un devis expire dans 7 jours',
    trigger: {
      type: 'time_based',
      condition: 'quote_expiring',
      value: 7
    },
    action: {
      type: 'create_alert',
      target: 'commercial',
      delay: 0
    },
    active: true,
    executionCount: 23,
    lastExecuted: '2024-01-27T08:00:00',
    createdAt: '2024-01-01'
  },
  {
    id: '4',
    name: 'Confirmation signature',
    description: 'Email de confirmation automatique après signature d\'un devis',
    trigger: {
      type: 'event',
      condition: 'quote_signed'
    },
    action: {
      type: 'send_email',
      target: 'client',
      template: 'quote_signed',
      delay: 0
    },
    active: true,
    executionCount: 67,
    lastExecuted: '2024-01-28T14:15:00',
    createdAt: '2024-01-01'
  },
  {
    id: '5',
    name: 'Renouvellement contrat',
    description: 'Email de rappel 30 jours avant expiration du contrat',
    trigger: {
      type: 'time_based',
      condition: 'contract_expiring',
      value: 30
    },
    action: {
      type: 'send_email',
      target: 'client',
      template: 'contract_renewal',
      delay: 0
    },
    active: false,
    executionCount: 12,
    lastExecuted: '2024-01-15T10:00:00',
    createdAt: '2024-01-01'
  }
];

const triggerTypes = [
  { value: 'event', label: 'Événement', icon: Zap },
  { value: 'time_based', label: 'Temporel', icon: Clock },
  { value: 'status_change', label: 'Changement statut', icon: CheckCircle }
];

const triggerConditions = {
  event: [
    { value: 'prospect_created', label: 'Prospect créé' },
    { value: 'prospect_qualified', label: 'Prospect qualifié' },
    { value: 'appointment_scheduled', label: 'RDV planifié' },
    { value: 'appointment_completed', label: 'RDV effectué' },
    { value: 'quote_created', label: 'Devis créé' },
    { value: 'quote_sent', label: 'Devis envoyé' },
    { value: 'quote_signed', label: 'Devis signé' },
    { value: 'payment_received', label: 'Paiement reçu' }
  ],
  time_based: [
    { value: 'no_contact', label: 'Sans contact depuis X jours' },
    { value: 'quote_expiring', label: 'Devis expire dans X jours' },
    { value: 'contract_expiring', label: 'Contrat expire dans X jours' },
    { value: 'appointment_reminder', label: 'RDV dans X heures' }
  ],
  status_change: [
    { value: 'status_to_qualified', label: 'Passage à Qualifié' },
    { value: 'status_to_signed', label: 'Passage à Signé' },
    { value: 'status_to_lost', label: 'Passage à Perdu' }
  ]
};

const actionTypes = [
  { value: 'send_email', label: 'Envoyer email', icon: Mail },
  { value: 'create_alert', label: 'Créer alerte', icon: Bell },
  { value: 'assign_user', label: 'Assigner utilisateur', icon: Users },
  { value: 'update_status', label: 'Modifier statut', icon: Settings }
];

export const WorkflowRules: React.FC = () => {
  const [rules, setRules] = useState<WorkflowRule[]>(defaultRules);
  const [editingRule, setEditingRule] = useState<WorkflowRule | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const toggleRuleActive = (id: string) => {
    setRules(rules.map(rule =>
      rule.id === id ? { ...rule, active: !rule.active } : rule
    ));
  };

  const deleteRule = (id: string) => {
    if (confirm('Supprimer cette règle ?')) {
      setRules(rules.filter(rule => rule.id !== id));
    }
  };

  const createNewRule = () => {
    setEditingRule({
      id: '',
      name: '',
      description: '',
      trigger: { type: 'event', condition: '' },
      action: { type: 'send_email', target: 'client' },
      active: true,
      executionCount: 0,
      createdAt: new Date().toISOString()
    });
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!editingRule) return;

    if (editingRule.id) {
      setRules(rules.map(r => r.id === editingRule.id ? editingRule : r));
    } else {
      setRules([...rules, { ...editingRule, id: Date.now().toString() }]);
    }

    setEditingRule(null);
    setShowEditor(false);
  };

  const getConditionLabel = (rule: WorkflowRule) => {
    const conditions = triggerConditions[rule.trigger.type as keyof typeof triggerConditions] || [];
    const condition = conditions.find(c => c.value === rule.trigger.condition);
    return condition?.label || rule.trigger.condition;
  };

  const getActionIcon = (type: string) => {
    const action = actionTypes.find(a => a.value === type);
    return action?.icon || Bell;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Automatisations</h1>
          <p className="text-gray-600">Configurez des actions automatiques basées sur des événements</p>
        </div>
        <button
          onClick={createNewRule}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouvelle règle
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.length}</p>
              <p className="text-sm text-gray-500">Règles configurées</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-lg flex items-center justify-center">
              <Play className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.filter(r => r.active).length}</p>
              <p className="text-sm text-gray-500">Règles actives</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 text-purple-600 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">{rules.reduce((acc, r) => acc + r.executionCount, 0)}</p>
              <p className="text-sm text-gray-500">Exécutions totales</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-orange-100 text-orange-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-2xl font-bold">24/7</p>
              <p className="text-sm text-gray-500">Surveillance</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rules List */}
      <div className="bg-white rounded-xl border overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50">
          <h3 className="font-semibold text-gray-900">Règles d'automatisation</h3>
        </div>
        <div className="divide-y">
          {rules.map((rule) => {
            const ActionIcon = getActionIcon(rule.action.type);
            return (
              <div
                key={rule.id}
                className={`p-4 hover:bg-gray-50 transition-colors ${!rule.active ? 'opacity-60' : ''}`}
              >
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => toggleRuleActive(rule.id)}
                    className={`mt-1 w-10 h-6 rounded-full transition-colors relative ${
                      rule.active ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      rule.active ? 'translate-x-5' : 'translate-x-1'
                    }`} />
                  </button>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h4 className="font-medium text-gray-900">{rule.name}</h4>
                      {rule.active ? (
                        <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">Actif</span>
                      ) : (
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">Inactif</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{rule.description}</p>

                    <div className="flex items-center gap-2 text-sm">
                      <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded flex items-center gap-1">
                        <Zap className="w-3 h-3" />
                        {getConditionLabel(rule)}
                        {rule.trigger.value && ` (${rule.trigger.value})`}
                      </span>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                      <span className="px-2 py-1 bg-purple-50 text-purple-700 rounded flex items-center gap-1">
                        <ActionIcon className="w-3 h-3" />
                        {actionTypes.find(a => a.value === rule.action.type)?.label}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>{rule.executionCount} exécutions</span>
                      {rule.lastExecuted && (
                        <span>Dernière : {new Date(rule.lastExecuted).toLocaleString('fr-FR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        setEditingRule(rule);
                        setShowEditor(true);
                      }}
                      className="p-2 hover:bg-gray-100 rounded-lg"
                      title="Modifier"
                    >
                      <Edit3 className="w-4 h-4 text-gray-400" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-2 hover:bg-red-50 rounded-lg"
                      title="Supprimer"
                    >
                      <Trash2 className="w-4 h-4 text-red-400" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {rules.length === 0 && (
            <div className="p-8 text-center text-gray-500">
              <Zap className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>Aucune règle configurée</p>
              <button
                onClick={createNewRule}
                className="mt-2 text-blue-600 hover:underline"
              >
                Créer votre première règle
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Editor Modal */}
      {showEditor && editingRule && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEditor(false)} />
          <div className="fixed inset-4 lg:inset-20 bg-white rounded-xl z-50 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingRule.id ? 'Modifier la règle' : 'Nouvelle règle'}
              </h2>
              <button onClick={() => setShowEditor(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-2xl mx-auto space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la règle</label>
                  <input
                    type="text"
                    value={editingRule.name}
                    onChange={(e) => setEditingRule({ ...editingRule, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Relance prospect sans contact"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={editingRule.description}
                    onChange={(e) => setEditingRule({ ...editingRule, description: e.target.value })}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Décrivez ce que fait cette règle..."
                  />
                </div>

                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h3 className="font-medium text-blue-900 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Déclencheur (Quand)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-blue-800 mb-1">Type</label>
                      <select
                        value={editingRule.trigger.type}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          trigger: { ...editingRule.trigger, type: e.target.value, condition: '' }
                        })}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white"
                      >
                        {triggerTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-blue-800 mb-1">Condition</label>
                      <select
                        value={editingRule.trigger.condition}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          trigger: { ...editingRule.trigger, condition: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-blue-300 rounded-lg bg-white"
                      >
                        <option value="">Sélectionner...</option>
                        {(triggerConditions[editingRule.trigger.type as keyof typeof triggerConditions] || []).map((cond) => (
                          <option key={cond.value} value={cond.value}>{cond.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {editingRule.trigger.type === 'time_based' && (
                    <div className="mt-3">
                      <label className="block text-sm text-blue-800 mb-1">Valeur (jours/heures)</label>
                      <input
                        type="number"
                        value={editingRule.trigger.value || ''}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          trigger: { ...editingRule.trigger, value: parseInt(e.target.value) }
                        })}
                        className="w-32 px-3 py-2 border border-blue-300 rounded-lg bg-white"
                        min={1}
                      />
                    </div>
                  )}
                </div>

                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <h3 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Settings className="w-4 h-4" />
                    Action (Alors)
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-purple-800 mb-1">Type d'action</label>
                      <select
                        value={editingRule.action.type}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          action: { ...editingRule.action, type: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white"
                      >
                        {actionTypes.map((type) => (
                          <option key={type.value} value={type.value}>{type.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm text-purple-800 mb-1">Destinataire</label>
                      <select
                        value={editingRule.action.target}
                        onChange={(e) => setEditingRule({
                          ...editingRule,
                          action: { ...editingRule.action, target: e.target.value }
                        })}
                        className="w-full px-3 py-2 border border-purple-300 rounded-lg bg-white"
                      >
                        <option value="client">Client</option>
                        <option value="sdr">SDR assigné</option>
                        <option value="commercial">Commercial assigné</option>
                        <option value="direction">Direction</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="ruleActive"
                    checked={editingRule.active}
                    onChange={(e) => setEditingRule({ ...editingRule, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="ruleActive" className="text-sm text-gray-700">
                    Activer cette règle immédiatement
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowEditor(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleSave}
                disabled={!editingRule.name || !editingRule.trigger.condition}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default WorkflowRules;
