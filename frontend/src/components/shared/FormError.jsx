import { AlertCircle } from 'lucide-react';

/**
 * FormError — inline banner for a form-level (non-field) API error.
 * Replaces the repeated `bg-red-50 border border-red-200` block copy-pasted
 * across every form's `apiError` state.
 */
const FormError = ({ message, className = '' }) => {
  if (!message) return null;

  return (
    <div className={`flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 ${className}`}>
      <AlertCircle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
      <span>{message}</span>
    </div>
  );
};

export default FormError;
