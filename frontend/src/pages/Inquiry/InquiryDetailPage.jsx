import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit } from 'lucide-react';
import inquiryService from '../../services/inquiryService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import Select from '../../components/shared/Select';
import FollowUpList from '../../components/shared/FollowUpList';
import ActivityTimeline from '../../components/shared/ActivityTimeline';
import AssignDropdown from '../../components/shared/AssignDropdown';
import InquiryForm from './InquiryForm';
import { formatDateTime } from '../../utils/format';

const STAGE_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'SITE_VISIT_SCHEDULED', label: 'Site Visit Scheduled' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
];

const InquiryDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [inquiry, setInquiry] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [users, setUsers] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [stageChanging, setStageChanging] = useState(false);
  const [stageChangeError, setStageChangeError] = useState('');

  const isManager = ['ADMIN', 'MANAGER'].includes(currentUser?.role);

  const fetchInquiry = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inquiryService.getInquiry(id);
      setInquiry(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inquiry');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await inquiryService.getAssignableUsers();
      setUsers(data);
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => {
    fetchInquiry();
    fetchUsers();
  }, [fetchInquiry, fetchUsers]);

  const handleStageChange = async (e) => {
    const stage = e.target.value;
    if (!stage || stage === inquiry.stage) return;
    setStageChanging(true);
    setStageChangeError('');
    try {
      const updated = await inquiryService.changeStage(id, stage);
      setInquiry((prev) => ({ ...prev, ...updated, followUps: prev.followUps, activities: prev.activities }));
      // Refresh to get updated activities
      fetchInquiry();
    } catch (err) {
      setStageChangeError(err.response?.data?.message || 'Failed to update stage');
    } finally {
      setStageChanging(false);
    }
  };

  const handleAssign = async (assignedToId) => {
    await inquiryService.assignInquiry(id, assignedToId);
    fetchInquiry();
  };

  const handleScheduleFollowUp = async (data) => {
    await inquiryService.createFollowUp(id, data);
    fetchInquiry();
  };

  const handleCompleteFollowUp = async (followUpId, data) => {
    await inquiryService.updateFollowUp(id, followUpId, data);
    fetchInquiry();
  };

  if (loading) return <PageLayout><LoadingState label="Loading inquiry..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchInquiry} /></PageLayout>;
  if (!inquiry) return null;

  return (
    <PageLayout>
      <PageHeader
        title={`Inquiry — ${inquiry.contact?.fullName || '—'}`}
        subtitle={`Created ${formatDateTime(inquiry.createdAt)} by ${inquiry.createdBy?.fullName}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/inquiries')}>
              Back
            </Button>
            <Button variant="outline" size="sm" icon={Edit} onClick={() => setEditOpen(true)}>
              Edit
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column: detail card + stage/assign controls ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Details card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Inquiry Details</h2>
            <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <div>
                <dt className="text-gray-500">Contact</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{inquiry.contact?.fullName || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Phone</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{inquiry.contact?.phone || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Email</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{inquiry.contact?.email || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Source</dt>
                <dd className="mt-0.5">
                  <StatusBadge value={inquiry.source} />
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Stage</dt>
                <dd className="mt-0.5">
                  <StatusBadge value={inquiry.stage} />
                </dd>
              </div>
              <div>
                <dt className="text-gray-500">Project</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{inquiry.project?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Broker</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{inquiry.broker?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-gray-500">Assigned To</dt>
                <dd className="font-medium text-gray-900 mt-0.5">{inquiry.assignedTo?.fullName || '—'}</dd>
              </div>
              {inquiry.notes && (
                <div className="col-span-2">
                  <dt className="text-gray-500">Notes</dt>
                  <dd className="font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">{inquiry.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Stage & Assign controls */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Controls</h2>
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">Stage:</span>
                <select
                  value={inquiry.stage}
                  onChange={handleStageChange}
                  disabled={stageChanging}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {stageChangeError && (
                  <span className="text-xs text-red-600">{stageChangeError}</span>
                )}
              </div>

              {isManager && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Assign:</span>
                  <AssignDropdown
                    users={users}
                    currentAssigneeId={inquiry.assignedToId}
                    onAssign={handleAssign}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Follow-ups */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <FollowUpList
              followUps={inquiry.followUps || []}
              onSchedule={handleScheduleFollowUp}
              onComplete={handleCompleteFollowUp}
              canEdit={true}
            />
          </div>
        </div>

        {/* ── Right column: activity timeline ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 h-fit">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Activity Timeline</h2>
          <ActivityTimeline activities={inquiry.activities || []} />
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Inquiry"
        size="lg"
      >
        <InquiryForm
          inquiry={inquiry}
          onSuccess={() => { setEditOpen(false); fetchInquiry(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default InquiryDetailPage;
