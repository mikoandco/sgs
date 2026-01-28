import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, Save, Send, Package } from 'lucide-react';
import api from '../../services/api';
import type { Product, Kit, Prospect, Quote } from '../../types';

interface QuoteLine {
  productId: string;
  name: string;
  quantity: number;
  unitPriceHT: number;
  totalHT: number;
}

const FAMILY_LABELS: Record<string, string> = {
  SECURITY: 'Sécurité', MAINTENANCE: 'Maintenance', DISPLAY: 'Affichage Dynamique', WORKS: 'Travaux',
};

export default function QuoteEditorPage() {
  const { prospectId, id } = useParams();
  const navigate = useNavigate();
  const [prospect, setProspect] = useState<Prospect | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [lines, setLines] = useState<QuoteLine[]>([]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'LEASING'>('CASH');
  const [leasingOrganism, setLeasingOrganism] = useState('GRENKE');
  const [leasingDuration, setLeasingDuration] = useState(48);
  const [isTabacSubvention, setIsTabacSubvention] = useState(false);
  const [upsells, setUpsells] = useState({ maintenance: false, telesurv: false, warranty: false, player: false });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');

  useEffect(() => {
    loadData();
  }, [prospectId, id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, kitsRes] = await Promise.all([api.getProducts(), api.getKits()]);
      setProducts(productsRes.data || []);
      setKits(kitsRes.data || []);
      if (prospectId) {
        const prospectRes = await api.getProspect(prospectId);
        setProspect(prospectRes.data);
        setIsTabacSubvention(prospectRes.data.isTabacSubvention || false);
      }
      if (id) {
        const quoteRes = await api.getQuote(id);
        const quote = quoteRes.data;
        setProspect(quote.prospect);
        setLines(quote.lines?.map((l: { product: Product; quantity: number; unitPriceHT: number; totalHT: number }) => ({
          productId: l.product.id, name: l.product.name, quantity: l.quantity, unitPriceHT: l.unitPriceHT, totalHT: l.totalHT
        })) || []);
        setDiscount(quote.discountPercent || 0);
        setPaymentMode(quote.paymentMode || 'CASH');
        setIsTabacSubvention(quote.isTabacSubvention || false);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    const existing = lines.find(l => l.productId === product.id);
    if (existing) {
      setLines(lines.map(l => l.productId === product.id ? { ...l, quantity: l.quantity + 1, totalHT: (l.quantity + 1) * l.unitPriceHT } : l));
    } else {
      setLines([...lines, { productId: product.id, name: product.name, quantity: 1, unitPriceHT: product.unitPriceHT, totalHT: product.unitPriceHT }]);
    }
  };

  const applyKit = (kit: Kit) => {
    const newLines = kit.items?.map((item: { product: Product; quantity: number }) => ({
      productId: item.product.id, name: item.product.name, quantity: item.quantity, unitPriceHT: item.product.unitPriceHT, totalHT: item.quantity * item.product.unitPriceHT
    })) || [];
    setLines([...lines, ...newLines]);
  };

  const updateLine = (index: number, field: 'quantity' | 'unitPriceHT', value: number) => {
    setLines(lines.map((l, i) => i === index ? { ...l, [field]: value, totalHT: field === 'quantity' ? value * l.unitPriceHT : l.quantity * value } : l));
  };

  const removeLine = (index: number) => setLines(lines.filter((_, i) => i !== index));

  const subtotal = lines.reduce((sum, l) => sum + l.totalHT, 0);
  const discountAmount = subtotal * discount / 100;
  const totalHT = subtotal - discountAmount;
  const tva = totalHT * 0.2;
  const totalTTC = totalHT + tva;
  const depositPercent = totalHT > 5000 ? 30 : 20;
  const depositAmount = totalTTC * depositPercent / 100;
  const monthlyPayment = paymentMode === 'LEASING' ? totalTTC / leasingDuration : 0;

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFamily = !selectedFamily || p.family === selectedFamily;
    return matchSearch && matchFamily;
  });

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const handleSave = async (asDraft = true) => {
    setSaving(true);
    try {
      const data = {
        prospectId: prospect?.id,
        lines: lines.map(l => ({ productId: l.productId, quantity: l.quantity, unitPriceHT: l.unitPriceHT })),
        discountPercent: discount,
        paymentMode,
        isTabacSubvention,
        ...(paymentMode === 'LEASING' && { leasingOrganism, leasingDuration }),
      };
      if (id) {
        await api.updateQuote(id, data);
      } else {
        const res = await api.createQuote(data);
        navigate(`/quotes/${res.data.id}`);
        return;
      }
      if (!asDraft) navigate(`/quotes/${id}`);
    } catch (err) {
      console.error('Error saving quote:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-lg"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{id ? 'Modifier le devis' : 'Nouveau devis'}</h1>
          {prospect && <p className="text-gray-500">{prospect.companyName} - {prospect.city}</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Catalogue</h2>
            <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg mb-3" />
            <select value={selectedFamily} onChange={(e) => setSelectedFamily(e.target.value)} className="w-full px-3 py-2 border rounded-lg mb-3">
              <option value="">Toutes les familles</option>
              {Object.entries(FAMILY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {filteredProducts.map(product => (
                <div key={product.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded cursor-pointer" onClick={() => addProduct(product)}>
                  <div>
                    <div className="text-sm font-medium">{product.name}</div>
                    <div className="text-xs text-gray-500">{product.reference}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(product.unitPriceHT)}</div>
                    <button className="text-primary-600"><Plus className="h-4 w-4" /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="font-semibold mb-3 flex items-center gap-2"><Package className="h-5 w-5" /> Kits</h2>
            <div className="space-y-2">
              {kits.map(kit => (
                <button key={kit.id} onClick={() => applyKit(kit)} className="w-full text-left p-3 bg-primary-50 rounded-lg hover:bg-primary-100">
                  <div className="font-medium text-primary-700">{kit.name}</div>
                  <div className="text-xs text-primary-600">{kit.items?.length} produits</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Panier</h2>
            {lines.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Ajoutez des produits depuis le catalogue</p>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="pb-2">Désignation</th>
                    <th className="pb-2 w-20">Qté</th>
                    <th className="pb-2 w-28">Prix unit.</th>
                    <th className="pb-2 w-28 text-right">Total HT</th>
                    <th className="pb-2 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={index} className="border-b">
                      <td className="py-2 text-sm">{line.name}</td>
                      <td className="py-2">
                        <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(index, 'quantity', Number(e.target.value))}
                          className="w-16 px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="py-2">
                        <input type="number" step="0.01" value={line.unitPriceHT} onChange={(e) => updateLine(index, 'unitPriceHT', Number(e.target.value))}
                          className="w-24 px-2 py-1 border rounded text-sm" />
                      </td>
                      <td className="py-2 text-right text-sm font-medium">{formatCurrency(line.totalHT)}</td>
                      <td className="py-2"><button onClick={() => removeLine(index)} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            <div className="mt-4 pt-4 border-t">
              <div className="flex items-center gap-4 mb-4">
                <label className="text-sm">Remise (%):</label>
                <input type="number" min="0" max="100" value={discount} onChange={(e) => setDiscount(Number(e.target.value))}
                  className="w-20 px-2 py-1 border rounded" />
              </div>
              <div className="space-y-1 text-right">
                <div className="flex justify-end gap-8"><span className="text-gray-500">Sous-total HT:</span><span>{formatCurrency(subtotal)}</span></div>
                {discount > 0 && <div className="flex justify-end gap-8 text-red-600"><span>Remise ({discount}%):</span><span>-{formatCurrency(discountAmount)}</span></div>}
                <div className="flex justify-end gap-8 font-medium"><span className="text-gray-500">Total HT:</span><span>{formatCurrency(totalHT)}</span></div>
                <div className="flex justify-end gap-8"><span className="text-gray-500">TVA (20%):</span><span>{formatCurrency(tva)}</span></div>
                <div className="flex justify-end gap-8 text-lg font-bold"><span>Total TTC:</span><span className="text-primary-600">{formatCurrency(totalTTC)}</span></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Options complémentaires</h2>
            <div className="space-y-2">
              {[{ key: 'maintenance', label: 'Contrat maintenance annuelle', price: 480 },
                { key: 'telesurv', label: 'Télésurveillance 24/7', price: 30, monthly: true },
                { key: 'warranty', label: 'Extension garantie 5 ans', price: 590 },
                { key: 'player', label: 'ThePlayerAI - Licence', price: 600 }].map(opt => (
                <label key={opt.key} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={upsells[opt.key as keyof typeof upsells]} onChange={(e) => setUpsells({ ...upsells, [opt.key]: e.target.checked })}
                      className="rounded text-primary-600" />
                    <span>{opt.label}</span>
                  </div>
                  <span className="font-medium">{formatCurrency(opt.price)}{opt.monthly ? '/mois' : ''}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border p-4">
            <h2 className="font-semibold mb-3">Mode de paiement</h2>
            <div className="flex gap-4 mb-4">
              {(['CASH', 'LEASING'] as const).map(mode => (
                <button key={mode} onClick={() => setPaymentMode(mode)}
                  className={`flex-1 p-3 rounded-lg border-2 ${paymentMode === mode ? 'border-primary-500 bg-primary-50' : 'border-gray-200'}`}>
                  {mode === 'CASH' ? 'Comptant' : 'Leasing'}
                </button>
              ))}
            </div>
            {paymentMode === 'CASH' ? (
              <div className="p-3 bg-yellow-50 rounded-lg">
                <p className="text-sm"><strong>Acompte requis:</strong> {depositPercent}% soit {formatCurrency(depositAmount)}</p>
                <p className="text-xs text-yellow-700 mt-1">Chèque uniquement</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm mb-1">Organisme</label>
                  <select value={leasingOrganism} onChange={(e) => setLeasingOrganism(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
                    <option value="GRENKE">Grenke</option>
                    <option value="LOCAM">Locam</option>
                    <option value="OTHER">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1">Durée</label>
                  <select value={leasingDuration} onChange={(e) => setLeasingDuration(Number(e.target.value))} className="w-full px-3 py-2 border rounded-lg">
                    {[36, 48, 60, 63].map(d => <option key={d} value={d}>{d} mois</option>)}
                  </select>
                </div>
                <div className="p-3 bg-green-50 rounded-lg">
                  <p className="text-sm"><strong>Mensualité estimée:</strong> {formatCurrency(monthlyPayment)}/mois</p>
                </div>
              </div>
            )}

            {isTabacSubvention && (
              <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800 font-medium">Éligible subvention Tabac</p>
                <p className="text-xs text-green-700">Montant éligible estimé: jusqu'à 10 000 €</p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => navigate(-1)} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">Annuler</button>
            <button onClick={() => handleSave(true)} disabled={saving || lines.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50">
              <Save className="h-5 w-5" /> Enregistrer brouillon
            </button>
            <button onClick={() => handleSave(false)} disabled={saving || lines.length === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50">
              <Send className="h-5 w-5" /> Valider
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
