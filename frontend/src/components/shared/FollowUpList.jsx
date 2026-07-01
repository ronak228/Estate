import { useState } from 'react';
import { CheckCircle, Clock, Plus } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import FormLayout from './FormLayout';
import EmptyState from './EmptyState';
import { formatDateTime } from '../../utils/format';

/**
 * FollowUpList — displays follow-ups for an inquiry and allows scheduling + completing them.
 */
const FollowUpList = ({ followUps = [], onSchedule, onComplete, canEdit = true }) => {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ scheduledAt: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.scheduledAt) { setError('Scheduled date/time is required'); return; }
    setSubmitting(true);
    try {
      await onSchedule({ scheduledAt: form.scheduledAt, notes: form.notes || undefined });
      setForm({ scheduledAt: '', notes: '' });
      setShowForm(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to schedule follow-up');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700">Follow-ups</h3>
        {canEdit && !showForm && (
          <Button variant="ghost" size="sm" icon={Plus} onClick={() => setShowForm(true)}>
            Schedule
          </Button>
        )}
      </div>

      {showForm && (
        <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <FormLayout
            onSubmit={handleSubmit}
            onCancel={() => { setShowForm(false); setForm({ scheduledAt: '', notes: '' }); }}
            submitLabel="Schedule"
            submitting={submitting}
          >
            <Input
              label="Scheduled At"
              name="scheduledAt"
              type="datetime-local"
              value={form.scheduledAt}
              onChange={handleChange}
              required
            />
            <Input
              label="Notes (optional)"
              name="notes"
              value={form.notes}
              onChange={handleChange}
              placeholder="What to discuss..."
            />
            {error && (
              <p className="text-xs text-red-600">{error}</p>
            )}
          </FormLayout>
        </div>
      )}

      {followUps.length === 0 ? (
        <EmptyState message="No follow-ups scheduled yet" icon={Clock} />
      ) : (
        <ul className="space-y-2">
          {followUps.map((fu) => (
            <FollowUpItem key={fu.id} followUp={fu} onComplete={onComplete} canEdit={canEdit} />
          ))}
        </ul>
      )}
    </div>
  );
};

const FollowUpItem = ({ followUp, onComplete, canEdit }) => {
  const [completing, setCompleting] = useState(false);
  const isCompleted = !!followUp.completedAt;

  const handleComplete = async () => {
    setCompleting(true);
    try {
      await onComplete(followUp.id, { completedAt: new Date().toISOString() });
    } finally {
      setCompleting(false);
    }
  };

  return (
    <li className={`flex items-start gap-3 p-3 rounded-lg border ${isCompleted ? 'bg-gray-50 border-gray-100' : 'bg-white border-gray-200'}`}>
      <div className={`mt-0.5 flex-shrink-0 ${isCompleted ? 'text-emerald-500' : 'text-amber-500'}`}>
        {isCompleted ? <CheckCircle size={16} /> : <Clock size={16} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800">
          {formatDateTime(followUp.scheduledAt)}
        </p>
        {followUp.notes && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{followUp.notes}</p>
        )}
        {isCompleted ? (
          <p className="text-xs text-emerald-600 mt-1">
            Completed {formatDateTime(followUp.completedAt)}
          </p>
        ) : (
          canEdit && (
            <Button
              variant="ghost"
              size="sm"
              loading={completing}
              onClick={handleComplete}
              className="mt-1 text-xs"
            >
              Mark Complete
            </Button>
          )
        )}
      </div>
    </li>
  );
};

export default FollowUpList;
