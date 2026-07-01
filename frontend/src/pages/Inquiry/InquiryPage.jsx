import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, PhoneCall } from 'lucide-react';
import inquiryService from '../../services/inquiryService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ErrorState from '../../components/shared/ErrorState';
import InquiryForm from './InquiryForm';
import { formatDate } from '../../utils/format';

const STAGE_FILTER_OPTIONS = [
  { value: 'NEW', label: 'New' },
  { value: 'CONTACTED', label: 'Contacted' },
  { value: 'QUALIFIED', label: 'Qualified' },
  { value: 'SITE_VISIT_SCHEDULED', label: 'Site Visit Scheduled' },
  { value: 'NEGOTIATION', label: 'Negotiation' },
  { value: 'BOOKED', label: 'Booked' },
  { value: 'NOT_INTERESTED', label: 'Not Interested' },
];

const SOURCE_FILTER_OPTIONS = [
  { value: 'WALK_IN', label: 'Walk-in' },
  { value: 'PHONE_CALL', label: 'Phone Call' },
  { value: 'WEBSITE', label: 'Website' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'REFERRAL', label: 'Referral' },
  { value: 'ADVERTISEMENT', label: 'Advertisement' },
  { value: 'OTHER', label: 'Other' },
];

const InquiryPage = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [userOptions, setUserOptions] = useState([]);

  // Load assignable users for the assigned-to filter
  useEffect(() => {
    inquiryService.getAssignableUsers()
      .then((users) => {
        setUserOptions(users.map((u) => ({ value: u.id, label: u.fullName })));
      })
      .catch(() => {});
  }, []);

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await inquiryService.listInquiries({
        stage: filters.stage || undefined,
        source: filters.source || undefined,
        assignedToId: filters.assignedToId || undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load inquiries');
    } finally {
      setLoading(false);
    }
  }, [search, filters.stage, filters.source, filters.assignedToId, page, pageSize]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  const columns = [
    {
      key: 'contact',
      label: 'Contact',
      render: (contact) => (
        <div>
          <p className="font-medium text-gray-900">{contact?.fullName || '—'}</p>
          <p className="text-xs text-gray-500">{contact?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: 'assignedTo',
      label: 'Assigned To',
      render: (assignedTo) => assignedTo?.fullName || '—',
    },
    {
      key: 'project',
      label: 'Project',
      render: (project) => project?.name || '—',
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (val) => formatDate(val),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Inquiries"
        subtitle="Track and manage all incoming inquiries"
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New Inquiry
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-start justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name, phone, email..."
        />
        <FilterBar
          filters={[
            {
              key: 'stage',
              label: 'All Stages',
              type: 'select',
              options: STAGE_FILTER_OPTIONS,
            },
            {
              key: 'source',
              label: 'All Sources',
              type: 'select',
              options: SOURCE_FILTER_OPTIONS,
            },
            {
              key: 'assignedToId',
              label: 'All Assignees',
              type: 'select',
              options: userOptions,
            },
          ]}
          values={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchInquiries} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/inquiries/${row.id}`)}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <PhoneCall size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No inquiries yet. Create the first one.</p>
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
        title="New Inquiry"
        size="lg"
      >
        <InquiryForm
          onSuccess={() => { setCreateOpen(false); fetchInquiries(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default InquiryPage;
