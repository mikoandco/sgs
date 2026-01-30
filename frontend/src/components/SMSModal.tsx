import { useState, useEffect } from 'react';
import {
  X,
  MessageSquare,
  Send,
  Loader2,
  CheckCircle,
  AlertCircle,
  FileText
} from 'lucide-react';
import { api } from '../services/api';

interface SMSModalProps {
  isOpen: boolean;
  onClose: () => void;
  prospectId?: string;
  prospectName?: string;
  phone?: string;
  appointmentId?: string;
}

interface SMSTemplate {
  id: string;
  name: string;
  description: string;
}

export const SMSModal: React.FC<SMSModalProps> = ({
  isOpen,
  onClose,
  prospectId,
  prospectName,
  phone,
  appointmentId
}) => {
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [templates, setTemplates] = useState<SMSTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [charCount, setCharCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadTemplates();
      setMessage('');
      setSuccess(false);
      setError(null);
      setSelectedTemplate('');
    }
  }, [isOpen]);

  useEffect(() => {
    setCharCount(message.length);
  }, [message]);

  const loadTemplates = async () => {
    try {
      const res = await api.getSMSTemplates();
      setTemplates((res as any).templates || []);
    } catch (err) {
      console.error('Error loading templates:', err);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    // Templates are applied server-side with data
    const template = templates.find(t => t.id === templateId);
    if (template) {
      // Show preview placeholder
      switch (templateId) {
        case 'appointmentReminder':
          setMessage(`Rappel RDV: Demain [DATE] à [HEURE], notre conseiller [NOM] vous rencontrera. Solution GS`);
          break;
        case 'appointmentConfirmation':
          setMessage(`Votre RDV est confirmé pour le [DATE] à [HEURE]. [NOM] vous contactera. Solution GS`);
          break;
        case 'quoteReady':
          setMessage(`Bonjour, votre devis Solution GS est prêt. Nous vous recontacterons bientôt. Merci de votre confiance!`);
          break;
        case 'installationScheduled':
          setMessage(`L'installation de votre système de sécurité est prévue le [DATE] à [HEURE]. Solution GS`);
          break;
        default:
          setMessage('');
      }
    }
  };

  const handleSend = async () => {
    if (!message.trim() && !selectedTemplate) {
      setError('Veuillez entrer un message ou choisir un modèle');
      return;
    }

    setSending(true);
    setError(null);

    try {
      if (appointmentId) {
        // Send appointment reminder
        await api.sendAppointmentReminder(appointmentId);
      } else {
        // Send custom SMS
        await api.sendSMS({
          prospectId,
          phone,
          message: selectedTemplate ? undefined : message,
          template: selectedTemplate || undefined,
        });
      }

      setSuccess(true);
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Erreur lors de l\'envoi du SMS');
    } finally {
      setSending(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <MessageSquare className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Envoyer un SMS</h3>
              {prospectName && (
                <p className="text-sm text-gray-500">{prospectName}</p>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Success state */}
          {success ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <p className="text-lg font-medium text-gray-900">SMS envoyé !</p>
              <p className="text-sm text-gray-500 mt-1">Le message a été envoyé avec succès</p>
            </div>
          ) : (
            <>
              {/* Error */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="text-sm text-red-800">{error}</p>
                </div>
              )}

              {/* Phone number */}
              {phone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone
                  </label>
                  <input
                    type="text"
                    value={phone}
                    disabled
                    className="w-full px-3 py-2 bg-gray-50 border rounded-lg text-gray-600"
                  />
                </div>
              )}

              {/* Templates */}
              {!appointmentId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Modèle de message
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {templates.map((template) => (
                      <button
                        key={template.id}
                        onClick={() => handleTemplateSelect(template.id)}
                        className={`p-3 text-left rounded-lg border transition-colors ${
                          selectedTemplate === template.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span className="text-sm font-medium text-gray-900">{template.name}</span>
                        </div>
                        <p className="text-xs text-gray-500">{template.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Message textarea */}
              {!appointmentId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Message {selectedTemplate ? '(aperçu)' : ''}
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setSelectedTemplate('');
                    }}
                    placeholder="Tapez votre message..."
                    rows={4}
                    disabled={!!selectedTemplate}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-50"
                  />
                  <div className="flex justify-between mt-1">
                    <p className="text-xs text-gray-500">
                      {charCount}/160 caractères {charCount > 160 && '(2 SMS)'}
                    </p>
                    {selectedTemplate && (
                      <button
                        onClick={() => setSelectedTemplate('')}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        Personnaliser
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Appointment reminder info */}
              {appointmentId && (
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    Un SMS de rappel automatique sera envoyé avec les détails du rendez-vous.
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!success && (
          <div className="flex gap-3 p-4 border-t">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={handleSend}
              disabled={sending || (!message.trim() && !selectedTemplate && !appointmentId)}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Envoi...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  Envoyer
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default SMSModal;
