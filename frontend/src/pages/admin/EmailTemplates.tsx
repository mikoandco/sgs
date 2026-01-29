import React, { useState, useEffect } from 'react';
import {
  Mail,
  Plus,
  Edit3,
  Trash2,
  Copy,
  Eye,
  Save,
  X,
  FileText,
  Calendar,
  CreditCard,
  Bell,
  CheckCircle,
  Send
} from 'lucide-react';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
  type: string;
  variables: string[];
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: '1',
    name: 'Confirmation de RDV',
    subject: 'Confirmation de votre rendez-vous - Solution GS',
    body: `Bonjour {{clientName}},

Nous vous confirmons votre rendez-vous avec {{commercialName}} :

📅 Date : {{appointmentDate}}
🕐 Heure : {{appointmentTime}}
📍 Adresse : {{address}}

N'hésitez pas à nous contacter en cas d'empêchement.

Cordialement,
L'équipe Solution GS`,
    type: 'appointment',
    variables: ['clientName', 'commercialName', 'appointmentDate', 'appointmentTime', 'address'],
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-15'
  },
  {
    id: '2',
    name: 'Devis envoyé',
    subject: 'Votre devis {{quoteNumber}} - Solution GS',
    body: `Bonjour {{clientName}},

Suite à notre entretien, veuillez trouver ci-joint votre devis n° {{quoteNumber}}.

Montant total TTC : {{totalTTC}}
Validité : {{validUntil}}

Pour toute question, n'hésitez pas à me contacter.

Cordialement,
{{commercialName}}
{{commercialPhone}}`,
    type: 'quote',
    variables: ['clientName', 'quoteNumber', 'totalTTC', 'validUntil', 'commercialName', 'commercialPhone'],
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-10'
  },
  {
    id: '3',
    name: 'Devis signé',
    subject: 'Confirmation de signature - Devis {{quoteNumber}}',
    body: `Bonjour {{clientName}},

Nous vous remercions pour votre confiance !

Votre devis n° {{quoteNumber}} a bien été signé. Notre équipe technique vous contactera prochainement pour planifier l'installation.

Récapitulatif :
- Montant : {{totalTTC}}
- Mode de paiement : {{paymentMode}}

À très bientôt !

L'équipe Solution GS`,
    type: 'quote_signed',
    variables: ['clientName', 'quoteNumber', 'totalTTC', 'paymentMode'],
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-05'
  },
  {
    id: '4',
    name: 'Rappel de paiement',
    subject: 'Rappel - Paiement en attente',
    body: `Bonjour {{clientName}},

Nous vous rappelons qu'un paiement de {{amount}} est en attente pour le devis {{quoteNumber}}.

Merci de procéder au règlement dans les meilleurs délais.

Cordialement,
L'équipe Solution GS`,
    type: 'payment_reminder',
    variables: ['clientName', 'amount', 'quoteNumber'],
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '5',
    name: 'Renouvellement contrat',
    subject: 'Renouvellement de votre contrat - Solution GS',
    body: `Bonjour {{clientName}},

Votre contrat de {{contractType}} arrive à échéance le {{expiryDate}}.

Pour assurer la continuité de votre service, nous vous invitons à procéder au renouvellement.

N'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe Solution GS`,
    type: 'contract_renewal',
    variables: ['clientName', 'contractType', 'expiryDate'],
    active: true,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
];

const templateTypes = [
  { value: 'appointment', label: 'Rendez-vous', icon: Calendar, color: 'purple' },
  { value: 'quote', label: 'Devis', icon: FileText, color: 'blue' },
  { value: 'quote_signed', label: 'Devis signé', icon: CheckCircle, color: 'green' },
  { value: 'payment_reminder', label: 'Paiement', icon: CreditCard, color: 'orange' },
  { value: 'contract_renewal', label: 'Contrat', icon: Bell, color: 'cyan' },
  { value: 'custom', label: 'Personnalisé', icon: Mail, color: 'gray' }
];

export const EmailTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>(defaultTemplates);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<EmailTemplate | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  const handleSave = () => {
    if (!editingTemplate) return;

    if (editingTemplate.id) {
      setTemplates(templates.map(t =>
        t.id === editingTemplate.id ? { ...editingTemplate, updatedAt: new Date().toISOString() } : t
      ));
    } else {
      setTemplates([
        ...templates,
        {
          ...editingTemplate,
          id: Date.now().toString(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ]);
    }

    setEditingTemplate(null);
    setShowEditor(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Supprimer ce modèle ?')) {
      setTemplates(templates.filter(t => t.id !== id));
    }
  };

  const handleDuplicate = (template: EmailTemplate) => {
    const newTemplate: EmailTemplate = {
      ...template,
      id: Date.now().toString(),
      name: `${template.name} (copie)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    setTemplates([...templates, newTemplate]);
  };

  const createNewTemplate = () => {
    setEditingTemplate({
      id: '',
      name: '',
      subject: '',
      body: '',
      type: 'custom',
      variables: [],
      active: true,
      createdAt: '',
      updatedAt: ''
    });
    setShowEditor(true);
  };

  const getTypeInfo = (type: string) => {
    return templateTypes.find(t => t.value === type) || templateTypes[templateTypes.length - 1];
  };

  const extractVariables = (text: string): string[] => {
    const matches = text.match(/\{\{(\w+)\}\}/g) || [];
    return [...new Set(matches.map(m => m.replace(/\{\{|\}\}/g, '')))];
  };

  const renderPreview = (template: EmailTemplate) => {
    let previewBody = template.body;
    const sampleData: Record<string, string> = {
      clientName: 'Jean Dupont',
      commercialName: 'Marie Martin',
      appointmentDate: '15 février 2024',
      appointmentTime: '10h00',
      address: '123 Rue du Commerce, 75001 Paris',
      quoteNumber: 'DEV-2024-0125',
      totalTTC: '12 500,00 €',
      validUntil: '15 mars 2024',
      commercialPhone: '06 12 34 56 78',
      paymentMode: 'Leasing 48 mois',
      amount: '3 500,00 €',
      contractType: 'Maintenance',
      expiryDate: '31 décembre 2024'
    };

    Object.entries(sampleData).forEach(([key, value]) => {
      previewBody = previewBody.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
    });

    return previewBody;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Modèles d'emails</h1>
          <p className="text-gray-600">Gérez vos templates de communication</p>
        </div>
        <button
          onClick={createNewTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          <Plus className="w-4 h-4" />
          Nouveau modèle
        </button>
      </div>

      {/* Template Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map((template) => {
          const typeInfo = getTypeInfo(template.type);
          const IconComponent = typeInfo.icon;
          return (
            <div
              key={template.id}
              className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow ${
                !template.active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg bg-${typeInfo.color}-100 text-${typeInfo.color}-600 flex items-center justify-center`}>
                  <IconComponent className="w-5 h-5" />
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPreviewTemplate(template)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title="Aperçu"
                  >
                    <Eye className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDuplicate(template)}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title="Dupliquer"
                  >
                    <Copy className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => {
                      setEditingTemplate(template);
                      setShowEditor(true);
                    }}
                    className="p-1.5 hover:bg-gray-100 rounded"
                    title="Modifier"
                  >
                    <Edit3 className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="p-1.5 hover:bg-red-50 rounded"
                    title="Supprimer"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>

              <h3 className="font-semibold text-gray-900 mb-1">{template.name}</h3>
              <p className="text-sm text-gray-500 mb-3 line-clamp-1">{template.subject}</p>

              <div className="flex items-center justify-between text-xs">
                <span className={`px-2 py-1 rounded bg-${typeInfo.color}-100 text-${typeInfo.color}-700`}>
                  {typeInfo.label}
                </span>
                <span className="text-gray-400">
                  {template.variables.length} variable{template.variables.length > 1 ? 's' : ''}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Editor Modal */}
      {showEditor && editingTemplate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowEditor(false)} />
          <div className="fixed inset-4 lg:inset-10 bg-white rounded-xl z-50 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                {editingTemplate.id ? 'Modifier le modèle' : 'Nouveau modèle'}
              </h2>
              <button onClick={() => setShowEditor(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-3xl mx-auto space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nom du modèle
                    </label>
                    <input
                      type="text"
                      value={editingTemplate.name}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ex: Confirmation de RDV"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Type
                    </label>
                    <select
                      value={editingTemplate.type}
                      onChange={(e) => setEditingTemplate({ ...editingTemplate, type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      {templateTypes.map((type) => (
                        <option key={type.value} value={type.value}>{type.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Objet de l'email
                  </label>
                  <input
                    type="text"
                    value={editingTemplate.subject}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Confirmation de votre rendez-vous - Solution GS"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Corps du message
                  </label>
                  <textarea
                    value={editingTemplate.body}
                    onChange={(e) => {
                      const body = e.target.value;
                      const variables = extractVariables(body);
                      setEditingTemplate({ ...editingTemplate, body, variables });
                    }}
                    rows={12}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    placeholder="Bonjour {{clientName}},..."
                  />
                  <p className="mt-1 text-sm text-gray-500">
                    Utilisez {'{{variable}}'} pour insérer des données dynamiques
                  </p>
                </div>

                {editingTemplate.variables.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Variables détectées
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {editingTemplate.variables.map((variable) => (
                        <span
                          key={variable}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm font-mono"
                        >
                          {`{{${variable}}}`}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="active"
                    checked={editingTemplate.active}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, active: e.target.checked })}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="active" className="text-sm text-gray-700">
                    Modèle actif
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
                disabled={!editingTemplate.name || !editingTemplate.subject || !editingTemplate.body}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                Enregistrer
              </button>
            </div>
          </div>
        </>
      )}

      {/* Preview Modal */}
      {previewTemplate && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setPreviewTemplate(null)} />
          <div className="fixed inset-4 lg:inset-20 bg-white rounded-xl z-50 flex flex-col overflow-hidden">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Aperçu : {previewTemplate.name}</h2>
                <p className="text-sm text-gray-500">Avec données d'exemple</p>
              </div>
              <button onClick={() => setPreviewTemplate(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="max-w-2xl mx-auto bg-gray-50 rounded-lg p-6">
                <div className="bg-white rounded-lg shadow-sm border">
                  <div className="px-4 py-3 border-b bg-gray-50 rounded-t-lg">
                    <div className="flex items-center gap-2 text-sm text-gray-600 mb-1">
                      <Mail className="w-4 h-4" />
                      De: Solution GS &lt;contact@solution-gs.fr&gt;
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      À: Jean Dupont &lt;jean.dupont@email.com&gt;
                    </div>
                    <div className="font-semibold text-gray-900">
                      {previewTemplate.subject.replace(/\{\{(\w+)\}\}/g, (_, key) => {
                        const samples: Record<string, string> = {
                          quoteNumber: 'DEV-2024-0125',
                          clientName: 'Jean Dupont'
                        };
                        return samples[key] || `{{${key}}}`;
                      })}
                    </div>
                  </div>
                  <div className="p-4 whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {renderPreview(previewTemplate)}
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setPreviewTemplate(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Fermer
              </button>
              <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Send className="w-4 h-4" />
                Envoyer un test
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default EmailTemplates;
