import { useState } from 'react';
import {
  X,
  UserPlus,
  RefreshCw,
  Download,
  Trash2,
  CheckSquare,
  AlertTriangle,
  Loader2
} from 'lucide-react';
import api from '../services/api';

interface BatchActionsProps {
  selectedIds: string[];
  onClear: () => void;
  onSuccess: () => void;
  users?: Array<{ id: string; firstName: string; lastName: string; role: string }>;
}

const STATUS_OPTIONS = [
  { value: 'NEW', label: 'Nouveau' },
  { value: 'QUALIFYING', label: 'En qualification' },
  { value: 'QUALIFIED', label: 'Qualifié' },
  { value: 'APPOINTMENT_SCHEDULED', label: 'RDV planifié' },
  { value: 'LOST', label: 'Perdu' },
];

export const BatchActions: React.FC<BatchActionsProps> = ({
  selectedIds,
  onClear,
  onSuccess,
  users = []
}) => {
  const [action, setAction] = useState<'status' | 'assign' | 'delete' | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);

  const handleBulkStatus = async () => {
    if (!selectedStatus) return;
    setLoading(true);
    try {
      await Promise.all(
        selectedIds.map(id => api.updateProspect(id, { status: selectedStatus as any }))
      );
      onSuccess();
      onClear();
      setAction(null);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAssign = async () => {
    if (!selectedUser) return;
    setLoading(true);
    try {
      await Promise.all(
        selectedIds.map(id => api.updateProspect(id, { commercialId: selectedUser }))
      );
      onSuccess();
      onClear();
      setAction(null);
    } catch (error) {
      console.error('Error assigning:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setLoading(true);
    try {
      // Note: This would need a bulk delete endpoint or iterate
      for (const id of selectedIds) {
        await api.updateProspect(id, { status: 'LOST' as any });
      }
      onSuccess();
      onClear();
      setShowConfirm(false);
      setAction(null);
    } catch (error) {
      console.error('Error deleting:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    api.exportProspects({ ids: selectedIds.join(',') });
    onClear();
  };

  const commercials = users.filter(u => u.role === 'COMMERCIAL' || u.role === 'ADMIN');

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
      <div className="bg-gray-900 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-4">
        {/* Selection count */}
        <div className="flex items-center gap-2 pr-4 border-r border-gray-700">
          <CheckSquare className="w-5 h-5 text-blue-400" />
          <span className="font-medium">{selectedIds.length} sélectionné{selectedIds.length > 1 ? 's' : ''}</span>
        </div>

        {/* Action buttons */}
        {!action && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setAction('status')}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Changer statut
            </button>
            <button
              onClick={() => setAction('assign')}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              Assigner
            </button>
            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Download className="w-4 h-4" />
              Exporter
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-2 px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Marquer perdus
            </button>
          </div>
        )}

        {/* Status selection */}
        {action === 'status' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Choisir un statut</option>
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <button
              onClick={handleBulkStatus}
              disabled={!selectedStatus || loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Appliquer'}
            </button>
            <button
              onClick={() => setAction(null)}
              className="p-1.5 hover:bg-gray-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Assign selection */}
        {action === 'assign' && (
          <div className="flex items-center gap-2">
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-1.5 text-sm"
            >
              <option value="">Choisir un commercial</option>
              {commercials.map(u => (
                <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
              ))}
            </select>
            <button
              onClick={handleBulkAssign}
              disabled={!selectedUser || loading}
              className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Assigner'}
            </button>
            <button
              onClick={() => setAction(null)}
              className="p-1.5 hover:bg-gray-700 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Clear button */}
        <button
          onClick={onClear}
          className="p-1.5 hover:bg-gray-700 rounded-lg ml-2"
          title="Tout désélectionner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Confirm delete modal */}
      {showConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Confirmer l'action</h3>
                <p className="text-sm text-gray-500">Cette action est irréversible</p>
              </div>
            </div>
            <p className="text-gray-600 mb-6">
              Voulez-vous vraiment marquer {selectedIds.length} prospect{selectedIds.length > 1 ? 's' : ''} comme perdu{selectedIds.length > 1 ? 's' : ''} ?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={loading}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Confirmer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchActions;
