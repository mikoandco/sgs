import { useState, useEffect } from 'react';
import { Settings, Plus, Edit2, X, Save } from 'lucide-react';
import api from '../../services/api';

const FAMILY_LABELS: Record<string, string> = { SECURITY: 'Sécurité', MAINTENANCE: 'Maintenance', DISPLAY: 'Affichage', WORKS: 'Travaux' };
const REWARD_TYPE_LABELS: Record<string, string> = { discount: 'Réduction', voucher: "Bon d'achat", free_month: 'Mois offert', fixed_amount: 'Montant fixe' };

interface CommissionRule {
  id: string;
  name: string;
  productFamily: string;
  ratePercent: number;
  tierMinCA?: number;
  tierMaxCA?: number;
  tierBonusPercent?: number;
  maintenanceMultiplier?: number;
  active: boolean;
}

interface ReferralConfig {
  id?: string;
  active: boolean;
  rewardType: string;
  rewardValue: number;
  commercialBonusFixed?: number;
  commercialBonusPercent?: number;
  requireFullPayment: boolean;
}

export default function CommissionConfigPage() {
  const [rules, setRules] = useState<CommissionRule[]>([]);
  const [referralConfig, setReferralConfig] = useState<ReferralConfig>({ active: true, rewardType: 'fixed_amount', rewardValue: 100, commercialBonusFixed: 50, commercialBonusPercent: 2, requireFullPayment: true });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState<CommissionRule | null>(null);
  const [formData, setFormData] = useState({ name: '', productFamily: 'SECURITY', ratePercent: 0, tierMinCA: 0, tierMaxCA: 0, tierBonusPercent: 0, maintenanceMultiplier: 0, active: true });
  const [savingReferral, setSavingReferral] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rulesRes, configRes] = await Promise.all([api.getCommissionRules(), api.getReferralConfig()]);
      if (Array.isArray(rulesRes.data)) setRules(rulesRes.data);
      if (configRes.data && typeof configRes.data === 'object') setReferralConfig(configRes.data as ReferralConfig);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSaveRule = async () => {
    try {
      if (editingRule) await api.updateCommissionRule(editingRule.id, formData);
      else await api.createCommissionRule(formData);
      setShowModal(false); setEditingRule(null); resetForm(); loadData();
    } catch (err) { console.error(err); }
  };

  const handleSaveReferral = async () => {
    try {
      setSavingReferral(true);
      await api.updateReferralConfig(referralConfig as unknown as Record<string, unknown>);
    } catch (err) { console.error(err); }
    finally { setSavingReferral(false); }
  };

  const resetForm = () => setFormData({ name: '', productFamily: 'SECURITY', ratePercent: 0, tierMinCA: 0, tierMaxCA: 0, tierBonusPercent: 0, maintenanceMultiplier: 0, active: true });

  const openEdit = (rule: CommissionRule) => {
    setEditingRule(rule);
    setFormData({ name: rule.name, productFamily: rule.productFamily, ratePercent: rule.ratePercent, tierMinCA: rule.tierMinCA || 0, tierMaxCA: rule.tierMaxCA || 0, tierBonusPercent: rule.tierBonusPercent || 0, maintenanceMultiplier: rule.maintenanceMultiplier || 0, active: rule.active });
    setShowModal(true);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Settings className="h-7 w-7" /> Configuration des commissions</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Règles de commission</h2>
            <button onClick={() => { resetForm(); setEditingRule(null); setShowModal(true); }} className="flex items-center gap-1 px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700">
              <Plus className="h-4 w-4" /> Ajouter
            </button>
          </div>
          {loading ? <div className="flex justify-center py-8"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-2 text-left">Nom</th>
                  <th className="px-3 py-2 text-left">Famille</th>
                  <th className="px-3 py-2 text-right">Taux</th>
                  <th className="px-3 py-2 text-center">Palier</th>
                  <th className="px-3 py-2 text-center">Actif</th>
                  <th className="px-3 py-2"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rules.map(rule => (
                  <tr key={rule.id}>
                    <td className="px-3 py-2">{rule.name}</td>
                    <td className="px-3 py-2"><span className="px-2 py-0.5 bg-gray-100 rounded text-xs">{FAMILY_LABELS[rule.productFamily]}</span></td>
                    <td className="px-3 py-2 text-right">{rule.ratePercent}%</td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {rule.tierMinCA || rule.tierMaxCA ? `${formatCurrency(rule.tierMinCA || 0)} - ${rule.tierMaxCA ? formatCurrency(rule.tierMaxCA) : '∞'}` : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">{rule.active ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                    <td className="px-3 py-2"><button onClick={() => openEdit(rule)} className="text-primary-600"><Edit2 className="h-4 w-4" /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm border p-4">
          <h2 className="font-semibold mb-4">Configuration parrainage</h2>
          <div className="space-y-4">
            <label className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span>Système de parrainage actif</span>
              <input type="checkbox" checked={referralConfig.active} onChange={(e) => setReferralConfig({ ...referralConfig, active: e.target.checked })} className="rounded text-primary-600 w-5 h-5" />
            </label>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type de récompense</label>
                <select value={referralConfig.rewardType} onChange={(e) => setReferralConfig({ ...referralConfig, rewardType: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                  {Object.entries(REWARD_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Valeur ({referralConfig.rewardType === 'discount' ? '%' : '€'})</label>
                <input type="number" value={referralConfig.rewardValue} onChange={(e) => setReferralConfig({ ...referralConfig, rewardValue: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <hr />
            <h3 className="font-medium text-sm text-gray-700">Bonus commercial</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Prime fixe (€)</label>
                <input type="number" value={referralConfig.commercialBonusFixed || 0} onChange={(e) => setReferralConfig({ ...referralConfig, commercialBonusFixed: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bonus commission (%)</label>
                <input type="number" step="0.1" value={referralConfig.commercialBonusPercent || 0} onChange={(e) => setReferralConfig({ ...referralConfig, commercialBonusPercent: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" />
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input type="checkbox" checked={referralConfig.requireFullPayment} onChange={(e) => setReferralConfig({ ...referralConfig, requireFullPayment: e.target.checked })} className="rounded" />
              <span className="text-sm">Exiger paiement complet pour valider</span>
            </label>

            <button onClick={handleSaveReferral} disabled={savingReferral} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              <Save className="h-5 w-5" /> {savingReferral ? 'Enregistrement...' : 'Enregistrer la configuration'}
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingRule ? 'Modifier la règle' : 'Nouvelle règle'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div><label className="block text-sm font-medium mb-1">Nom</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Famille</label><select value={formData.productFamily} onChange={(e) => setFormData({ ...formData, productFamily: e.target.value })} className="w-full px-3 py-2 border rounded-lg">{Object.entries(FAMILY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
                <div><label className="block text-sm font-medium mb-1">Taux (%)</label><input type="number" step="0.1" value={formData.ratePercent} onChange={(e) => setFormData({ ...formData, ratePercent: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-sm font-medium mb-1">Palier min (€)</label><input type="number" value={formData.tierMinCA} onChange={(e) => setFormData({ ...formData, tierMinCA: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Palier max (€)</label><input type="number" value={formData.tierMaxCA} onChange={(e) => setFormData({ ...formData, tierMaxCA: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Bonus (%)</label><input type="number" step="0.1" value={formData.tierBonusPercent} onChange={(e) => setFormData({ ...formData, tierBonusPercent: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              {formData.productFamily === 'MAINTENANCE' && (
                <div><label className="block text-sm font-medium mb-1">Multiplicateur maintenance</label><input type="number" value={formData.maintenanceMultiplier} onChange={(e) => setFormData({ ...formData, maintenanceMultiplier: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" placeholder="ex: 6 = 6 × mensualité" /></div>
              )}
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="rounded" /> Actif</label>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
              <button onClick={handleSaveRule} className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">Enregistrer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
