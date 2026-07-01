import {
  Plus,
  UserCheck,
  RefreshCw,
  ArrowRightCircle,
  CalendarClock,
  CheckCircle2,
  MessageSquare,
  XCircle,
} from 'lucide-react';
import EmptyState from './EmptyState';
import { formatDateTime } from '../../utils/format';

/**
 * ActivityTimeline — ordered list of ActivityLog entries for an Inquiry.
 */

const ACTIVITY_ICON = {
  CREATED: Plus,
  ASSIGNED: UserCheck,
  REASSIGNED: RefreshCw,
  STAGE_CHANGED: ArrowRightCircle,
  FOLLOW_UP_SCHEDULED: CalendarClock,
  FOLLOW_UP_COMPLETED: CheckCircle2,
  NOTE_ADDED: MessageSquare,
  MARKED_NOT_INTERESTED: XCircle,
};

const ACTIVITY_COLOR = {
  CREATED: 'bg-primary text-white',
  ASSIGNED: 'bg-sky-500 text-white',
  REASSIGNED: 'bg-violet-500 text-white',
  STAGE_CHANGED: 'bg-amber-500 text-white',
  FOLLOW_UP_SCHEDULED: 'bg-blue-500 text-white',
  FOLLOW_UP_COMPLETED: 'bg-emerald-500 text-white',
  NOTE_ADDED: 'bg-gray-400 text-white',
  MARKED_NOT_INTERESTED: 'bg-red-500 text-white',
};

const ActivityTimeline = ({ activities = [] }) => {
  if (activities.length === 0) {
    return <EmptyState message="No activity yet" />;
  }

  return (
    <ol className="relative border-l border-gray-200 ml-4 space-y-4">
      {activities.map((activity) => {
        const Icon = ACTIVITY_ICON[activity.type] || MessageSquare;
        const colorClass = ACTIVITY_COLOR[activity.type] || 'bg-gray-400 text-white';

        return (
          <li key={activity.id} className="ml-4">
            {/* Dot */}
            <span
              className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full ${colorClass}`}
            >
              <Icon size={10} />
            </span>

            <div className="p-3 bg-white border border-gray-100 rounded-lg shadow-sm">
              <p className="text-sm text-gray-800">{activity.description}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs text-gray-400">
                  {activity.performedBy?.fullName || 'System'}
                </span>
                <span className="text-gray-200">•</span>
                <span className="text-xs text-gray-400">{formatDateTime(activity.createdAt)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
};

export default ActivityTimeline;
