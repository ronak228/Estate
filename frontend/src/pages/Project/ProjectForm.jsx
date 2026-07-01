import { useState, useEffect } from 'react';
import projectService from '../../services/projectService';
import FormLayout from '../../components/shared/FormLayout';
import Input from '../../components/shared/Input';
import Select from '../../components/shared/Select';

const STATUS_OPTIONS = [
  { value: 'UPCOMING', label: 'Upcoming' },
  { value: 'UNDER_CONSTRUCTION', label: 'Under Construction' },
  { value: 'READY_TO_MOVE', label: 'Ready to Move' },
  { value: 'COMPLETED', label: 'Completed' },
];

/**
 * ProjectForm — create or edit a project.
 * Used inside a Modal for both create and edit flows.
 */
const ProjectForm = ({ project, onSuccess, onCancel }) => {
  const isEdit = !!project;

  const [form, setForm] = useState({
    name: '',
    location: '',
    status: 'UPCOMING',
  });
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (project) {
      setForm({
        name: project.name || '',
        location: project.location || '',
        status: project.status || 'UPCOMING',
      });
    }
  }, [project]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
    setApiError('');
  };

  const validate = () => {
    const errs = {};
    if (!form.name.trim()) errs.name = 'Project name is required';
    return errs;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) { setErrors(errs); return; }

    setSubmitting(true);
    setApiError('');

    try {
      if (isEdit) {
        await projectService.updateProject(project.id, {
          name: form.name.trim(),
          location: form.location.trim() || undefined,
          status: form.status,
        });
      } else {
        await projectService.createProject({
          name: form.name.trim(),
          location: form.location.trim() || undefined,
          status: form.status,
        });
      }
      onSuccess();
    } catch (err) {
      setApiError(err.response?.data?.message || 'Failed to save project');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <FormLayout
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={isEdit ? 'Save Changes' : 'Create Project'}
      submitting={submitting}
    >
      <Input
        label="Project Name"
        name="name"
        value={form.name}
        onChange={handleChange}
        required
        error={errors.name}
        placeholder="e.g. Green Valley Residency"
      />

      <Input
        label="Location (optional)"
        name="location"
        value={form.location}
        onChange={handleChange}
        placeholder="e.g. Sector 42, Gurgaon"
      />

      <Select
        label="Status"
        name="status"
        value={form.status}
        onChange={handleChange}
        options={STATUS_OPTIONS}
        required
        placeholder="Select status..."
      />

      {apiError && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}
    </FormLayout>
  );
};

export default ProjectForm;
