import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, CheckCircle, Plus, User, Phone, Building2, StickyNote, Layers } from 'lucide-react';
import siteVisitService from '../../services/siteVisitService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import Card from '../../components/shared/Card';
import SiteVisitForm from './SiteVisitForm';
import QuotationForm from '../Quotation/QuotationForm';
import { showSuccess, getErrorMessage } from '../../lib/toast';
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

const SiteVisitDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [siteVisit, setSiteVisit] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editOpen, setEditOpen] = useState(false);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [completeError, setCompleteError] = useState('');
  const [quoteOpen, setQuoteOpen] = useState(false);

  const fetchSiteVisit = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await siteVisitService.getSiteVisit(id);
      setSiteVisit(data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load site visit');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchSiteVisit();
  }, [fetchSiteVisit]);

  if (loading) return <PageLayout><LoadingState label="Loading site visit..." /></PageLayout>;
  if (error) return <PageLayout><ErrorState message={error} onRetry={fetchSiteVisit} /></PageLayout>;
  if (!siteVisit) return null;

  const canEdit = ['SCHEDULED', 'RESCHEDULED'].includes(siteVisit.status);
  const canComplete = ['SCHEDULED', 'RESCHEDULED'].includes(siteVisit.status);
  const isCompleted = siteVisit.status === 'COMPLETED';

  const handleComplete = async () => {
    setCompleting(true);
    setCompleteError('');
    try {
      await siteVisitService.completeSiteVisit(siteVisit.id);
      showSuccess('Site visit marked as completed');
      setCompleteOpen(false);
      fetchSiteVisit();
    } catch (err) {
      setCompleteError(getErrorMessage(err, 'Failed to complete site visit'));
    } finally {
      setCompleting(false);
    }
  };

  return (
    <PageLayout>
      <PageHeader
        title={`Site Visit — ${siteVisit.inquiry?.contact?.fullName || '—'}`}
        subtitle={`Scheduled: ${formatDateTime(siteVisit.scheduledAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/site-visits')}>
              Back
            </Button>
            {canEdit && (
              <Button variant="outline" size="sm" icon={Edit} onClick={() => setEditOpen(true)}>
                Reschedule / Edit
              </Button>
            )}
            {canComplete && (
              <Button
                variant="successOutline"
                size="sm"
                icon={CheckCircle}
                onClick={() => { setCompleteError(''); setCompleteOpen(true); }}
              >
                Mark Complete
              </Button>
            )}
            {isCompleted && siteVisit.units?.length > 0 && (
              <Button size="sm" icon={Plus} onClick={() => setQuoteOpen(true)}>
                Create Quotation
              </Button>
            )}
          </div>
        }
      />

      {/* At-a-glance */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          <div className="mt-1.5"><StatusBadge value={siteVisit.status} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Units of Interest</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{siteVisit.units?.length ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Scheduled At</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5">{formatDateTime(siteVisit.scheduledAt)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Scheduled By</p>
          <p className="text-sm font-bold text-gray-900 mt-1.5">{siteVisit.createdBy?.fullName || '—'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Visit Details */}
        <Card
          title={
            <div className="flex items-center gap-3">
              <SectionIcon icon={User} />
              <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Visit Details</h2>
            </div>
          }
        >
          <dl className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
            <DetailField
              icon={User}
              label="Contact"
              value={
                <Link to={`/contacts/${siteVisit.inquiry?.contact?.id}`} className="text-primary hover:underline">
                  {siteVisit.inquiry?.contact?.fullName || '—'}
                </Link>
              }
            />
            <DetailField icon={Phone} label="Phone" value={siteVisit.inquiry?.contact?.phone || '—'} />
            <DetailField
              icon={Building2}
              label="Inquiry Stage"
              value={
                siteVisit.inquiry ? (
                  <Link to={`/inquiries/${siteVisit.inquiry.id}`}>
                    <StatusBadge value={siteVisit.inquiry.stage} />
                  </Link>
                ) : '—'
              }
            />
            {siteVisit.notes && (
              <DetailField
                icon={StickyNote}
                label="Notes"
                value={<span className="whitespace-pre-wrap font-medium text-gray-700">{siteVisit.notes}</span>}
                span
              />
            )}
          </dl>
        </Card>

        {/* Interested Units — a customer may be interested in several units
            of the same property before deciding on one. */}
        <Card
          title={
            <div className="flex items-center gap-3">
              <SectionIcon icon={Layers} />
              <h2 className="text-sm font-semibold text-gray-800 tracking-tight">
                Interested Units{siteVisit.units?.length > 0 ? ` (${siteVisit.units.length})` : ''}
              </h2>
            </div>
          }
        >
          {siteVisit.units?.length > 0 ? (
            <ul className="flex flex-col divide-y divide-gray-100">
              {siteVisit.units.map((unit) => (
                <li key={unit.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">
                      Unit {unit.unitNumber}
                      {unit.unitType ? <span className="text-gray-500 font-normal"> · {unit.unitType}</span> : ''}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {unit.project?.name || '—'}
                      {unit.floor != null ? ` · Floor ${unit.floor}` : ''}
                      {unit.area != null ? ` · ${Number(unit.area).toLocaleString('en-IN')} sq. ft.` : ''}
                    </p>
                  </div>
                  <StatusBadge value={unit.status} />
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-400">No units linked to this visit.</p>
          )}
        </Card>
      </div>

      {/* Edit / Reschedule Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Site Visit"
        size="lg"
      >
        <SiteVisitForm
          siteVisit={siteVisit}
          onSuccess={() => { setEditOpen(false); fetchSiteVisit(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Complete Confirmation */}
      <ConfirmDialog
        isOpen={completeOpen}
        onCancel={() => setCompleteOpen(false)}
        onConfirm={handleComplete}
        loading={completing}
        title="Mark Visit as Completed"
        message="This will mark the site visit as completed and log an activity on the inquiry. This action cannot be undone."
        confirmLabel="Mark Complete"
        error={completeError}
      />

      {/* Create Quotation Modal (opens after visit is completed) */}
      <Modal
        isOpen={quoteOpen}
        onClose={() => setQuoteOpen(false)}
        title="Create Quotation"
        size="xl"
      >
        <QuotationForm
          defaultInquiryId={siteVisit.inquiryId}
          onSuccess={() => {
            setQuoteOpen(false);
            navigate('/quotations');
          }}
          onCancel={() => setQuoteOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default SiteVisitDetailPage;
