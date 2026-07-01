import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText } from 'lucide-react';
import quotationService from '../../services/quotationService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ErrorState from '../../components/shared/ErrorState';
import QuotationForm from './QuotationForm';
import { formatCurrency, formatDate } from '../../utils/format';

const DECISION_FILTER_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'NEGOTIATING', label: 'Negotiating' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'REJECTED', label: 'Rejected' },
];

const QuotationPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetchQuotations = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await quotationService.listQuotations({
        decision: filters.decision || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load quotations');
    } finally {
      setLoading(false);
    }
  }, [filters.decision, page, pageSize]);

  useEffect(() => {
    fetchQuotations();
  }, [fetchQuotations]);

  const columns = [
    {
      key: 'inquiry',
      label: 'Contact',
      render: (inquiry) => (
        <div>
          <p className="font-medium text-gray-900">{inquiry?.contact?.fullName || '—'}</p>
          <p className="text-xs text-gray-500">{inquiry?.contact?.phone || ''}</p>
        </div>
      ),
    },
    {
      key: 'unit',
      label: 'Unit',
      render: (unit) =>
        unit ? (
          <div>
            <p className="font-medium text-gray-900">Unit {unit.unitNumber}</p>
            <p className="text-xs text-gray-500">{unit.project?.name}</p>
          </div>
        ) : '—',
    },
    {
      key: 'totalAmount',
      label: 'Total',
      render: (val) => (
        <span className="font-semibold text-gray-900">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'decision',
      label: 'Decision',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: 'validUntil',
      label: 'Valid Until',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'createdAt',
      label: 'Created',
      render: (val) => formatDate(val),
    },
    {
      key: 'createdBy',
      label: 'Created By',
      render: (createdBy) => createdBy?.fullName || '—',
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Quotations"
        subtitle="Track all property quotations and customer decisions"
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New Quotation
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <FilterBar
          filters={[
            {
              key: 'decision',
              label: 'All Decisions',
              type: 'select',
              options: DECISION_FILTER_OPTIONS,
            },
          ]}
          values={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchQuotations} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/quotations/${row.id}`)}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <FileText size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No quotations yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Create a quotation from an inquiry's site visit.
                </p>
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
        title="New Quotation"
        size="xl"
      >
        <QuotationForm
          onSuccess={() => { setCreateOpen(false); fetchQuotations(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default QuotationPage;
