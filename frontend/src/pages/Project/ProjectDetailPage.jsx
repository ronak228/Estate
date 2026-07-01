import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Building2, Pencil } from 'lucide-react';
import projectService from '../../services/projectService';
import unitService from '../../services/unitService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import DataTable from '../../components/shared/DataTable';
import StatusBadge from '../../components/shared/StatusBadge';
import Button from '../../components/shared/Button';
import Modal from '../../components/shared/Modal';
import ErrorState from '../../components/shared/ErrorState';
import LoadingState from '../../components/shared/LoadingState';
import ProjectForm from './ProjectForm';
import UnitForm from '../Unit/UnitForm';
import { formatCurrency, formatDate } from '../../utils/format';

const MANAGERS = ['ADMIN', 'MANAGER'];

const ProjectDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canManage = MANAGERS.includes(user?.role);

  const [project, setProject] = useState(null);
  const [unitSummary, setUnitSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editOpen, setEditOpen] = useState(false);
  const [addUnitOpen, setAddUnitOpen] = useState(false);
  const [editUnit, setEditUnit] = useState(null);
  const [statusUnit, setStatusUnit] = useState(null);
  const [statusValue, setStatusValue] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);

  const fetchProject = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await projectService.getProject(id);
      setProject(data.project);
      setUnitSummary(data.unitSummary);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const handleStatusChange = async () => {
    if (!statusUnit || !statusValue) return;
    setStatusSubmitting(true);
    try {
      await unitService.updateStatus(statusUnit.id, statusValue);
      setStatusUnit(null);
      setStatusValue('');
      fetchProject();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusSubmitting(false);
    }
  };

  const unitColumns = [
    {
      key: 'unitNumber',
      label: 'Unit No.',
      render: (val) => <span className="font-medium text-gray-900">{val}</span>,
    },
    {
      key: 'area',
      label: 'Area (sq. ft.)',
      render: (_, row) => {
        const w = Number(row.width);
        const l = Number(row.length);
        const a = Number(row.area);
        return (
          <span className="text-sm text-gray-700">
            {a > 0 ? `${a.toLocaleString('en-IN')}` : '—'}
            <span className="text-xs text-gray-400 ml-1">({w}×{l} ft)</span>
          </span>
        );
      },
    },
    {
      key: 'pricePerSqFt',
      label: '₹/sq. ft.',
      render: (val) => val != null ? `₹${Number(val).toLocaleString('en-IN')}` : '—',
    },
    {
      key: 'basePrice',
      label: 'Base Price',
      render: (val) => <span className="font-medium">{formatCurrency(val)}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (val) => <StatusBadge value={val} />,
    },
    {
      key: 'createdAt',
      label: 'Added',
      render: (val) => formatDate(val),
    },
    ...(canManage
      ? [
          {
            key: 'id',
            label: 'Actions',
            render: (_, row) => (
              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditUnit(row);
                  }}
                  className="text-xs text-indigo-600 hover:underline"
                >
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusUnit(row);
                    setStatusValue(row.status);
                  }}
                  className="text-xs text-gray-500 hover:underline"
                >
                  Status
                </button>
              </div>
            ),
          },
        ]
      : []),
  ];

  if (loading) {
    return (
      <PageLayout>
        <LoadingState label="Loading project..." />
      </PageLayout>
    );
  }

  if (error) {
    return (
      <PageLayout>
        <ErrorState message={error} onRetry={fetchProject} />
      </PageLayout>
    );
  }

  if (!project) return null;

  return (
    <PageLayout>
      {/* Back + Header */}
      <div className="mb-2">
        <button
          onClick={() => navigate('/projects')}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft size={16} /> Back to Projects
        </button>
      </div>

      <PageHeader
        title={project.name}
        subtitle={project.location || 'No location set'}
        actions={
          <div className="flex items-center gap-2">
            {canManage && (
              <>
                <Button variant="outline" icon={Pencil} size="sm" onClick={() => setEditOpen(true)}>
                  Edit Project
                </Button>
                <Button icon={Plus} size="sm" onClick={() => setAddUnitOpen(true)}>
                  Add Unit
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Project Info + Unit Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Status</p>
          <StatusBadge value={project.status} />
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Total Units</p>
          <p className="text-lg font-semibold text-gray-900">{unitSummary?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Available</p>
          <p className="text-lg font-semibold text-emerald-600">{unitSummary?.available ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
          <p className="text-xs text-gray-500 mb-1">Reserved / Sold</p>
          <p className="text-lg font-semibold text-gray-700">
            {(unitSummary?.reserved ?? 0)} / {(unitSummary?.sold ?? 0)}
          </p>
        </div>
      </div>

      {/* Units Table */}
      <div>
        <h2 className="text-base font-semibold text-gray-800 mb-3">Units</h2>
        <DataTable
          columns={unitColumns}
          rows={project.units || []}
          loading={false}
          emptyState={
            <div className="flex flex-col items-center py-16">
              <Building2 size={32} className="text-gray-300 mb-3" />
              <p className="text-sm text-gray-500">
                No units yet.{canManage ? ' Click "Add Unit" to add the first one.' : ''}
              </p>
            </div>
          }
        />
      </div>

      {/* Edit Project Modal */}
      <Modal
        isOpen={editOpen}
        onClose={() => setEditOpen(false)}
        title="Edit Project"
        size="md"
      >
        <ProjectForm
          project={project}
          onSuccess={() => { setEditOpen(false); fetchProject(); }}
          onCancel={() => setEditOpen(false)}
        />
      </Modal>

      {/* Add Unit Modal */}
      <Modal
        isOpen={addUnitOpen}
        onClose={() => setAddUnitOpen(false)}
        title="Add Unit"
        size="sm"
      >
        <UnitForm
          projectId={project.id}
          onSuccess={() => { setAddUnitOpen(false); fetchProject(); }}
          onCancel={() => setAddUnitOpen(false)}
        />
      </Modal>

      {/* Edit Unit Modal */}
      <Modal
        isOpen={!!editUnit}
        onClose={() => setEditUnit(null)}
        title="Edit Unit"
        size="sm"
      >
        {editUnit && (
          <UnitForm
            unit={editUnit}
            projectId={project.id}
            onSuccess={() => { setEditUnit(null); fetchProject(); }}
            onCancel={() => setEditUnit(null)}
          />
        )}
      </Modal>

      {/* Change Unit Status Modal */}
      <Modal
        isOpen={!!statusUnit}
        onClose={() => { setStatusUnit(null); setStatusValue(''); }}
        title={`Change Status — Unit ${statusUnit?.unitNumber}`}
        size="sm"
      >
        {statusUnit && (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-gray-600">
              Current status: <StatusBadge value={statusUnit.status} />
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-sm font-medium text-gray-700">New Status</label>
              <select
                value={statusValue}
                onChange={(e) => setStatusValue(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
                <option value="RESERVED">Reserved</option>
              </select>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Note: RESERVED status is automatically set by the booking process. Manual override should only be used for corrections.
            </p>
            <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => { setStatusUnit(null); setStatusValue(''); }}
                disabled={statusSubmitting}
              >
                Cancel
              </Button>
              <Button
                onClick={handleStatusChange}
                loading={statusSubmitting}
                disabled={statusValue === statusUnit.status}
              >
                Update Status
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </PageLayout>
  );
};

export default ProjectDetailPage;
