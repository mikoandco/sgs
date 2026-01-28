import React, { useState, useEffect } from 'react';
import { MapPin, Search, Filter, Building, Phone, Mail, ExternalLink } from 'lucide-react';
import { api } from '../services/api';

interface Prospect {
  id: string;
  companyName: string;
  address: string;
  postalCode: string;
  city: string;
  lat: number | null;
  lng: number | null;
  status: string;
  decisionMakerName: string;
  decisionMakerMobile: string;
  decisionMakerEmail: string | null;
}

interface ProspectMapProps {
  onSelectProspect?: (prospectId: string) => void;
}

// Simple France regions for visualization
const regions = [
  { name: 'Île-de-France', departments: ['75', '77', '78', '91', '92', '93', '94', '95'] },
  { name: 'Hauts-de-France', departments: ['02', '59', '60', '62', '80'] },
  { name: 'Grand Est', departments: ['08', '10', '51', '52', '54', '55', '57', '67', '68', '88'] },
  { name: 'Normandie', departments: ['14', '27', '50', '61', '76'] },
  { name: 'Bretagne', departments: ['22', '29', '35', '56'] },
  { name: 'Pays de la Loire', departments: ['44', '49', '53', '72', '85'] },
  { name: 'Centre-Val de Loire', departments: ['18', '28', '36', '37', '41', '45'] },
  { name: 'Bourgogne-Franche-Comté', departments: ['21', '25', '39', '58', '70', '71', '89', '90'] },
  { name: 'Nouvelle-Aquitaine', departments: ['16', '17', '19', '23', '24', '33', '40', '47', '64', '79', '86', '87'] },
  { name: 'Occitanie', departments: ['09', '11', '12', '30', '31', '32', '34', '46', '48', '65', '66', '81', '82'] },
  { name: 'Auvergne-Rhône-Alpes', departments: ['01', '03', '07', '15', '26', '38', '42', '43', '63', '69', '73', '74'] },
  { name: 'Provence-Alpes-Côte d\'Azur', departments: ['04', '05', '06', '13', '83', '84'] },
  { name: 'Corse', departments: ['2A', '2B'] },
];

const statusColors: Record<string, string> = {
  NEW: '#3b82f6',
  QUALIFYING: '#8b5cf6',
  QUALIFIED: '#10b981',
  APPOINTMENT_SCHEDULED: '#f59e0b',
  APPOINTMENT_DONE: '#f97316',
  QUOTE_SENT: '#06b6d4',
  SIGNED: '#22c55e',
  INSTALLATION_PENDING: '#84cc16',
  INSTALLED: '#16a34a',
  LOST: '#ef4444',
};

export const ProspectMap: React.FC<ProspectMapProps> = ({ onSelectProspect }) => {
  const [prospects, setProspects] = useState<Prospect[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRegion, setSelectedRegion] = useState<string | null>(null);
  const [selectedProspect, setSelectedProspect] = useState<Prospect | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchProspects();
  }, []);

  const fetchProspects = async () => {
    try {
      const res = await api.getProspects({ limit: '500' });
      setProspects((res as any).data || []);
    } catch (error) {
      console.error('Error fetching prospects:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRegionForPostalCode = (postalCode: string) => {
    const dept = postalCode.substring(0, 2);
    return regions.find(r => r.departments.includes(dept))?.name || 'Autre';
  };

  const filteredProspects = prospects.filter(p => {
    if (statusFilter !== 'all' && p.status !== statusFilter) return false;
    if (selectedRegion) {
      const region = getRegionForPostalCode(p.postalCode);
      if (region !== selectedRegion) return false;
    }
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        p.companyName.toLowerCase().includes(search) ||
        p.city.toLowerCase().includes(search) ||
        p.postalCode.includes(search)
      );
    }
    return true;
  });

  const prospectsByRegion = regions.map(region => ({
    ...region,
    count: prospects.filter(p => region.departments.includes(p.postalCode.substring(0, 2))).length,
  }));

  const prospectsByStatus = Object.entries(
    filteredProspects.reduce((acc, p) => {
      acc[p.status] = (acc[p.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-xl border p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, ville, code postal..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="pl-10 pr-8 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 appearance-none bg-white"
            >
              <option value="all">Tous les statuts</option>
              <option value="NEW">Nouveau</option>
              <option value="QUALIFYING">En qualification</option>
              <option value="QUALIFIED">Qualifié</option>
              <option value="APPOINTMENT_SCHEDULED">RDV planifié</option>
              <option value="QUOTE_SENT">Devis envoyé</option>
              <option value="SIGNED">Signé</option>
              <option value="INSTALLED">Installé</option>
              <option value="LOST">Perdu</option>
            </select>
          </div>

          {selectedRegion && (
            <button
              onClick={() => setSelectedRegion(null)}
              className="px-3 py-2 bg-blue-100 text-blue-700 rounded-lg flex items-center gap-2"
            >
              {selectedRegion}
              <span className="text-blue-500">&times;</span>
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Region list */}
        <div className="bg-white rounded-xl border p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par région</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {prospectsByRegion
              .sort((a, b) => b.count - a.count)
              .map(region => (
                <button
                  key={region.name}
                  onClick={() => setSelectedRegion(region.name === selectedRegion ? null : region.name)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg transition-colors ${
                    selectedRegion === region.name
                      ? 'bg-blue-100 border-blue-200 border'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-medium">{region.name}</span>
                  <span className={`px-2 py-1 rounded-full text-sm ${
                    region.count > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {region.count}
                  </span>
                </button>
              ))}
          </div>
        </div>

        {/* Prospects list */}
        <div className="lg:col-span-2 bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Prospects ({filteredProspects.length})
            </h3>
            <div className="flex items-center gap-2">
              {prospectsByStatus.slice(0, 5).map(([status, count]) => (
                <span
                  key={status}
                  className="px-2 py-1 rounded text-xs text-white"
                  style={{ backgroundColor: statusColors[status] || '#6b7280' }}
                >
                  {count}
                </span>
              ))}
            </div>
          </div>

          {filteredProspects.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">Aucun prospect trouvé</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredProspects.map(prospect => (
                <div
                  key={prospect.id}
                  className={`p-4 border rounded-lg hover:shadow-md transition-shadow cursor-pointer ${
                    selectedProspect?.id === prospect.id ? 'border-blue-500 bg-blue-50' : ''
                  }`}
                  onClick={() => setSelectedProspect(prospect)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div
                        className="w-3 h-3 rounded-full mt-1.5"
                        style={{ backgroundColor: statusColors[prospect.status] || '#6b7280' }}
                      />
                      <div>
                        <h4 className="font-medium text-gray-900">{prospect.companyName}</h4>
                        <p className="text-sm text-gray-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {prospect.address}, {prospect.postalCode} {prospect.city}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          {prospect.decisionMakerName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {prospect.decisionMakerMobile && (
                        <a
                          href={`tel:${prospect.decisionMakerMobile}`}
                          onClick={(e) => e.stopPropagation()}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <Phone className="w-4 h-4" />
                        </a>
                      )}
                      {onSelectProspect && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectProspect(prospect.id);
                          }}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Selected Prospect Details */}
      {selectedProspect && (
        <div className="bg-white rounded-xl border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Détails du prospect</h3>
            <button
              onClick={() => setSelectedProspect(null)}
              className="text-gray-500 hover:text-gray-700"
            >
              &times;
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <Building className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Entreprise</p>
                <p className="font-medium">{selectedProspect.companyName}</p>
                <p className="text-sm text-gray-600">{selectedProspect.address}</p>
                <p className="text-sm text-gray-600">{selectedProspect.postalCode} {selectedProspect.city}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Contact</p>
                <p className="font-medium">{selectedProspect.decisionMakerName}</p>
                <a href={`tel:${selectedProspect.decisionMakerMobile}`} className="text-blue-600">
                  {selectedProspect.decisionMakerMobile}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <p className="text-sm text-gray-500">Email</p>
                {selectedProspect.decisionMakerEmail ? (
                  <a href={`mailto:${selectedProspect.decisionMakerEmail}`} className="text-blue-600">
                    {selectedProspect.decisionMakerEmail}
                  </a>
                ) : (
                  <p className="text-gray-400">Non renseigné</p>
                )}
              </div>
            </div>
          </div>
          {onSelectProspect && (
            <div className="mt-4 pt-4 border-t">
              <button
                onClick={() => onSelectProspect(selectedProspect.id)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Voir la fiche complète
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ProspectMap;
