import {
  Phone,
  Users,
  MessageSquare,
  Mail,
  StickyNote,
  Plus,
} from 'lucide-react';
import EmptyState from './EmptyState';
import Button from './Button';
import StatusBadge from './StatusBadge';
import { formatDateTime } from '../../utils/format';

/**
 * InteractionLog — timeline-style list of interactions for a Contact.
 * Visually consistent with ActivityTimeline from Module 1.
 */

const TYPE_ICON = {
  CALL: Phone,
  MEETING: Users,
  WHATSAPP: MessageSquare,
  EMAIL: Mail,
  NOTE: StickyNote,
};

const TYPE_COLOR = {
  CALL: 'bg-sky-500 text-white',
  MEETING: 'bg-violet-500 text-white',
  WHATSAPP: 'bg-green-500 text-white',
  EMAIL: 'bg-blue-500 text-white',
  NOTE: 'bg-gray-400 text-white',
};

const InteractionLog = ({ interactions = [], onAdd, canAdd = true }) => {
  if (interactions.length === 0) {
    return (
      <div>
        {canAdd && (
          <div className="flex justify-end mb-3">
            <Button variant="ghost" size="sm" icon={Plus} onClick={onAdd}>
              Log Interaction
            </Button>
          </div>
        )}
        <EmptyState message="No interactions logged yet" icon={MessageSquare} />
      </div>
    );
  }

  return (
    <div>
      {canAdd && (
        <div className="flex justify-end mb-3">
          <Button variant="ghost" size="sm" icon={Plus} onClick={onAdd}>
            Log Interaction
          </Button>
        </div>
      )}

      <ol className="relative border-l border-gray-200 ml-4 space-y-4">
        {interactions.map((interaction) => {
          const Icon = TYPE_ICON[interaction.type] || MessageSquare;
          const colorClass = TYPE_COLOR[interaction.type] || 'bg-gray-400 text-white';

          return (
            <li key={interaction.id} className="ml-4">
              <span
                className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ${colorClass}`}
              >
                <Icon size={10} />
              </span>

              <div className="p-3 bg-white border border-gray-100 rounded-lg">
                <div className="flex items-center gap-2 mb-1">
                  <StatusBadge value={interaction.type} />
                  {interaction.inquiry && (
                    <span className="text-xs text-gray-400">
                      Inquiry: <StatusBadge value={interaction.inquiry.stage} size="xs" />
                    </span>
                  )}
                </div>
                <p className="text-sm text-gray-800">{interaction.notes}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-400">
                    {interaction.createdBy?.fullName || 'Unknown'}
                  </span>
                  <span className="text-gray-200">•</span>
                  <span className="text-xs text-gray-400">
                    {formatDateTime(interaction.occurredAt)}
                  </span>
                </div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export default InteractionLog;
