import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Layers, Building2, Pencil, Tag } from 'lucide-react';
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
import Card from '../../components/shared/Card';
import EmptyState from '../../components/shared/EmptyState';
import ProjectForm from './ProjectForm';
import UnitForm from '../Unit/UnitForm';
import BulkUnitForm from '../Unit/BulkUnitForm';
import { showSuccess, getErrorMessage } from '../../lib/toast';
import { formatCurrency, formatDate, getCurrencySymbol } from '../../utils/format';

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
  const [bulkAddOpen, setBulkAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState(null);
  const [statusUnit, setStatusUnit] = useState(null);
  const [statusValue, setStatusValue] = useState('');
  const [statusSubmitting, setStatusSubmitting] = useState(false);
  const [statusChangeError, setStatusChangeError] = useState('');

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
    setStatusChangeError('');
    try {
      await unitService.updateStatus(statusUnit.id, statusValue);
      showSuccess('Unit status updated');
      setStatusUnit(null);
      setStatusValue('');
      fetchProject();
    } catch (err) {
      setStatusChangeError(getErrorMessage(err, 'Failed to update status'));
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
      key: 'floor',
      label: 'Floor',
      render: (val) => val ?? '—',
    },
    {
      key: 'unitType',
      label: 'Type',
      render: (val) => val || '—',
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
      label: `${getCurrencySymbol()}/sq. ft.`,
      render: (val) => val != null ? `${getCurrencySymbol()}${Number(val).toLocaleString('en-IN')}` : '—',
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
              <div className="flex items-center justify-end gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={Pencil}
                  title="Edit unit"
                  aria-label={`Edit Unit ${row.unitNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditUnit(row);
                  }}
                />
                <Button
                  variant="ghost"
                  size="sm"
                  iconOnly
                  icon={Tag}
                  title="Change status"
                  aria-label={`Change status for Unit ${row.unitNumber}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    setStatusChangeError('');
                    setStatusUnit(row);
                    setStatusValue(row.status);
                  }}
                />
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
      <PageHeader
        title={project.name}
        subtitle={project.location || 'No location set'}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate('/projects')}>
              Back
            </Button>
            {canManage && (
              <>
                <Button variant="outline" icon={Pencil} size="sm" onClick={() => setEditOpen(true)}>
                  Edit Project
                </Button>
                <Button icon={Plus} size="sm" onClick={() => setAddUnitOpen(true)}>
                  Add Unit
                </Button>
                <Button variant="outline" icon={Layers} size="sm" onClick={() => setBulkAddOpen(true)}>
                  Bulk Add Units
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Project Info + Unit Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Status</p>
          <div className="mt-1.5"><StatusBadge value={project.status} /></div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Total Units</p>
          <p className="text-lg font-bold text-gray-900 mt-1.5 tabular-nums">{unitSummary?.total ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Available</p>
          <p className="text-lg font-bold text-success mt-1.5 tabular-nums">{unitSummary?.available ?? 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-[10.5px] font-bold uppercase tracking-wide text-gray-400">Reserved / Sold</p>
          <p className="text-lg font-bold text-gray-700 mt-1.5 tabular-nums">
            {(unitSummary?.reserved ?? 0)} / {(unitSummary?.sold ?? 0)}
          </p>
        </div>
      </div>

      {/* Units Table */}
      <Card
        title={
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
              <Building2 size={17} />
            </div>
            <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Units</h2>
          </div>
        }
      >
        <DataTable
          columns={unitColumns}
          rows={project.units || []}
          loading={false}
          emptyState={
            <EmptyState
              compact
              icon={Building2}
              message={`No units yet.${canManage ? ' Click "Add Unit" to add the first one.' : ''}`}
            />
          }
        />
      </Card>

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

      {/* Bulk Add Units Modal */}
      <Modal
        isOpen={bulkAddOpen}
        onClose={() => setBulkAddOpen(false)}
        title="Bulk Add Units"
        size="xl"
      >
        <BulkUnitForm
          projectId={project.id}
          existingUnitNumbers={(project.units || []).map((u) => u.unitNumber)}
          onSuccess={() => { setBulkAddOpen(false); fetchProject(); }}
          onCancel={() => setBulkAddOpen(false)}
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
                className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white hover:border-gray-400 transition-colors duration-150 ease-snappy focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="AVAILABLE">Available</option>
                <option value="SOLD">Sold</option>
              </select>
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Note: RESERVED status is set automatically by the booking process and cannot be applied manually. A unit with an active booking must be released by cancelling the booking.
            </p>
            {statusChangeError && (
              <p className="text-sm text-red-600">{statusChangeError}</p>
            )}
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
