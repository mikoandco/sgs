import { useState, useEffect } from 'react';
import { HelpCircle, Plus, Edit2, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react';
import api from '../../services/api';
import type { QualificationQuestion } from '../../types';

const TYPE_LABELS: Record<string, string> = { YES_NO: 'Oui/Non', MULTIPLE_CHOICE: 'Choix multiple', TEXT: 'Texte', NUMBER: 'Nombre', SCALE: 'Échelle' };
const CATEGORY_LABELS: Record<string, string> = { SECURITY: 'Sécurité', DISPLAY: 'Affichage' };

export default function QuestionConfigPage() {
  const [tab, setTab] = useState<'SECURITY' | 'DISPLAY'>('SECURITY');
  const [questions, setQuestions] = useState<QualificationQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<QualificationQuestion | null>(null);
  const [formData, setFormData] = useState({ text: '', type: 'YES_NO', category: 'SECURITY', parentId: '', displayCondition: '', displayOrder: 0, required: true, options: '', active: true });

  useEffect(() => { loadQuestions(); }, [tab]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const res = await api.getQuestions({ category: tab });
      if (Array.isArray(res.data)) setQuestions(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const data = { ...formData, displayCondition: formData.displayCondition || undefined, parentId: formData.parentId || undefined, options: formData.options || undefined } as unknown as Partial<QualificationQuestion>;
      if (editingQuestion) await api.updateQuestion(editingQuestion.id, data);
      else await api.createQuestion(data);
      setShowModal(false); setEditingQuestion(null); resetForm(); loadQuestions();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => setFormData({ text: '', type: 'YES_NO', category: tab, parentId: '', displayCondition: '', displayOrder: questions.length + 1, required: true, options: '', active: true });

  const openEdit = (question: QualificationQuestion) => {
    setEditingQuestion(question);
    setFormData({ text: question.text, type: question.type, category: question.category, parentId: question.parentId || '', displayCondition: question.displayCondition || '', displayOrder: question.displayOrder, required: question.required, options: question.options || '', active: question.active });
    setShowModal(true);
  };

  const rootQuestions = questions.filter(q => !q.parentId).sort((a, b) => a.displayOrder - b.displayOrder);
  const getChildren = (parentId: string) => questions.filter(q => q.parentId === parentId).sort((a, b) => a.displayOrder - b.displayOrder);

  const renderQuestion = (question: QualificationQuestion, level = 0) => (
    <div key={question.id}>
      <div className={`flex items-center gap-3 p-3 border-b hover:bg-gray-50 ${level > 0 ? 'ml-8 border-l-2 border-primary-200' : ''}`}>
        <span className="text-sm text-gray-400 w-8">{question.displayOrder}.</span>
        <div className="flex-1">
          <p className="text-sm font-medium">{question.text}</p>
          {question.displayCondition && <p className="text-xs text-gray-500">Si parent = {JSON.parse(question.displayCondition).parentAnswer}</p>}
        </div>
        <span className={`px-2 py-0.5 text-xs rounded ${question.type === 'YES_NO' ? 'bg-blue-100 text-blue-800' : question.type === 'MULTIPLE_CHOICE' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
          {TYPE_LABELS[question.type]}
        </span>
        {question.required && <span className="text-red-500 text-xs">*</span>}
        <span className={`w-3 h-3 rounded-full ${question.active ? 'bg-green-500' : 'bg-gray-300'}`} />
        <div className="flex gap-1">
          <button className="p-1 hover:bg-gray-100 rounded"><ChevronUp className="h-4 w-4" /></button>
          <button className="p-1 hover:bg-gray-100 rounded"><ChevronDown className="h-4 w-4" /></button>
          <button onClick={() => openEdit(question)} className="p-1 hover:bg-gray-100 rounded text-primary-600"><Edit2 className="h-4 w-4" /></button>
          <button className="p-1 hover:bg-gray-100 rounded text-red-600"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>
      {getChildren(question.id).map(child => renderQuestion(child, level + 1))}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><HelpCircle className="h-7 w-7" /> Configuration des questions</h1>
        <button onClick={() => { resetForm(); setEditingQuestion(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="h-5 w-5" /> Nouvelle question
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b px-4">
          <nav className="flex gap-4">
            {(['SECURITY', 'DISPLAY'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 border-b-2 -mb-px ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
                {CATEGORY_LABELS[t]}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-4">
          {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : questions.length === 0 ? (
            <p className="text-center text-gray-500 py-12">Aucune question configurée</p>
          ) : (
            <div className="divide-y">{rootQuestions.map(q => renderQuestion(q))}</div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingQuestion ? 'Modifier la question' : 'Nouvelle question'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Texte de la question</label><input type="text" value={formData.text} onChange={(e) => setFormData({ ...formData, text: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Type</label><select value={formData.type} onChange={(e) => setFormData({ ...formData, type: e.target.value })} className="w-full px-3 py-2 border rounded-lg">{Object.entries(TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Catégorie</label><select value={formData.category} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="w-full px-3 py-2 border rounded-lg">{Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Question parente</label><select value={formData.parentId} onChange={(e) => setFormData({ ...formData, parentId: e.target.value })} className="w-full px-3 py-2 border rounded-lg"><option value="">Aucune (question racine)</option>{questions.filter(q => !q.parentId && q.id !== editingQuestion?.id).map(q => <option key={q.id} value={q.id}>{q.text}</option>)}</select></div>
              {formData.parentId && <div><label className="block text-sm font-medium mb-1">Condition d'affichage</label><input type="text" placeholder='ex: {"parentAnswer":"Oui"}' value={formData.displayCondition} onChange={(e) => setFormData({ ...formData, displayCondition: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>}
              {formData.type === 'MULTIPLE_CHOICE' && <div><label className="block text-sm font-medium mb-1">Options (JSON array)</label><input type="text" placeholder='["Option 1", "Option 2"]' value={formData.options} onChange={(e) => setFormData({ ...formData, options: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>}
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Ordre</label><input type="number" value={formData.displayOrder} onChange={(e) => setFormData({ ...formData, displayOrder: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div className="flex items-end gap-4">
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.required} onChange={(e) => setFormData({ ...formData, required: e.target.checked })} className="rounded" /> Obligatoire</label>
                  <label className="flex items-center gap-2"><input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="rounded" /> Active</label>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={handleSave} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
