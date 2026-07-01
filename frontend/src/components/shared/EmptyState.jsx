import { Inbox } from 'lucide-react';
import Button from './Button';

/**
 * EmptyState — friendly placeholder for empty lists, timelines, and document lists.
 */
const EmptyState = ({ message = 'No records found', icon: Icon, actionLabel, onAction }) => {
  const IconComponent = Icon || Inbox;

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center mb-4">
        <IconComponent size={24} className="text-gray-400" />
      </div>
      <p className="text-sm text-gray-500 mb-4">{message}</p>
      {actionLabel && onAction && (
        <Button variant="outline" size="sm" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
    </div>
  );
};

export default EmptyState;
