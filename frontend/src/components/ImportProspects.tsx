import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Table,
  ArrowRight,
  X,
  RefreshCw
} from 'lucide-react';

interface ImportRow {
  rowNumber: number;
  data: Record<string, string>;
  status: 'valid' | 'warning' | 'error';
  errors: string[];
}

interface ImportStats {
  total: number;
  valid: number;
  warnings: number;
  errors: number;
}

const requiredFields = ['companyName', 'decisionMakerName', 'decisionMakerMobile', 'address', 'postalCode', 'city'];
const optionalFields = ['siret', 'activitySector', 'decisionMakerEmail', 'decisionMakerFunction', 'phone', 'need'];

const fieldLabels: Record<string, string> = {
  companyName: 'Nom de l\'entreprise',
  decisionMakerName: 'Nom du décisionnaire',
  decisionMakerMobile: 'Téléphone mobile',
  decisionMakerEmail: 'Email',
  decisionMakerFunction: 'Fonction',
  address: 'Adresse',
  postalCode: 'Code postal',
  city: 'Ville',
  siret: 'SIRET',
  activitySector: 'Secteur d\'activité',
  phone: 'Téléphone fixe',
  need: 'Besoin (SECURITY/DISPLAY/MIXED)'
};

export const ImportProspects: React.FC<{ onClose: () => void; onImportComplete: () => void }> = ({
  onClose,
  onImportComplete
}) => {
  const [step, setStep] = useState<'upload' | 'mapping' | 'preview' | 'importing' | 'complete'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [previewData, setPreviewData] = useState<ImportRow[]>([]);
  const [stats, setStats] = useState<ImportStats>({ total: 0, valid: 0, warnings: 0, errors: 0 });
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{ success: number; failed: number }>({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (text: string): string[][] => {
    const lines = text.split(/\r?\n/).filter(line => line.trim());
    return lines.map(line => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;

      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if ((char === ',' || char === ';') && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setFile(selectedFile);

    const text = await selectedFile.text();
    const rows = parseCSV(text);

    if (rows.length > 0) {
      setHeaders(rows[0]);

      // Auto-map columns based on header names
      const autoMapping: Record<string, string> = {};
      rows[0].forEach((header, index) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z]/g, '');

        // Try to match with known field names
        const allFields = [...requiredFields, ...optionalFields];
        for (const field of allFields) {
          const normalizedField = field.toLowerCase();
          if (normalizedHeader.includes(normalizedField) ||
              normalizedHeader.includes(fieldLabels[field]?.toLowerCase().replace(/[^a-z]/g, '') || '')) {
            autoMapping[field] = index.toString();
            break;
          }
        }

        // Common variations
        if (normalizedHeader.includes('societe') || normalizedHeader.includes('entreprise') || normalizedHeader.includes('raison')) {
          autoMapping['companyName'] = index.toString();
        }
        if (normalizedHeader.includes('nom') && !normalizedHeader.includes('societe')) {
          autoMapping['decisionMakerName'] = index.toString();
        }
        if (normalizedHeader.includes('mobile') || normalizedHeader.includes('portable')) {
          autoMapping['decisionMakerMobile'] = index.toString();
        }
        if (normalizedHeader.includes('email') || normalizedHeader.includes('mail')) {
          autoMapping['decisionMakerEmail'] = index.toString();
        }
        if (normalizedHeader.includes('adresse') && !normalizedHeader.includes('complement')) {
          autoMapping['address'] = index.toString();
        }
        if (normalizedHeader.includes('postal') || normalizedHeader.includes('cp')) {
          autoMapping['postalCode'] = index.toString();
        }
        if (normalizedHeader.includes('ville') || normalizedHeader.includes('city')) {
          autoMapping['city'] = index.toString();
        }
      });

      setMapping(autoMapping);
      setStep('mapping');
    }
  };

  const validateRow = (row: string[], rowNumber: number): ImportRow => {
    const data: Record<string, string> = {};
    const errors: string[] = [];

    // Map values
    Object.entries(mapping).forEach(([field, columnIndex]) => {
      const value = row[parseInt(columnIndex)] || '';
      data[field] = value;
    });

    // Validate required fields
    for (const field of requiredFields) {
      if (!data[field]?.trim()) {
        errors.push(`${fieldLabels[field]} manquant`);
      }
    }

    // Validate formats
    if (data.postalCode && !/^\d{5}$/.test(data.postalCode)) {
      errors.push('Code postal invalide (5 chiffres)');
    }

    if (data.decisionMakerEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.decisionMakerEmail)) {
      errors.push('Email invalide');
    }

    if (data.decisionMakerMobile && !/^0[67]\d{8}$/.test(data.decisionMakerMobile.replace(/\s/g, ''))) {
      errors.push('Numéro mobile invalide');
    }

    if (data.siret && !/^\d{14}$/.test(data.siret.replace(/\s/g, ''))) {
      errors.push('SIRET invalide (14 chiffres)');
    }

    if (data.need && !['SECURITY', 'DISPLAY', 'MIXED'].includes(data.need.toUpperCase())) {
      errors.push('Besoin doit être SECURITY, DISPLAY ou MIXED');
    }

    return {
      rowNumber,
      data,
      status: errors.length === 0 ? 'valid' : (errors.some(e => e.includes('manquant')) ? 'error' : 'warning'),
      errors
    };
  };

  const handleProceedToPreview = async () => {
    if (!file) return;

    const text = await file.text();
    const rows = parseCSV(text);

    // Skip header, process data rows
    const dataRows = rows.slice(1);
    const validatedRows = dataRows.map((row, index) => validateRow(row, index + 2));

    setPreviewData(validatedRows);
    setStats({
      total: validatedRows.length,
      valid: validatedRows.filter(r => r.status === 'valid').length,
      warnings: validatedRows.filter(r => r.status === 'warning').length,
      errors: validatedRows.filter(r => r.status === 'error').length
    });
    setStep('preview');
  };

  const handleImport = async () => {
    setStep('importing');
    setImporting(true);

    const validRows = previewData.filter(r => r.status !== 'error');
    let success = 0;
    let failed = 0;

    for (let i = 0; i < validRows.length; i++) {
      const row = validRows[i];
      try {
        // Simulate API call - in production, use api.createProspect
        await new Promise(resolve => setTimeout(resolve, 100));

        // api.createProspect({
        //   ...row.data,
        //   need: row.data.need?.toUpperCase() as 'SECURITY' | 'DISPLAY' | 'MIXED' | undefined
        // });

        success++;
      } catch (error) {
        failed++;
      }

      setImportProgress(Math.round(((i + 1) / validRows.length) * 100));
    }

    setImportResults({ success, failed });
    setImporting(false);
    setStep('complete');
  };

  const downloadTemplate = () => {
    const headers = [...requiredFields, ...optionalFields].map(f => fieldLabels[f]).join(';');
    const exampleRow = [
      'Tabac Presse Lyon',
      'Jean Dupont',
      '0612345678',
      'jean.dupont@email.com',
      'Gérant',
      '123 Rue du Commerce',
      '69001',
      'Lyon',
      '12345678901234',
      'Tabac',
      '0478123456',
      'SECURITY'
    ].join(';');

    const csv = `${headers}\n${exampleRow}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_import_prospects.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Import de prospects</h2>
              <p className="text-sm text-gray-500">Importez vos prospects depuis un fichier CSV</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            {['Fichier', 'Mapping', 'Aperçu', 'Import'].map((label, index) => {
              const steps = ['upload', 'mapping', 'preview', 'importing'];
              const currentIndex = steps.indexOf(step === 'complete' ? 'importing' : step);
              const isActive = index <= currentIndex;
              const isCurrent = index === currentIndex;

              return (
                <div key={label} className="flex items-center">
                  <div className={`flex items-center gap-2 ${isActive ? 'text-blue-600' : 'text-gray-400'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCurrent ? 'bg-blue-600 text-white' :
                      isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-200'
                    }`}>
                      {index + 1}
                    </div>
                    <span className="hidden sm:block text-sm font-medium">{label}</span>
                  </div>
                  {index < 3 && <ArrowRight className="w-4 h-4 mx-4 text-gray-300" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {step === 'upload' && (
            <div className="max-w-lg mx-auto space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium text-gray-700">Cliquez pour sélectionner un fichier</p>
                <p className="text-sm text-gray-500 mt-1">ou glissez-déposez votre fichier CSV ici</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 border-t border-gray-200" />
                <span className="text-sm text-gray-500">ou</span>
                <div className="flex-1 border-t border-gray-200" />
              </div>

              <button
                onClick={downloadTemplate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                <Download className="w-5 h-5" />
                Télécharger le modèle CSV
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-medium text-blue-900 mb-2">Format attendu</h4>
                <p className="text-sm text-blue-700">
                  Le fichier doit contenir au minimum : Nom de l'entreprise, Nom du décisionnaire,
                  Téléphone mobile, Adresse, Code postal et Ville.
                </p>
              </div>
            </div>
          )}

          {step === 'mapping' && (
            <div className="space-y-6">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                <FileText className="w-5 h-5 text-green-600" />
                <div>
                  <p className="font-medium text-green-800">{file?.name}</p>
                  <p className="text-sm text-green-600">{headers.length} colonnes détectées</p>
                </div>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-4">Associez les colonnes aux champs</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {requiredFields.map(field => (
                    <div key={field} className="flex items-center gap-3">
                      <label className="w-40 text-sm font-medium text-gray-700 flex items-center gap-1">
                        {fieldLabels[field]}
                        <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                        className={`flex-1 px-3 py-2 border rounded-lg ${
                          !mapping[field] ? 'border-red-300 bg-red-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">-- Sélectionner --</option>
                        {headers.map((header, index) => (
                          <option key={index} value={index}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                  {optionalFields.map(field => (
                    <div key={field} className="flex items-center gap-3">
                      <label className="w-40 text-sm text-gray-600">{fieldLabels[field]}</label>
                      <select
                        value={mapping[field] || ''}
                        onChange={(e) => setMapping({ ...mapping, [field]: e.target.value })}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                      >
                        <option value="">-- Ignorer --</option>
                        {headers.map((header, index) => (
                          <option key={index} value={index}>{header}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 'preview' && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                  <p className="text-sm text-gray-500">Total</p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-green-600">{stats.valid}</p>
                  <p className="text-sm text-green-600">Valides</p>
                </div>
                <div className="bg-yellow-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-yellow-600">{stats.warnings}</p>
                  <p className="text-sm text-yellow-600">Avertissements</p>
                </div>
                <div className="bg-red-50 rounded-lg p-4 text-center">
                  <p className="text-2xl font-bold text-red-600">{stats.errors}</p>
                  <p className="text-sm text-red-600">Erreurs</p>
                </div>
              </div>

              {/* Preview Table */}
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto max-h-64">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-12">#</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500 w-20">Statut</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Entreprise</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Décisionnaire</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Ville</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-500">Erreurs</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {previewData.slice(0, 50).map((row) => (
                        <tr key={row.rowNumber} className={
                          row.status === 'error' ? 'bg-red-50' :
                          row.status === 'warning' ? 'bg-yellow-50' : ''
                        }>
                          <td className="px-3 py-2 text-gray-500">{row.rowNumber}</td>
                          <td className="px-3 py-2">
                            {row.status === 'valid' && <CheckCircle className="w-5 h-5 text-green-500" />}
                            {row.status === 'warning' && <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                            {row.status === 'error' && <XCircle className="w-5 h-5 text-red-500" />}
                          </td>
                          <td className="px-3 py-2 font-medium">{row.data.companyName || '-'}</td>
                          <td className="px-3 py-2">{row.data.decisionMakerName || '-'}</td>
                          <td className="px-3 py-2">{row.data.city || '-'}</td>
                          <td className="px-3 py-2 text-xs text-red-600">
                            {row.errors.join(', ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {stats.errors > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    <strong>{stats.errors} ligne(s)</strong> contiennent des erreurs et ne seront pas importées.
                    Seules les lignes valides et avec avertissements seront traitées.
                  </p>
                </div>
              )}
            </div>
          )}

          {step === 'importing' && (
            <div className="max-w-md mx-auto text-center py-12">
              <RefreshCw className="w-16 h-16 mx-auto mb-6 text-blue-600 animate-spin" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Import en cours...</h3>
              <p className="text-gray-500 mb-6">Veuillez patienter pendant l'import de vos prospects</p>

              <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                <div
                  className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                  style={{ width: `${importProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-500">{importProgress}% terminé</p>
            </div>
          )}

          {step === 'complete' && (
            <div className="max-w-md mx-auto text-center py-12">
              <CheckCircle className="w-16 h-16 mx-auto mb-6 text-green-500" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Import terminé !</h3>
              <div className="flex items-center justify-center gap-8 my-6">
                <div className="text-center">
                  <p className="text-3xl font-bold text-green-600">{importResults.success}</p>
                  <p className="text-sm text-gray-500">Importés</p>
                </div>
                {importResults.failed > 0 && (
                  <div className="text-center">
                    <p className="text-3xl font-bold text-red-600">{importResults.failed}</p>
                    <p className="text-sm text-gray-500">Échecs</p>
                  </div>
                )}
              </div>
              <button
                onClick={() => {
                  onImportComplete();
                  onClose();
                }}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Voir les prospects
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        {!['importing', 'complete'].includes(step) && (
          <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
            <button
              onClick={() => {
                if (step === 'mapping') setStep('upload');
                else if (step === 'preview') setStep('mapping');
                else onClose();
              }}
              className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-100"
            >
              {step === 'upload' ? 'Annuler' : 'Retour'}
            </button>

            {step === 'mapping' && (
              <button
                onClick={handleProceedToPreview}
                disabled={!requiredFields.every(f => mapping[f])}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                Continuer
              </button>
            )}

            {step === 'preview' && (
              <button
                onClick={handleImport}
                disabled={stats.valid + stats.warnings === 0}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                Importer {stats.valid + stats.warnings} prospect(s)
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportProspects;
