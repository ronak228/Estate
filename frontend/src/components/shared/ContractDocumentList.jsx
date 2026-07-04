import { useState } from 'react';
import { FileText, Image, Trash2, CheckCircle, XCircle, Clock } from 'lucide-react';
import FileUploader from './FileUploader';
import Select from './Select';
import StatusBadge from './StatusBadge';
import ConfirmDialog from './ConfirmDialog';
import { formatDate, formatDateTime } from '../../utils/format';

const CONTRACT_DOCUMENT_TYPE_OPTIONS = [
  { value: 'SALE_AGREEMENT', label: 'Sale Agreement' },
  { value: 'ALLOTMENT_LETTER', label: 'Allotment Letter' },
  { value: 'NOC', label: 'NOC' },
  { value: 'TITLE_DEED', label: 'Title Deed' },
  { value: 'CUSTOMER_ID_PROOF', label: 'Customer ID Proof' },
  { value: 'CUSTOMER_ADDRESS_PROOF', label: 'Address Proof' },
  { value: 'LOAN_SANCTION_LETTER', label: 'Loan Sanction Letter' },
  { value: 'OTHER', label: 'Other' },
];

const SIGNATURE_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'REJECTED', label: 'Rejected' },
];

const SIGNATURE_ICONS = {
  PENDING: Clock,
  SIGNED: CheckCircle,
  REJECTED: XCircle,
};

const SIGNATURE_COLORS = {
  PENDING: 'text-gray-400',
  SIGNED: 'text-emerald-500',
  REJECTED: 'text-red-500',
};

/**
 * ContractDocumentList — upload, list, manage signature status, and delete contract documents.
 *
 * Props:
 *   documents       — ContractDocument[]
 *   onUpload        — async (file, type) => void
 *   onUpdateSignature — async (documentId, { signatureStatus, signedAt? }) => void
 *   onDelete        — async (documentId) => void
 *   uploading       — boolean
 *   uploadError     — string
 *   canManage       — boolean (ADMIN/MANAGER only — can update signature + delete)
 */
const ContractDocumentList = ({
  documents = [],
  onUpload,
  onUpdateSignature,
  onDelete,
  uploading = false,
  uploadError = '',
  canManage = false,
}) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [selectedType, setSelectedType] = useState('');
  const [typeError, setTypeError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [sigEditing, setSigEditing] = useState(null); // documentId being edited
  const [sigStatus, setSigStatus] = useState('');
  const [sigSubmitting, setSigSubmitting] = useState(false);
  const [sigError, setSigError] = useState('');

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

  const startSigEdit = (doc) => {
    setSigEditing(doc.id);
    setSigStatus(doc.signatureStatus);
    setSigError('');
  };

  const cancelSigEdit = () => {
    setSigEditing(null);
    setSigStatus('');
    setSigError('');
  };

  const handleSigSave = async (doc) => {
    if (!sigStatus) { setSigError('Please select a status'); return; }
    setSigSubmitting(true);
    setSigError('');
    try {
      await onUpdateSignature(doc.id, { signatureStatus: sigStatus });
      setSigEditing(null);
    } catch (err) {
      setSigError(err?.response?.data?.message || 'Failed to update signature status');
    } finally {
      setSigSubmitting(false);
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
        <p className="text-sm font-medium text-gray-700 mb-3">Upload Contract Document</p>

        <Select
          label="Document Type"
          name="contractDocType"
          value={selectedType}
          onChange={(e) => { setSelectedType(e.target.value); setTypeError(''); }}
          options={CONTRACT_DOCUMENT_TYPE_OPTIONS}
          placeholder="Select type..."
          error={typeError}
        />

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
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="flex items-center gap-2 text-sm font-medium text-white bg-primary hover:bg-primary-dark px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
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
            const SigIcon = SIGNATURE_ICONS[doc.signatureStatus] || Clock;
            const sigColor = SIGNATURE_COLORS[doc.signatureStatus] || 'text-gray-400';
            const isEditingThis = sigEditing === doc.id;

            return (
              <div
                key={doc.id}
                className="bg-white border border-gray-200 rounded-lg px-4 py-3"
              >
                <div className="flex items-start gap-3">
                  <FileIcon size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-0.5">
                      <StatusBadge value={doc.type} size="xs" />
                      <div className={`flex items-center gap-1 ${sigColor}`}>
                        <SigIcon size={11} />
                        <span className="text-xs font-medium">
                          {doc.signatureStatus === 'SIGNED'
                            ? `Signed${doc.signedAt ? ' · ' + formatDate(doc.signedAt) : ''}`
                            : doc.signatureStatus === 'REJECTED'
                            ? 'Rejected'
                            : 'Pending Signature'}
                        </span>
                      </div>
                      <span className="text-xs text-gray-400">
                        {doc.uploadedBy?.fullName || '—'} · {formatDate(doc.createdAt)}
                      </span>
                    </div>

                    {/* Signature status editor */}
                    {isEditingThis && canManage && (
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <Select
                          name="sigStatus"
                          value={sigStatus}
                          onChange={(e) => setSigStatus(e.target.value)}
                          options={SIGNATURE_STATUS_OPTIONS}
                          placeholder="Select status..."
                          error={sigError}
                        />
                        <button
                          type="button"
                          onClick={() => handleSigSave(doc)}
                          disabled={sigSubmitting}
                          className="text-xs font-medium text-white bg-primary hover:bg-primary-dark px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                        >
                          {sigSubmitting ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          type="button"
                          onClick={cancelSigEdit}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {canManage && !isEditingThis && (
                      <button
                        type="button"
                        onClick={() => startSigEdit(doc)}
                        className="p-1.5 rounded-lg text-xs text-gray-400 hover:text-primary hover:bg-primary/5 transition-colors"
                        title="Update signature status"
                      >
                        <CheckCircle size={15} />
                      </button>
                    )}
                    {canManage && (
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(doc)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                        title="Delete document"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-gray-400 text-center py-4">No contract documents uploaded yet.</p>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        title="Delete Contract Document"
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

export default ContractDocumentList;
