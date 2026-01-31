import { useState, useEffect } from 'react';
import { Package, Plus, Edit2, X } from 'lucide-react';
import api from '../../services/api';
import type { Product, Kit } from '../../types';

const FAMILY_LABELS: Record<string, string> = { SECURITY: 'Sécurité', MAINTENANCE: 'Maintenance', DISPLAY: 'Affichage', WORKS: 'Travaux' };
const FAMILY_COLORS: Record<string, string> = { SECURITY: 'bg-blue-100 text-blue-800', MAINTENANCE: 'bg-green-100 text-green-800', DISPLAY: 'bg-purple-100 text-purple-800', WORKS: 'bg-orange-100 text-orange-800' };

export default function ProductListPage() {
  const [tab, setTab] = useState<'products' | 'kits'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [familyFilter, setFamilyFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({ reference: '', name: '', family: 'SECURITY', unitPriceHT: 0, purchasePrice: 0, unit: 'pièce', laborHours: 0, active: true });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [productsRes, kitsRes] = await Promise.all([api.getProducts(), api.getKits()]);
      if (Array.isArray(productsRes.data)) setProducts(productsRes.data);
      if (Array.isArray(kitsRes.data)) setKits(kitsRes.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
      const dataToSave = { ...formData } as unknown as Partial<Product>;
      if (editingProduct) await api.updateProduct(editingProduct.id, dataToSave);
      else await api.createProduct(dataToSave);
      setShowModal(false); setEditingProduct(null); resetForm(); loadData();
    } catch (err) { console.error(err); }
  };

  const resetForm = () => setFormData({ reference: '', name: '', family: 'SECURITY', unitPriceHT: 0, purchasePrice: 0, unit: 'pièce', laborHours: 0, active: true });

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({ reference: product.reference, name: product.name, family: product.family, unitPriceHT: product.unitPriceHT, purchasePrice: product.purchasePrice || 0, unit: product.unit, laborHours: product.laborHours || 0, active: product.active });
    setShowModal(true);
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const filteredProducts = products.filter(p => {
    const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase()) || p.reference.toLowerCase().includes(searchTerm.toLowerCase());
    const matchFamily = !familyFilter || p.family === familyFilter;
    return matchSearch && matchFamily;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2"><Package className="h-7 w-7" /> Catalogue Produits</h1>
        <button onClick={() => { resetForm(); setEditingProduct(null); setShowModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700">
          <Plus className="h-5 w-5" /> {tab === 'products' ? 'Nouveau produit' : 'Nouveau kit'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b px-4">
          <nav className="flex gap-4">
            {(['products', 'kits'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-3 border-b-2 -mb-px ${tab === t ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500'}`}>
                {t === 'products' ? 'Produits' : 'Kits'}
              </button>
            ))}
          </nav>
        </div>

        {tab === 'products' && (
          <div className="p-4">
            <div className="flex gap-4 mb-4">
              <input type="text" placeholder="Rechercher..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-3 py-2 border rounded-lg flex-1" />
              <select value={familyFilter} onChange={(e) => setFamilyFilter(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="">Toutes familles</option>
                {Object.entries(FAMILY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>

            {loading ? <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600" /></div> : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Référence</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Désignation</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Famille</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix HT</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Prix achat</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Unité</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actif</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredProducts.map(product => (
                    <tr key={product.id}>
                      <td className="px-4 py-3 text-sm font-mono">{product.reference}</td>
                      <td className="px-4 py-3 text-sm">{product.name}</td>
                      <td className="px-4 py-3"><span className={`px-2 py-1 text-xs rounded-full ${FAMILY_COLORS[product.family]}`}>{FAMILY_LABELS[product.family]}</span></td>
                      <td className="px-4 py-3 text-sm text-right">{formatCurrency(product.unitPriceHT)}</td>
                      <td className="px-4 py-3 text-sm text-right text-gray-500">{formatCurrency(product.purchasePrice || 0)}</td>
                      <td className="px-4 py-3 text-sm text-center">{product.unit}</td>
                      <td className="px-4 py-3 text-center">{product.active ? <span className="text-green-600">✓</span> : <span className="text-red-600">✗</span>}</td>
                      <td className="px-4 py-3 text-center"><button onClick={() => openEdit(product)} className="text-primary-600 hover:text-primary-800"><Edit2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'kits' && (
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {kits.map(kit => (
                <div key={kit.id} className="border rounded-lg p-4">
                  <h3 className="font-semibold">{kit.name}</h3>
                  <p className="text-sm text-gray-500">{kit.description}</p>
                  <p className="text-sm mt-2">{kit.items?.length || 0} produits</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">{editingProduct ? 'Modifier le produit' : 'Nouveau produit'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 hover:bg-gray-100 rounded"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Référence</label><input type="text" value={formData.reference} onChange={(e) => setFormData({ ...formData, reference: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Famille</label><select value={formData.family} onChange={(e) => setFormData({ ...formData, family: e.target.value })} className="w-full px-3 py-2 border rounded-lg">{Object.entries(FAMILY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></div>
              </div>
              <div><label className="block text-sm font-medium mb-1">Désignation</label><input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-3 py-2 border rounded-lg" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Prix HT</label><input type="number" step="0.01" value={formData.unitPriceHT} onChange={(e) => setFormData({ ...formData, unitPriceHT: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
                <div><label className="block text-sm font-medium mb-1">Prix achat</label><input type="number" step="0.01" value={formData.purchasePrice} onChange={(e) => setFormData({ ...formData, purchasePrice: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-sm font-medium mb-1">Unité</label><select value={formData.unit} onChange={(e) => setFormData({ ...formData, unit: e.target.value })} className="w-full px-3 py-2 border rounded-lg"><option value="pièce">Pièce</option><option value="forfait">Forfait</option><option value="m2">m²</option><option value="heure">Heure</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Heures MO</label><input type="number" step="0.5" value={formData.laborHours} onChange={(e) => setFormData({ ...formData, laborHours: Number(e.target.value) })} className="w-full px-3 py-2 border rounded-lg" /></div>
              </div>
              <label className="flex items-center gap-2"><input type="checkbox" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="rounded" /> Actif</label>
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
