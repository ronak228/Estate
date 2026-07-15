import { useState } from 'react';
import { Trash2, FileText, Image, Download, Upload } from 'lucide-react';
import FileUploader from './FileUploader';
import Select from './Select';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import Button from './Button';
import { formatDate } from '../../utils/format';

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'BOOKING_FORM', label: 'Booking Form' },
  { value: 'SIGNED_AGREEMENT', label: 'Signed Agreement' },
  { value: 'ID_PROOF', label: 'ID Proof' },
  { value: 'PAYMENT_PROOF', label: 'Payment Proof' },
  { value: 'OTHER', label: 'Other' },
];

/**
 * DocumentUploader — upload, list, and delete booking documents.
 * Wraps FileUploader with a type-selector and manages the document list inline.
 *
 * Props:
 *   documents      — array of BookingDocument rows
 *   onUpload       — async (file, type) => void
 *   onDelete       — async (documentId) => void
 *   uploading      — boolean
 *   uploadError    — string
 *   canDelete      — boolean (ADMIN/MANAGER only)
 */
const DocumentUploader = ({
  documents = [],
  onUpload,
  onDelete,
  onDownload,
  uploading = false,
  uploadError = '',
  canDelete = false,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [typeError, setTypeError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async () => {
    if (!selectedFile) return;
    if (!selectedType) { setTypeError('Document type is required'); return; }
    setTypeError('');
    await onUpload(selectedFile, selectedType);
    setSelectedFile(null);
    setSelectedType('');
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await onDelete(deleteTarget.id);
    } finally {
      setDeleting(false);
      setDeleteTarget(null);
    }
  };

  const getFileIcon = (fileName) => {
    if (!fileName) return FileText;
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'webp'].includes(ext)) return Image;
    return FileText;
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Upload zone */}
      <div className="bg-gray-50 rounded-xl border border-gray-200 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Upload New Document</p>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <Select
              label="Document Type"
              name="docType"
              value={selectedType}
              onChange={(e) => { setSelectedType(e.target.value); setTypeError(''); }}
              options={DOCUMENT_TYPE_OPTIONS}
              placeholder="Select type..."
              error={typeError}
            />
          </div>
        </div>

        <div className="mt-3">
          <FileUploader
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            maxSizeMb={10}
            onFileSelected={(file) => setSelectedFile(file)}
            label={selectedFile ? selectedFile.name : 'Click or drag PDF/image to upload'}
          />
        </div>

        {selectedFile && (
          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-gray-500 truncate max-w-xs">{selectedFile.name}</p>
            <Button size="sm" icon={Upload} loading={uploading} onClick={handleUpload}>
              {uploading ? 'Uploading...' : 'Upload'}
            </Button>
          </div>
        )}

        {uploadError && (
          <p className="text-xs text-red-600 mt-2">{uploadError}</p>
        )}
      </div>

      {/* Document list */}
      {documents.length > 0 ? (
        <div className="flex flex-col gap-2">
          {documents.map((doc) => {
            const FileIcon = getFileIcon(doc.fileName);
            return (
              <div
                key={doc.id}
                className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <FileIcon size={18} className="text-gray-400 flex-shrink-0" />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge value={doc.type} size="xs" />
                    <span className="text-xs text-gray-400">
                      {doc.uploadedBy?.fullName || '—'} · {formatDate(doc.createdAt)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    iconOnly
                    icon={Download}
                    onClick={() => onDownload?.(doc)}
                    title="View / Download"
                    aria-label={`Download ${doc.fileName}`}
                  />

                  {canDelete && (
                    <Button
                      variant="dangerGhost"
                      size="sm"
                      iconOnly
                      icon={Trash2}
                      onClick={() => setDeleteTarget(doc)}
                      title="Delete document"
                      aria-label={`Delete ${doc.fileName}`}
                    />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">No documents uploaded yet.</p>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Document"
        message={`Are you sure you want to delete "${deleteTarget?.fileName}"? This cannot be undone.`}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        danger
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
};

export default DocumentUploader;
