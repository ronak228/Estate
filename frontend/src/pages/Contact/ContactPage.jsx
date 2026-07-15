import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users } from 'lucide-react';
import contactService from '../../services/contactService';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import SearchBar from '../../components/shared/SearchBar';
import Pagination from '../../components/shared/Pagination';
import ErrorState from '../../components/shared/ErrorState';
import { formatDate } from '../../utils/format';

const ContactPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchContacts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await contactService.listContacts({
        search: search || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load contacts');
    } finally {
      setLoading(false);
    }
  }, [search, page, pageSize]);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const columns = [
    {
      key: 'fullName',
      label: 'Name',
      render: (val, row) => (
        <div>
          <p className="font-medium text-gray-900">{val}</p>
          <p className="text-xs text-gray-500">{row.phone}</p>
        </div>
      ),
    },
    {
      key: 'email',
      label: 'Email',
      render: (val) => val || '—',
    },
    {
      key: 'company_name',
      label: 'Company',
      render: (val) => val || '—',
    },
    {
      key: 'preferredArea',
      label: 'Preferred Area',
      render: (val) => val || '—',
    },
    {
      key: '_count',
      label: 'Inquiries',
      render: (val) => val?.inquiries ?? '—',
    },
    {
      key: '_count_interactions',
      label: 'Interactions',
      render: (_, row) => row._count?.interactions ?? '—',
    },
    {
      key: 'createdAt',
      label: 'Since',
      render: (val) => formatDate(val),
    },
  ];

  return (
    <PageLayout>
      <PageHeader
        title="Contacts"
        subtitle="Centralized contact database — one contact, many inquiries"
        actions={
          <span className="inline-flex items-center text-xs font-semibold text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
            {total} total
          </span>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-center justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name, phone, email..."
        />
      </div>

      {error ? (
        <ErrorState message={error} onRetry={fetchContacts} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/contacts/${row.id}`)}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <Users size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">
                  No contacts yet. They are created automatically when inquiries are added.
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

export default ContactPage;
