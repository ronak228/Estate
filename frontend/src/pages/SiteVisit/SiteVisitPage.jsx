import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, CalendarCheck } from 'lucide-react';
import siteVisitService from '../../services/siteVisitService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ErrorState from '../../components/shared/ErrorState';
import SiteVisitForm from './SiteVisitForm';
import { formatDateTime } from '../../utils/format';

const STATUS_FILTER_OPTIONS = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'RESCHEDULED', label: 'Rescheduled' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const SiteVisitPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);

  const fetchSiteVisits = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await siteVisitService.listSiteVisits({
        status: filters.status || undefined,
        from: filters.from || undefined,
        to: filters.to || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load site visits');
    } finally {
      setLoading(false);
    }
  }, [filters.status, filters.from, filters.to, page, pageSize]);

  useEffect(() => {
    fetchSiteVisits();
  }, [fetchSiteVisits]);

  const columns = [
    {
      key: 'inquiry',
      label: 'Contact',
      render: (inquiry) => (
        <div>
          <p className="font-medium text-gray-900">
            {inquiry?.contact?.fullName || '—'}
          </p>
          <p className="text-xs text-gray-500">{inquiry?.contact?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'scheduledAt',
      label: 'Scheduled',
      render: (val) => formatDateTime(val),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: 'units',
      label: 'Units',
      render: (units) =>
        units && units.length > 0 ? (
          <div>
            <p className="font-medium text-gray-900">
              {units.map((u) => u.unitNumber).join(', ')}
            </p>
            <p className="text-xs text-gray-500">{units[0].project?.name}</p>
          </div>
        ) : (
          '—'
        ),
    },
    {
      key: 'createdBy',
      label: 'Scheduled By',
      render: (createdBy) => createdBy?.fullName || '—',
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Site Visits"
        subtitle="Schedule and track property visits"
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            Schedule Visit
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <FilterBar
          filters={[
            {
              key: 'status',
              label: 'All Statuses',
              type: 'select',
              options: STATUS_FILTER_OPTIONS,
            },
            {
              key: 'from',
              label: 'From',
              type: 'date',
            },
            {
              key: 'to',
              label: 'To',
              type: 'date',
            },
          ]}
          values={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchSiteVisits} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/site-visits/${row.id}`)}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <CalendarCheck size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No site visits scheduled yet.</p>
              </div>
            }
          />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Schedule Site Visit"
        size="lg"
      >
        <SiteVisitForm
          onSuccess={() => { setCreateOpen(false); fetchSiteVisits(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default SiteVisitPage;
