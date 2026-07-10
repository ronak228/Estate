import { useState, useEffect } from 'react';
import companyService from '../../services/companyService';
import { useAuth } from '../../context/AuthContext';
import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Input from '../../components/shared/Input';
import Button from '../../components/shared/Button';
import FileUploader from '../../components/shared/FileUploader';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Card from '../../components/shared/Card';
import { showSuccess } from '../../lib/toast';

const CompanySettingsPage = () => {
  const { updateUser } = useAuth();
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({ name: '', timezone: '', currency: '', primaryColor: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const data = await companyService.getMyCompany();
        setCompany(data);
        setForm({
          name: data.name || '',
          timezone: data.timezone || 'Asia/Kolkata',
          currency: data.currency || 'INR',
          primaryColor: data.primaryColor || '',
        });
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load company settings');
      } finally {
        setLoading(false);
      }
    };
    fetchCompany();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (name === 'name') setNameError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setNameError('Company name is required');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('name', form.name.trim());
      formData.append('timezone', form.timezone);
      formData.append('currency', form.currency);
      if (form.primaryColor) formData.append('primaryColor', form.primaryColor);
      if (logoFile) formData.append('logo', logoFile);

      const updated = await companyService.updateMyCompanySettings(formData);
      setCompany(updated);
      setLogoFile(null);
      showSuccess('Settings saved successfully');
      // Keep the sidebar/topbar branding in sync without requiring a re-login.
      updateUser({ companyName: updated.name, companyLogoUrl: updated.logoUrl });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageLayout><LoadingState /></PageLayout>;
  if (error && !company) return <PageLayout><ErrorState message={error} onRetry={() => window.location.reload()} /></PageLayout>;

  return (
    <PageLayout>
      <PageHeader title="Company Settings" subtitle={company?.name} />

      <div className="max-w-2xl">
        <form onSubmit={handleSubmit}>
          {/* General */}
          <Card title="General" padding="p-6" className="mb-5">
            <Input
              label="Company Name"
              name="name"
              value={form.name}
              onChange={handleChange}
              required
              error={nameError}
              placeholder="e.g. Devam Villa"
            />
            <p className="text-xs text-gray-400 mt-1">
              Shown across the CRM — sidebar, top bar, browser tab, and on quotations and receipts.
            </p>
          </Card>

          {/* Company Logo */}
          <Card title="Branding" padding="p-6" className="mb-5">
            {company?.logoUrl && (
              <div className="mb-4">
                <p className="text-xs text-gray-500 mb-2">Current Logo</p>
                <img
                  src={company.logoUrl}
                  alt="Company logo"
                  className="h-12 object-contain rounded-lg border border-gray-200"
                />
              </div>
            )}

            <FileUploader
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              maxSizeMb={2}
              onFileSelected={setLogoFile}
              label={logoFile ? `Selected: ${logoFile.name}` : 'Upload company logo (JPEG, PNG, SVG — max 2 MB)'}
            />

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 block mb-1">
                Primary Color Override
                <span className="text-xs text-gray-400 ml-2">(optional — leave empty to use the default #4F46E5)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  name="primaryColor"
                  value={form.primaryColor || '#4F46E5'}
                  onChange={handleChange}
                  className="w-10 h-10 rounded border border-gray-300 cursor-pointer"
                />
                <Input
                  name="primaryColor"
                  value={form.primaryColor}
                  onChange={handleChange}
                  placeholder="#4F46E5"
                  className="flex-1"
                />
              </div>
            </div>
          </Card>

          {/* Regional Settings */}
          <Card title="Regional Settings" padding="p-6" className="mb-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Timezone</label>
                <select
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="Asia/Kolkata">Asia/Kolkata (IST)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GST)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">America/New_York (EST)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">Currency</label>
                <select
                  name="currency"
                  value={form.currency}
                  onChange={handleChange}
                  className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="INR">INR — Indian Rupee</option>
                  <option value="AED">AED — UAE Dirham</option>
                  <option value="USD">USD — US Dollar</option>
                  <option value="GBP">GBP — British Pound</option>
                </select>
              </div>
            </div>
          </Card>

          {error && (
            <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
              {error}
            </div>
          )}

          <div className="flex justify-end">
            <Button type="submit" loading={saving}>
              Save Settings
            </Button>
          </div>
        </form>
      </div>
    </PageLayout>
  );
};

export default CompanySettingsPage;
