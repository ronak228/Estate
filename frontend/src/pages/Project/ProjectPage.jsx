import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Building2 } from 'lucide-react';
import projectService from '../../services/projectService';
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
import ProjectForm from './ProjectForm';
import { formatDate } from '../../utils/format';

const STATUS_FILTER_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'UNDER_CONSTRUCTION', label: 'Under Construction' },
  { value: 'READY_TO_MOVE', label: 'Ready to Move' },
  { value: 'COMPLETED', label: 'Completed' },
];

const ProjectPage = () => {
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectService.listProjects({
        status: filters.status || undefined,
        search: search || undefined,
        page,
        pageSize,
      });
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load projects');
    } finally {
      setLoading(false);
    }
  }, [filters.status, search, page, pageSize]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const columns = [
    {
      key: 'name',
      label: 'Project Name',
      render: (name) => (
        <span className="font-medium text-gray-900">{name}</span>
      ),
    },
    {
      key: 'location',
      label: 'Location',
      render: (val) => val || '—',
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: '_count',
      label: 'Units',
      render: (count) => (
        <span className="text-sm text-gray-700">{count?.units ?? 0}</span>
      ),
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
        title="Projects"
        subtitle="Manage real estate projects and their unit inventory"
        actions={
          <Button icon={Plus} onClick={() => setCreateOpen(true)}>
            New Project
          </Button>
        }
      />

      <div className="flex flex-wrap gap-3 mb-4 items-start justify-between">
        <SearchBar
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Search by name or location..."
        />
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
        <ErrorState message={error} onRetry={fetchProjects} />
      ) : (
        <>
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            onRowClick={(row) => navigate(`/projects/${row.id}`)}
            emptyState={
              <div className="flex flex-col items-center py-16">
                <Building2 size={32} className="text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No projects yet. Create the first one.</p>
              </div>
            }
          />
          <Pagination page={page} pageSize={pageSize} total={total} onPageChange={setPage} />
        </>
      )}

      <Modal
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        title="New Project"
        size="md"
      >
        <ProjectForm
          onSuccess={() => { setCreateOpen(false); fetchProjects(); }}
          onCancel={() => setCreateOpen(false)}
        />
      </Modal>
    </PageLayout>
  );
};

export default ProjectPage;
