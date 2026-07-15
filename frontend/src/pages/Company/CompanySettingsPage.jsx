import { useState, useEffect } from 'react';
import { Building2, Globe2, ShieldCheck, Palette, CheckCircle2, PenTool } from 'lucide-react';
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
import StatusBadge from '../../components/shared/StatusBadge';
import FormError from '../../components/shared/FormError';
import { showSuccess } from '../../lib/toast';
import { formatDate, formatDateTime } from '../../utils/format';

const SectionIcon = ({ icon: Icon }) => (
  <div className="w-9 h-9 rounded-lg bg-primary-50 text-primary flex items-center justify-center flex-shrink-0">
    <Icon size={17} />
  </div>
);

const CompanySettingsPage = () => {
  const { updateUser } = useAuth();
  const [company, setCompany] = useState(null);
  const [form, setForm] = useState({ name: '', timezone: '', currency: '' });
  const [logoFile, setLogoFile] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [nameError, setNameError] = useState('');
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const data = await companyService.getMyCompany();
        setCompany(data);
        setForm({
          name: data.name || '',
          timezone: data.timezone || 'Asia/Kolkata',
          currency: data.currency || 'INR',
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
      if (logoFile) formData.append('logo', logoFile);
      if (signatureFile) formData.append('signature', signatureFile);

      const updated = await companyService.updateMyCompanySettings(formData);
      setCompany(updated);
      setLogoFile(null);
      setSignatureFile(null);
      setSavedAt(new Date());
      showSuccess('Settings saved successfully');
      // Keep branding + currency/timezone formatting in sync without requiring a re-login.
      updateUser({
        companyName: updated.name,
        companyLogoUrl: updated.logoUrl,
        companyCurrency: updated.currency,
        companyTimezone: updated.timezone,
      });
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
      <PageHeader
        title="Company Settings"
        subtitle={company?.name}
        actions={
          savedAt && (
            <span className="inline-flex items-center gap-1.5 text-xs text-gray-400">
              <CheckCircle2 size={13} className="text-success" />
              Saved {formatDateTime(savedAt)}
            </span>
          )
        }
      />

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left column — General + Regional + Status */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            <Card
              title={
                <div className="flex items-center gap-3">
                  <SectionIcon icon={Building2} />
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 tracking-tight">General Information</h2>
                    <p className="text-xs text-gray-400 mt-0.5">The name and identity shown throughout the platform</p>
                  </div>
                </div>
              }
            >
              <Input
                label="Company Name"
                name="name"
                value={form.name}
                onChange={handleChange}
                required
                error={nameError}
                placeholder="e.g. Devam Villa"
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Shown across the CRM — sidebar, top bar, browser tab, and on quotations and receipts.
              </p>
            </Card>

            <Card
              title={
                <div className="flex items-center gap-3">
                  <SectionIcon icon={Globe2} />
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Regional Settings</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Controls how dates, times, and amounts are formatted</p>
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium text-gray-700">Timezone</label>
                  <select
                    name="timezone"
                    value={form.timezone}
                    onChange={handleChange}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
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
                    className="w-full px-3 py-2 text-sm rounded-lg border border-gray-300 bg-white transition-colors duration-150 ease-snappy hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                  >
                    <option value="INR">INR — Indian Rupee</option>
                    <option value="AED">AED — UAE Dirham</option>
                    <option value="USD">USD — US Dollar</option>
                    <option value="GBP">GBP — British Pound</option>
                  </select>
                </div>
              </div>
            </Card>

            <Card
              title={
                <div className="flex items-center gap-3">
                  <SectionIcon icon={ShieldCheck} />
                  <div>
                    <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Workspace Status</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Read-only — managed by the platform team</p>
                  </div>
                </div>
              }
            >
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-400 mb-1">Status</p>
                  <StatusBadge value={company?.status} />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Workspace URL</p>
                  <p className="text-sm font-medium text-gray-800 font-mono">{company?.slug || '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Created</p>
                  <p className="text-sm font-medium text-gray-800">{company?.createdAt ? formatDate(company.createdAt) : '—'}</p>
                </div>
              </div>
            </Card>
          </div>

          {/* Right column — Branding */}
          <Card
            title={
              <div className="flex items-center gap-3">
                <SectionIcon icon={Palette} />
                <h2 className="text-sm font-semibold text-gray-800 tracking-tight">Branding</h2>
              </div>
            }
          >
            <p className="text-xs text-gray-500 mb-2">Current Logo</p>
            <div className="rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center p-4 mb-4">
              {company?.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt="Company logo"
                  className="max-h-16 max-w-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-card-hover">
                  <Building2 size={26} className="text-white" />
                </div>
              )}
            </div>

            <FileUploader
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              maxSizeMb={2}
              onFileSelected={setLogoFile}
              label={logoFile ? `Selected: ${logoFile.name}` : 'Upload company logo (JPEG, PNG, SVG — max 2 MB)'}
            />

            <div className="border-t border-gray-100 mt-5 pt-5">
              <p className="text-xs text-gray-500 mb-2">Authorized Signature</p>
              <div className="rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center p-4 mb-4" style={{ minHeight: '4.5rem' }}>
                {company?.signatureUrl ? (
                  <img
                    src={company.signatureUrl}
                    alt="Authorized signature"
                    className="max-h-14 max-w-full object-contain"
                  />
                ) : (
                  <div className="flex items-center gap-2 text-gray-300">
                    <PenTool size={20} />
                    <span className="text-xs">No signature uploaded</span>
                  </div>
                )}
              </div>

              <FileUploader
                accept="image/jpeg,image/png,image/webp,image/svg+xml"
                maxSizeMb={2}
                onFileSelected={setSignatureFile}
                label={signatureFile ? `Selected: ${signatureFile.name}` : 'Upload signature image (JPEG, PNG, SVG — max 2 MB)'}
              />
              <p className="text-xs text-gray-400 mt-1.5">
                Auto-attached as "Authorized Signatory" on quotation, booking, and payment receipts — on-screen and in downloaded PDFs.
              </p>
            </div>
          </Card>
        </div>

        <FormError message={error} className="mt-6" />

        <div className="sticky bottom-4 mt-6 bg-white border border-gray-200 rounded-xl shadow-card-hover px-5 py-3.5 flex items-center justify-between gap-3">
          <span className="text-xs text-gray-400">
            {savedAt ? `Last saved ${formatDateTime(savedAt)}` : 'Changes are saved when you click Save Settings'}
          </span>
          <Button type="submit" loading={saving}>
            Save Settings
          </Button>
        </div>
      </form>
    </PageLayout>
  );
};

export default CompanySettingsPage;
