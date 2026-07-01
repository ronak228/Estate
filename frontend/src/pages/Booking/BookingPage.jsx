import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpen } from 'lucide-react';
import bookingService from '../../services/bookingService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import FilterBar from '../../components/shared/FilterBar';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import ErrorState from '../../components/shared/ErrorState';
import { formatCurrency, formatDate } from '../../utils/format';

const STATUS_FILTER_OPTIONS = [
  { value: 'CONFIRMED', label: 'Confirmed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const BookingPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await bookingService.listBookings({
        status: filters.status || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load bookings');
    } finally {
      setLoading(false);
    }
  }, [filters.status, page, pageSize]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  const columns = [
    {
      key: 'inquiry',
      label: 'Customer',
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
        ) : (
          '—'
        ),
    },
    {
      key: 'finalAmount',
      label: 'Final Amount',
      render: (val) => (
        <span className="font-semibold text-gray-900">{formatCurrency(val)}</span>
      ),
    },
    {
      key: 'bookingAmount',
      label: 'Token Amount',
      render: (val) => formatCurrency(val),
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: 'erpSyncedAt',
      label: 'ERP Sync',
      render: (val) =>
        val ? (
          <span className="text-xs text-emerald-600 font-medium">Synced</span>
        ) : (
          <span className="text-xs text-amber-600 font-medium">Pending</span>
        ),
    },
    {
      key: 'createdAt',
      label: 'Booked On',
      render: (val) => formatDate(val),
    },
    {
      key: 'bookedBy',
      label: 'Booked By',
      render: (bookedBy) => bookedBy?.fullName || '—',
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Bookings"
        subtitle="All confirmed property bookings across the CRM"
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
          ]}
          values={filters}
          onChange={(f) => { setFilters(f); setPage(1); }}
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchBookings} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/bookings/${row.id}`)}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <BookOpen size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No bookings yet.</p>
                <p className="text-xs text-gray-400 mt-1">
                  Bookings are created from an inquiry with an accepted quotation.
                </p>
              </div>
            }
          />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}
    </PageLayout>
  );
};

export default BookingPage;
