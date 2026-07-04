import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import transactionService from '../../services/transactionService';
import { useAuth } from '../../context/AuthContext';

import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import Pagination from '../../components/shared/Pagination';
import StatusBadge from '../../components/shared/StatusBadge';
import SearchBar from '../../components/shared/SearchBar';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';

import { formatCurrency, formatDate } from '../../utils/format';

const STATUS_FILTER_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const COLUMNS = [
  {
    key: 'contact',
    label: 'Customer',
    render: (_, row) => row.booking?.inquiry?.contact?.fullName || '—',
  },
  {
    key: 'unit',
    label: 'Unit',
    render: (_, row) =>
      row.booking?.unit
        ? `Unit ${row.booking.unit.unitNumber} · ${row.booking.unit.project?.name || ''}`
        : '—',
  },
  {
    key: 'finalAmount',
    label: 'Final Amount',
    render: (_, row) => formatCurrency(row.booking?.finalAmount),
  },
  {
    key: 'invoiceCount',
    label: 'Invoices',
    render: (_, row) => (
      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
        {row.booking?._count?.invoices ?? 0}
      </span>
    ),
  },
  {
    key: 'paymentCount',
    label: 'Payments',
    render: (_, row) => (
      <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-0.5 rounded-full">
        {row.booking?._count?.transactionPayments ?? 0}
      </span>
    ),
  },
  {
    key: 'status',
    label: 'Status',
    render: (_, row) => <StatusBadge value={row.status} />,
  },
  {
    key: 'erpSyncedAt',
    label: 'ERP Sync',
    render: (_, row) =>
      row.erpSyncedAt ? (
        <span className="text-xs text-emerald-600 font-medium">Synced</span>
      ) : (
        <span className="text-xs text-amber-600 font-medium">Pending</span>
      ),
  },
  {
    key: 'createdAt',
    label: 'Initiated',
    render: (_, row) => formatDate(row.createdAt),
  },
];

const TransactionPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [data, setData] = useState({ items: [], total: 0, page: 1, pageSize: 20 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await transactionService.listTransactions({
        page,
        pageSize: 20,
        ...(search && { search }),
        ...(status && { status }),
      });
      setData(result);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  }, [page, search, status]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleSearch = (val) => { setSearch(val); setPage(1); };
  const handleStatusFilter = (val) => { setStatus(val); setPage(1); };

  return (
    <PageLayout>
      <PageHeader
        title="Transactions"
        subtitle="Financial close for all confirmed bookings"
        actions={
          <button
            type="button"
            onClick={fetchTransactions}
            className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-primary border border-gray-300 hover:border-primary px-3 py-1.5 rounded-lg transition-colors"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        }
      />

      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3 items-center">
          <SearchBar
            value={search}
            onChange={handleSearch}
            placeholder="Search by customer or unit..."
          />
          <select
            value={status}
            onChange={(e) => handleStatusFilter(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          >
            {STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <LoadingState label="Loading transactions..." />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchTransactions} />
        ) : (
          <>
            <DataTable
              columns={COLUMNS}
              rows={data.items}
              onRowClick={(row) => navigate(`/bookings/${row.bookingId}/transaction`)}
              emptyState={
                <div className="text-center py-12 text-gray-400 text-sm">
                  No transactions found.
                  {!search && !status
                    ? ' Initialize a transaction from a confirmed booking.'
                    : ' Try clearing the filters.'}
                </div>
              }
            />
            <Pagination
              page={data.page}
              pageSize={data.pageSize}
              total={data.total}
              onPageChange={setPage}
            />
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default TransactionPage;
