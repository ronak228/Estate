import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Edit, CheckCircle, Plus } from 'lucide-react';
import siteVisitService from '../../services/siteVisitService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import ConfirmDialog from '../../components/shared/ConfirmDialog';
import SiteVisitForm from './SiteVisitForm';
import QuotationForm from '../Quotation/QuotationForm';
import { formatDateTime } from '../../utils/format';

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
      setCompleteOpen(false);
      fetchSiteVisit();
    } catch (err) {
      setCompleteError(err.response?.data?.message || 'Failed to complete site visit');
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
                variant="outline"
                size="sm"
                icon={CheckCircle}
                onClick={() => { setCompleteError(''); setCompleteOpen(true); }}
                className="text-emerald-600 border-emerald-300 hover:bg-emerald-50"
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Visit Details */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Visit Details</h2>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-gray-500">Contact</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                <Link
                  to={`/contacts/${siteVisit.inquiry?.contact?.id}`}
                  className="text-primary hover:underline"
                >
                  {siteVisit.inquiry?.contact?.fullName || '—'}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Phone</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {siteVisit.inquiry?.contact?.phone || '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Status</dt>
              <dd className="mt-0.5">
                <StatusBadge value={siteVisit.status} />
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Scheduled At</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {formatDateTime(siteVisit.scheduledAt)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Inquiry Stage</dt>
              <dd className="mt-0.5">
                {siteVisit.inquiry ? (
                  <Link to={`/inquiries/${siteVisit.inquiry.id}`}>
                    <StatusBadge value={siteVisit.inquiry.stage} />
                  </Link>
                ) : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Scheduled By</dt>
              <dd className="font-medium text-gray-900 mt-0.5">
                {siteVisit.createdBy?.fullName || '—'}
              </dd>
            </div>
            {siteVisit.notes && (
              <div className="col-span-2">
                <dt className="text-gray-500">Notes</dt>
                <dd className="font-medium text-gray-900 mt-0.5 whitespace-pre-wrap">
                  {siteVisit.notes}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Interested Units — a customer may be interested in several units
            of the same property before deciding on one. */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">
            Interested Units {siteVisit.units?.length > 0 && `(${siteVisit.units.length})`}
          </h2>
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
        </div>
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
