import { AlertTriangle } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/**
 * ConfirmDialog — Yes/No confirmation for destructive or irreversible actions.
 */
const ConfirmDialog = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  danger = false,
  confirmLabel = 'Confirm',
  loading = false,
  error = '',
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            onClick={onConfirm}
            loading={loading}
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-3 items-start">
        {danger && (
          <div className="flex-shrink-0 mt-0.5">
            <AlertTriangle size={20} className="text-red-500" />
          </div>
        )}
        <p className="text-sm text-gray-600">{message}</p>
      </div>
      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
    </Modal>
  );
};

export default ConfirmDialog;
