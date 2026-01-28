import React, { useState, useRef, useEffect } from 'react';
import {
  Camera,
  Upload,
  Mic,
  MicOff,
  Trash2,
  Image,
  FileText,
  MapPin,
  Plus,
  X,
  Check
} from 'lucide-react';
import { api } from '../services/api';

interface AuditPhoto {
  id: string;
  category: string;
  url: string;
  annotations: string | null;
  lat: number | null;
  lng: number | null;
  takenAt: string;
}

interface Document {
  id: string;
  type: string;
  name: string;
  url: string;
  createdAt: string;
}

interface AuditPanelProps {
  prospectId: string;
  onUpdate?: () => void;
}

const photoCategories = [
  { value: 'facade', label: 'Facade' },
  { value: 'interior', label: 'Int\u00e9rieur' },
  { value: 'technical', label: 'Technique' },
  { value: 'equipment', label: '\u00c9quipements existants' },
  { value: 'other', label: 'Autre' },
];

export const AuditPanel: React.FC<AuditPanelProps> = ({ prospectId, onUpdate }) => {
  const [photos, setPhotos] = useState<AuditPhoto[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('facade');
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<AuditPhoto | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [noteText, setNoteText] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchDocuments();
  }, [prospectId]);

  const fetchDocuments = async () => {
    try {
      const res = await api.getProspectDocuments(prospectId);
      const data = (res as any).data;
      setPhotos(data.auditPhotos || []);
      setDocuments(data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePhotoUpload = async (files: FileList | null, fromCamera: boolean = false) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      // Get current location
      let lat: number | undefined;
      let lng: number | undefined;

      if (navigator.geolocation) {
        try {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          lat = position.coords.latitude;
          lng = position.coords.longitude;
        } catch {
          console.log('Could not get location');
        }
      }

      for (const file of Array.from(files)) {
        await api.uploadAuditPhoto(file, prospectId, selectedCategory, lat, lng);
      }

      fetchDocuments();
      onUpdate?.();
    } catch (error) {
      console.error('Error uploading photo:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDocumentUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);

    try {
      for (const file of Array.from(files)) {
        await api.uploadFile(file, {
          prospectId,
          type: 'document',
          category: 'documents',
        });
      }

      fetchDocuments();
      onUpdate?.();
    } catch (error) {
      console.error('Error uploading document:', error);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (id: string) => {
    if (!confirm('Supprimer ce document ?')) return;

    try {
      await api.deleteDocument(id);
      fetchDocuments();
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting document:', error);
    }
  };

  const handleSaveNote = async () => {
    if (!noteText.trim()) return;

    try {
      await api.addTimelineEntry(prospectId, {
        type: 'NOTE',
        content: noteText,
      });
      setNoteText('');
      onUpdate?.();
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      // Stop recording (in a real app, handle audio recording stop)
      setIsRecording(false);
    } else {
      // Start recording
      setIsRecording(true);
      // In a real implementation, you would use the Web Audio API here
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Photos Section */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Photos d'audit
          </h3>
          <div className="flex items-center gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {photoCategories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Upload buttons */}
        <div className="flex gap-3 mb-4">
          <button
            onClick={() => cameraInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Camera className="w-4 h-4" />
            Prendre une photo
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            <Upload className="w-4 h-4" />
            Importer
          </button>
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(e) => handlePhotoUpload(e.target.files, true)}
            className="hidden"
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => handlePhotoUpload(e.target.files)}
            className="hidden"
          />
        </div>

        {uploading && (
          <div className="flex items-center gap-2 text-blue-600 mb-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            Upload en cours...
          </div>
        )}

        {/* Photos grid */}
        {photos.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <Image className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucune photo d'audit</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map(photo => (
              <div
                key={photo.id}
                className="relative group cursor-pointer"
                onClick={() => {
                  setSelectedPhoto(photo);
                  setShowPhotoModal(true);
                }}
              >
                <img
                  src={photo.url}
                  alt={photo.category}
                  className="w-full h-32 object-cover rounded-lg"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg" />
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                  <span className="px-2 py-1 bg-black bg-opacity-60 text-white text-xs rounded">
                    {photoCategories.find(c => c.value === photo.category)?.label || photo.category}
                  </span>
                  {photo.lat && photo.lng && (
                    <MapPin className="w-4 h-4 text-white" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Documents Section */}
      <div className="bg-white rounded-xl border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Documents
          </h3>
          <label className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 cursor-pointer">
            <Plus className="w-4 h-4" />
            Ajouter
            <input
              type="file"
              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
              multiple
              onChange={(e) => handleDocumentUpload(e.target.files)}
              className="hidden"
            />
          </label>
        </div>

        {documents.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Aucun document</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map(doc => (
              <div
                key={doc.id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="font-medium text-gray-900">{doc.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                  >
                    Voir
                  </a>
                  <button
                    onClick={() => handleDeleteDocument(doc.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notes Section */}
      <div className="bg-white rounded-xl border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notes
        </h3>

        <div className="space-y-4">
          <div className="flex gap-2">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Ajouter une note..."
              rows={3}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleRecording}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                isRecording
                  ? 'bg-red-600 text-white'
                  : 'border border-gray-300 hover:bg-gray-50'
              }`}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Arr\u00eater
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Note vocale
                </>
              )}
            </button>

            <button
              onClick={handleSaveNote}
              disabled={!noteText.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && selectedPhoto && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-[90vh] w-full mx-4">
            <button
              onClick={() => {
                setShowPhotoModal(false);
                setSelectedPhoto(null);
              }}
              className="absolute -top-10 right-0 text-white hover:text-gray-300"
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedPhoto.url}
              alt={selectedPhoto.category}
              className="w-full h-auto max-h-[80vh] object-contain rounded-lg"
            />
            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between bg-black bg-opacity-60 p-4 rounded-lg">
              <div>
                <p className="text-white font-medium">
                  {photoCategories.find(c => c.value === selectedPhoto.category)?.label}
                </p>
                <p className="text-gray-300 text-sm">
                  {new Date(selectedPhoto.takenAt).toLocaleString('fr-FR')}
                </p>
              </div>
              {selectedPhoto.lat && selectedPhoto.lng && (
                <div className="flex items-center gap-2 text-white">
                  <MapPin className="w-4 h-4" />
                  <span className="text-sm">
                    {selectedPhoto.lat.toFixed(4)}, {selectedPhoto.lng.toFixed(4)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditPanel;
