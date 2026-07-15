import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, User, Phone, Mail, Building2, Briefcase, SlidersHorizontal, Activity, StickyNote } from 'lucide-react';
import inquiryService from '../../services/inquiryService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge, { StatusDot } from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import Select from '../../components/shared/Select';
import FollowUpList from '../../components/shared/FollowUpList';
import ActivityTimeline from '../../components/shared/ActivityTimeline';
import AssignDropdown from '../../components/shared/AssignDropdown';
import Card from '../../components/shared/Card';
import InquiryForm from './InquiryForm';
import { showSuccess, showError, getErrorMessage } from '../../lib/toast';
import { formatDateTime } from '../../utils/format';

const SectionIcon = ({ icon: Icon }) => (
  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
    <Icon size={17} />
  </div>
);

const DetailField = ({ icon: Icon, label, value, span }) => (
  <div className={span ? 'col-span-2' : undefined}>
    <dt className="text-[11px] text-gray-400 flex items-center gap-1.5">
      <Icon size={12} className="text-gray-400" />
      {label}
    </dt>
    <dd className="font-semibold text-gray-800 mt-1">{value}</dd>
  </div>
);

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
      showSuccess('Stage updated');
      // Refresh to get updated activities
      fetchInquiry();
    } catch (err) {
      const message = getErrorMessage(err, 'Failed to update stage');
      setStageChangeError(message);
      showError(message);
    } finally {
      setStageChanging(false);
    }
  };

  // These three are awaited inside child components (AssignDropdown /
  // FollowUpList) that already have their own inline error handling on
  // rejection — re-throw after toasting so that handling still runs.
  const handleAssign = async (assignedToId) => {
    try {
      await inquiryService.assignInquiry(id, assignedToId);
      showSuccess('Inquiry reassigned');
      fetchInquiry();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to reassign inquiry'));
      throw err;
    }
  };

  const handleScheduleFollowUp = async (data) => {
    try {
      await inquiryService.createFollowUp(id, data);
      showSuccess('Follow-up scheduled');
      fetchInquiry();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to schedule follow-up'));
      throw err;
    }
  };

  const handleCompleteFollowUp = async (followUpId, data) => {
    try {
      await inquiryService.updateFollowUp(id, followUpId, data);
      showSuccess('Follow-up updated');
      fetchInquiry();
    } catch (err) {
      showError(getErrorMessage(err, 'Failed to update follow-up'));
      throw err;
    }
  };

  if (loading) return <PageLayout><LoadingState label="Loading inquiry..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchInquiry} /></PageLayout>;
  if (!inquiry) return null;

  const daysOpen = Math.max(0, Math.floor((Date.now() - new Date(inquiry.createdAt)) / 86400000));

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

      {/* At-a-glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Stage</p>
          <div className="mt-1.5"><StatusBadge value={inquiry.stage} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Source</p>
          <div className="mt-1.5"><StatusBadge value={inquiry.source} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Assigned To</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5">{inquiry.assignedTo?.fullName || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Days Open</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{daysOpen} day{daysOpen === 1 ? '' : 's'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">

        {/* ── Left column: detail card + stage/assign controls ── */}
        <div className="lg:col-span-2 space-y-4">

          {/* Details card */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={User} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Inquiry Details</h2>
              </div>
            }
          >
            <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailField icon={User} label="Contact" value={inquiry.contact?.fullName || '—'} />
              <DetailField icon={Phone} label="Phone" value={inquiry.contact?.phone || '—'} />
              <DetailField icon={Mail} label="Email" value={inquiry.contact?.email || '—'} />
              <DetailField icon={Building2} label="Project" value={inquiry.project?.name || '—'} />
              <DetailField icon={Briefcase} label="Broker" value={inquiry.broker?.name || '—'} />
              {inquiry.notes && (
                <DetailField
                  icon={StickyNote}
                  label="Notes"
                  value={<span className="whitespace-pre-wrap font-medium text-gray-700">{inquiry.notes}</span>}
                  span
                />
              )}
            </dl>
          </Card>

          {/* Stage & Assign controls */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={SlidersHorizontal} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Pipeline Controls</h2>
              </div>
            }
          >
            <div className="flex items-center gap-2.5 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5 mb-4">
              <StatusDot value={inquiry.stage} />
              <div>
                <p className="text-[10.5px] text-gray-400 leading-none">Current stage</p>
                <p className="text-sm font-bold text-gray-800 mt-0.5">
                  {STAGE_OPTIONS.find((o) => o.value === inquiry.stage)?.label || inquiry.stage}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-4 items-start">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1.5">Update stage</label>
                <select
                  value={inquiry.stage}
                  onChange={handleStageChange}
                  disabled={stageChanging}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50"
                >
                  {STAGE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                {stageChangeError && (
                  <p className="text-xs text-red-600 mt-1">{stageChangeError}</p>
                )}
              </div>

              {isManager && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1.5">Reassign</label>
                  <AssignDropdown
                    users={users}
                    currentAssigneeId={inquiry.assignedToId}
                    onAssign={handleAssign}
                  />
                </div>
              )}
            </div>
          </Card>

          {/* Follow-ups */}
          <Card>
            <FollowUpList
              followUps={inquiry.followUps || []}
              onSchedule={handleScheduleFollowUp}
              onComplete={handleCompleteFollowUp}
              canEdit={true}
            />
          </Card>
        </div>

        {/* ── Right column: activity timeline — sticky rail ── */}
        <Card
          className="h-fit lg:sticky lg:top-6"
          title={
            <div className="flex items-center gap-3">
              <SectionIcon icon={Activity} />
              <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Activity Timeline</h2>
            </div>
          }
        >
          <ActivityTimeline activities={inquiry.activities || []} />
        </Card>
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
