import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Shield, Monitor, Shuffle, Check } from 'lucide-react';
import api from '../../services/api';
import type { QualificationQuestion } from '../../types';

type Step = 'identification' | 'need' | 'security' | 'display';

interface FormData {
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  phone: string;
  siret: string;
  activitySector: string;
  decisionMakerName: string;
  decisionMakerFunction: string;
  decisionMakerMobile: string;
  decisionMakerEmail: string;
  hasAssociate: boolean;
  associateName: string;
  associatePhone: string;
  isTabacSubvention: boolean;
  need: 'SECURITY' | 'DISPLAY' | 'MIXED' | null;
}

export default function ProspectWizardPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('identification');
  const [formData, setFormData] = useState<FormData>({
    companyName: '', address: '', postalCode: '', city: '', phone: '', siret: '', activitySector: '',
    decisionMakerName: '', decisionMakerFunction: '', decisionMakerMobile: '', decisionMakerEmail: '',
    hasAssociate: false, associateName: '', associatePhone: '', isTabacSubvention: false, need: null,
  });
  const [securityQuestions, setSecurityQuestions] = useState<QualificationQuestion[]>([]);
  const [displayQuestions, setDisplayQuestions] = useState<QualificationQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const [secRes, dispRes] = await Promise.all([
        api.getQuestions({ category: 'SECURITY' }),
        api.getQuestions({ category: 'DISPLAY' }),
      ]);
      setSecurityQuestions(secRes.data || []);
      setDisplayQuestions(dispRes.data || []);
    } catch (err) {
      console.error('Error loading questions:', err);
    }
  };

  const updateForm = (field: keyof FormData, value: string | boolean | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const validateMobile = (phone: string) => /^0[67]\d{8}$/.test(phone.replace(/\s/g, ''));

  const canProceedIdentification = () => {
    return formData.companyName && formData.address && formData.postalCode && formData.city &&
      formData.decisionMakerName && formData.decisionMakerMobile && validateMobile(formData.decisionMakerMobile);
  };

  const handleNext = () => {
    if (step === 'identification' && canProceedIdentification()) {
      setStep('need');
    } else if (step === 'need' && formData.need) {
      if (formData.need === 'SECURITY' || formData.need === 'MIXED') {
        setStep('security');
      } else {
        setStep('display');
      }
    } else if (step === 'security' && formData.need === 'MIXED') {
      setStep('display');
    }
  };

  const handleBack = () => {
    if (step === 'need') setStep('identification');
    else if (step === 'security') setStep('need');
    else if (step === 'display') {
      if (formData.need === 'MIXED') setStep('security');
      else setStep('need');
    }
  };

  const shouldShowQuestion = (question: QualificationQuestion): boolean => {
    if (!question.parentId || !question.displayCondition) return true;
    try {
      const condition = JSON.parse(question.displayCondition);
      const parentAnswer = answers[question.parentId];
      return parentAnswer === condition.parentAnswer;
    } catch { return true; }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    setError('');
    try {
      const prospectData = {
        ...formData,
        status: 'QUALIFYING' as const,
        need: formData.need || undefined
      };
      const prospectRes = await api.createProspect(prospectData);
      const prospectId = prospectRes.data.id;

      const answersList = Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer }));
      if (answersList.length > 0) {
        await api.qualifyProspect(prospectId, answersList);
      }

      navigate(`/prospects/${prospectId}`);
    } catch (err) {
      setError('Erreur lors de la création du prospect');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestion = (question: QualificationQuestion) => {
    if (!shouldShowQuestion(question)) return null;

    const value = answers[question.id] || '';
    const options = question.options ? JSON.parse(question.options) : [];

    return (
      <div key={question.id} className={`p-4 bg-gray-50 rounded-lg ${question.parentId ? 'ml-6 border-l-2 border-primary-200' : ''}`}>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {question.text} {question.required && <span className="text-red-500">*</span>}
        </label>
        {question.type === 'YES_NO' && (
          <div className="flex gap-2">
            {['Oui', 'Non'].map((opt) => (
              <button key={opt} type="button" onClick={() => setAnswers((p) => ({ ...p, [question.id]: opt }))}
                className={`px-4 py-2 rounded-lg border ${value === opt ? 'bg-primary-600 text-white border-primary-600' : 'bg-white hover:bg-gray-50'}`}>
                {opt}
              </button>
            ))}
          </div>
        )}
        {question.type === 'MULTIPLE_CHOICE' && (
          <div className="space-y-2">
            {options.map((opt: string) => (
              <label key={opt} className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name={question.id} value={opt} checked={value === opt}
                  onChange={(e) => setAnswers((p) => ({ ...p, [question.id]: e.target.value }))}
                  className="text-primary-600 focus:ring-primary-500" />
                <span className="text-sm">{opt}</span>
              </label>
            ))}
          </div>
        )}
        {question.type === 'TEXT' && (
          <input type="text" value={value} onChange={(e) => setAnswers((p) => ({ ...p, [question.id]: e.target.value }))}
            className="w-full px-3 py-2 border rounded-lg" />
        )}
        {question.type === 'NUMBER' && (
          <input type="number" value={value} onChange={(e) => setAnswers((p) => ({ ...p, [question.id]: e.target.value }))}
            className="w-32 px-3 py-2 border rounded-lg" min="0" />
        )}
        {question.type === 'SCALE' && (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" onClick={() => setAnswers((p) => ({ ...p, [question.id]: String(n) }))}
                className={`w-10 h-10 rounded-full border-2 ${value === String(n) ? 'bg-primary-600 text-white border-primary-600' : 'hover:border-primary-300'}`}>
                {n}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  const steps = ['identification', 'need', ...(formData.need === 'MIXED' ? ['security', 'display'] : formData.need === 'SECURITY' ? ['security'] : formData.need === 'DISPLAY' ? ['display'] : [])];
  const currentIndex = steps.indexOf(step);
  const isLastStep = (step === 'security' && formData.need === 'SECURITY') || (step === 'display');

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Nouveau prospect</h1>

      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          {['Identification', 'Besoin', 'Qualification'].map((label, i) => (
            <div key={label} className={`flex items-center ${i < 2 ? 'flex-1' : ''}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                i <= currentIndex ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-600'
              }`}>
                {i < currentIndex ? <Check className="h-5 w-5" /> : i + 1}
              </div>
              <span className={`ml-2 text-sm ${i <= currentIndex ? 'text-primary-600 font-medium' : 'text-gray-500'}`}>{label}</span>
              {i < 2 && <div className={`flex-1 h-1 mx-4 ${i < currentIndex ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border p-6">
        {error && <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg">{error}</div>}

        {step === 'identification' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Identification du prospect</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom de la société *</label>
                <input type="text" value={formData.companyName} onChange={(e) => updateForm('companyName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                <input type="text" value={formData.address} onChange={(e) => updateForm('address', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Code postal *</label>
                <input type="text" value={formData.postalCode} onChange={(e) => updateForm('postalCode', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" maxLength={5} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                <input type="text" value={formData.city} onChange={(e) => updateForm('city', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                <input type="tel" value={formData.phone} onChange={(e) => updateForm('phone', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">SIRET</label>
                <input type="text" value={formData.siret} onChange={(e) => updateForm('siret', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Secteur d'activité</label>
                <input type="text" value={formData.activitySector} onChange={(e) => updateForm('activitySector', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Tabac, Commerce, etc." />
              </div>
            </div>

            <hr />

            <h3 className="font-medium text-gray-900">Décisionnaire</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                <input type="text" value={formData.decisionMakerName} onChange={(e) => updateForm('decisionMakerName', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fonction</label>
                <input type="text" value={formData.decisionMakerFunction} onChange={(e) => updateForm('decisionMakerFunction', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" placeholder="Gérant, Directeur, etc." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mobile * (06/07)</label>
                <input type="tel" value={formData.decisionMakerMobile} onChange={(e) => updateForm('decisionMakerMobile', e.target.value)}
                  className={`w-full px-3 py-2 border rounded-lg ${formData.decisionMakerMobile && !validateMobile(formData.decisionMakerMobile) ? 'border-red-500' : ''}`}
                  placeholder="06 XX XX XX XX" />
                {formData.decisionMakerMobile && !validateMobile(formData.decisionMakerMobile) && (
                  <p className="text-red-500 text-xs mt-1">Format invalide (06/07 requis)</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input type="email" value={formData.decisionMakerEmail} onChange={(e) => updateForm('decisionMakerEmail', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input type="checkbox" id="hasAssociate" checked={formData.hasAssociate} onChange={(e) => updateForm('hasAssociate', e.target.checked)}
                className="rounded text-primary-600" />
              <label htmlFor="hasAssociate" className="text-sm">Présence d'un associé</label>
            </div>
            {formData.hasAssociate && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 ml-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom de l'associé</label>
                  <input type="text" value={formData.associateName} onChange={(e) => updateForm('associateName', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input type="tel" value={formData.associatePhone} onChange={(e) => updateForm('associatePhone', e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg" />
                </div>
              </div>
            )}

            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
              <input type="checkbox" id="isTabac" checked={formData.isTabacSubvention} onChange={(e) => updateForm('isTabacSubvention', e.target.checked)}
                className="rounded text-green-600" />
              <label htmlFor="isTabac" className="text-sm font-medium text-green-800">Dossier éligible subvention Tabac (10 000 €)</label>
            </div>
          </div>
        )}

        {step === 'need' && (
          <div className="space-y-6">
            <h2 className="text-lg font-semibold">Quel est le besoin principal ?</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { value: 'SECURITY', icon: Shield, label: 'Sécurité', desc: 'Vidéosurveillance, alarme, coffre-fort...', color: 'blue' },
                { value: 'DISPLAY', icon: Monitor, label: 'Affichage Dynamique', desc: 'Écrans, ThePlayerAI...', color: 'purple' },
                { value: 'MIXED', icon: Shuffle, label: 'Mixte', desc: 'Sécurité + Affichage', color: 'green' },
              ].map(({ value, icon: Icon, label, desc, color }) => (
                <button key={value} type="button" onClick={() => updateForm('need', value as FormData['need'])}
                  className={`p-6 rounded-lg border-2 text-left transition-all ${
                    formData.need === value ? `border-${color}-500 bg-${color}-50` : 'border-gray-200 hover:border-gray-300'
                  }`}>
                  <Icon className={`h-10 w-10 mb-3 text-${color}-600`} />
                  <h3 className="font-semibold text-gray-900">{label}</h3>
                  <p className="text-sm text-gray-500 mt-1">{desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 'security' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Qualification Sécurité</h2>
            {securityQuestions.filter(q => !q.parentId).map(renderQuestion)}
            {securityQuestions.filter(q => q.parentId).map(renderQuestion)}
          </div>
        )}

        {step === 'display' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Qualification Affichage Dynamique</h2>
            {displayQuestions.filter(q => !q.parentId).map(renderQuestion)}
            {displayQuestions.filter(q => q.parentId).map(renderQuestion)}
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t">
          <button type="button" onClick={handleBack} disabled={step === 'identification'}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50">
            <ChevronLeft className="h-5 w-5" /> Précédent
          </button>
          {isLastStep ? (
            <button type="button" onClick={handleSubmit} disabled={submitting}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50">
              {submitting ? 'Création...' : 'Terminer'}
            </button>
          ) : (
            <button type="button" onClick={handleNext}
              disabled={(step === 'identification' && !canProceedIdentification()) || (step === 'need' && !formData.need)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              Suivant <ChevronRight className="h-5 w-5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
