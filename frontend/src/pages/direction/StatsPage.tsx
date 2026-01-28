import { useState } from 'react';
import { BarChart3, Users, FileText, TrendingUp, UserPlus, Target } from 'lucide-react';

type Tab = 'teleprospection' | 'commercial' | 'pipeline' | 'referrals' | 'global';

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('teleprospection');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const formatCurrency = (amount: number) => new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(amount);

  const tabs = [
    { id: 'teleprospection', label: 'Téléprospection', icon: Users },
    { id: 'commercial', label: 'Commercial', icon: FileText },
    { id: 'pipeline', label: 'Pipeline', icon: TrendingUp },
    { id: 'referrals', label: 'Parrainage', icon: UserPlus },
    { id: 'global', label: 'Global', icon: Target },
  ] as const;

  // Mock data for demonstration
  const mockData = {
    teleprospection: {
      kpis: [
        { label: 'Appels', value: 342, trend: '+12%' },
        { label: 'Prospects créés', value: 87, trend: '+8%' },
        { label: 'RDV planifiés', value: 45, trend: '+15%' },
        { label: 'Taux de conversion', value: '52%', trend: '+3%' },
      ],
      bySDR: [
        { name: 'Lucas Petit', prospects: 42, rdv: 22, conversion: '52%' },
        { name: 'Emma Moreau', prospects: 45, rdv: 23, conversion: '51%' },
      ],
    },
    commercial: {
      kpis: [
        { label: 'Devis créés', value: 38, trend: '+5%' },
        { label: 'Signatures', value: 24, trend: '+10%' },
        { label: 'CA signé', value: formatCurrency(185000), trend: '+18%' },
        { label: 'Panier moyen', value: formatCurrency(7708), trend: '+7%' },
      ],
      byCommercial: [
        { name: 'Pierre Martin', devis: 20, signatures: 14, ca: 95000, conversion: '70%', referralRate: '12%' },
        { name: 'Sophie Bernard', devis: 18, signatures: 10, ca: 90000, conversion: '56%', referralRate: '8%' },
      ],
    },
    pipeline: [
      { stage: 'Qualifié', count: 45, value: 337500, color: 'bg-yellow-500' },
      { stage: 'RDV planifié', count: 32, value: 240000, color: 'bg-blue-500' },
      { stage: 'Devis envoyé', count: 18, value: 135000, color: 'bg-purple-500' },
      { stage: 'Signé', count: 12, value: 90000, color: 'bg-green-500' },
      { stage: 'Validé', count: 8, value: 60000, color: 'bg-green-600' },
      { stage: 'Installé', count: 24, value: 180000, color: 'bg-green-700' },
    ],
    referrals: {
      kpis: [
        { label: 'Total parrainages', value: 18 },
        { label: 'Taux de parrainage', value: '15%' },
        { label: 'CA parrainé', value: formatCurrency(45000) },
        { label: 'Récompenses versées', value: formatCurrency(2700) },
      ],
      topParrains: [
        { name: 'Tabac du Centre', filleuls: 4, ca: 15000 },
        { name: 'Café de la Gare', filleuls: 3, ca: 12000 },
        { name: 'Presse du Marché', filleuls: 2, ca: 8000 },
      ],
    },
    global: {
      ca: [
        { label: 'Mois en cours', value: 85000 },
        { label: 'Trimestre', value: 245000 },
        { label: 'Année', value: 890000 },
      ],
      families: [
        { name: 'Sécurité', percentage: 65, value: 578500 },
        { name: 'Maintenance', percentage: 18, value: 160200 },
        { name: 'Affichage', percentage: 12, value: 106800 },
        { name: 'Travaux', percentage: 5, value: 44500 },
      ],
    },
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BarChart3 className="h-7 w-7" /> Statistiques & Reporting
        </h1>
        <div className="flex gap-4">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="px-3 py-2 border rounded-lg" />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="border-b px-4">
          <nav className="flex gap-4">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 -mb-px ${activeTab === tab.id ? 'border-primary-600 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                <tab.icon className="h-5 w-5" /> {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'teleprospection' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockData.teleprospection.kpis.map(kpi => (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-green-600">{kpi.trend}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Par SDR</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">SDR</th>
                      <th className="px-4 py-2 text-right text-sm">Prospects</th>
                      <th className="px-4 py-2 text-right text-sm">RDV</th>
                      <th className="px-4 py-2 text-right text-sm">Conversion</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.teleprospection.bySDR.map(sdr => (
                      <tr key={sdr.name} className="border-b">
                        <td className="px-4 py-3">{sdr.name}</td>
                        <td className="px-4 py-3 text-right">{sdr.prospects}</td>
                        <td className="px-4 py-3 text-right">{sdr.rdv}</td>
                        <td className="px-4 py-3 text-right">{sdr.conversion}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'commercial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockData.commercial.kpis.map(kpi => (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                    <p className="text-xs text-green-600">{kpi.trend}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Par Commercial</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">Commercial</th>
                      <th className="px-4 py-2 text-right text-sm">Devis</th>
                      <th className="px-4 py-2 text-right text-sm">Signatures</th>
                      <th className="px-4 py-2 text-right text-sm">CA</th>
                      <th className="px-4 py-2 text-right text-sm">Conversion</th>
                      <th className="px-4 py-2 text-right text-sm">Parrainage</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.commercial.byCommercial.map(c => (
                      <tr key={c.name} className="border-b">
                        <td className="px-4 py-3">{c.name}</td>
                        <td className="px-4 py-3 text-right">{c.devis}</td>
                        <td className="px-4 py-3 text-right">{c.signatures}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(c.ca)}</td>
                        <td className="px-4 py-3 text-right">{c.conversion}</td>
                        <td className="px-4 py-3 text-right">{c.referralRate}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'pipeline' && (
            <div className="space-y-4">
              {mockData.pipeline.map(stage => (
                <div key={stage.stage} className="flex items-center gap-4">
                  <div className="w-32 text-sm font-medium">{stage.stage}</div>
                  <div className="flex-1 h-8 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${stage.color}`} style={{ width: `${(stage.count / 45) * 100}%` }} />
                  </div>
                  <div className="w-20 text-right text-sm">{stage.count}</div>
                  <div className="w-32 text-right text-sm font-medium">{formatCurrency(stage.value)}</div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'referrals' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mockData.referrals.kpis.map(kpi => (
                  <div key={kpi.label} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">{kpi.label}</p>
                    <p className="text-2xl font-bold">{kpi.value}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Top Parrains</h3>
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm">Client</th>
                      <th className="px-4 py-2 text-right text-sm">Filleuls</th>
                      <th className="px-4 py-2 text-right text-sm">CA généré</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockData.referrals.topParrains.map(p => (
                      <tr key={p.name} className="border-b">
                        <td className="px-4 py-3">{p.name}</td>
                        <td className="px-4 py-3 text-right">{p.filleuls}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(p.ca)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'global' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                {mockData.global.ca.map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-500">{item.label}</p>
                    <p className="text-2xl font-bold text-primary-600">{formatCurrency(item.value)}</p>
                  </div>
                ))}
              </div>
              <div>
                <h3 className="font-semibold mb-3">Répartition par famille</h3>
                <div className="space-y-3">
                  {mockData.global.families.map(f => (
                    <div key={f.name} className="flex items-center gap-4">
                      <div className="w-28 text-sm">{f.name}</div>
                      <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-primary-500" style={{ width: `${f.percentage}%` }} />
                      </div>
                      <div className="w-12 text-right text-sm">{f.percentage}%</div>
                      <div className="w-28 text-right text-sm font-medium">{formatCurrency(f.value)}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
