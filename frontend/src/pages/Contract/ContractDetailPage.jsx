import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, FileText, ClipboardCheck, Banknote } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import contractDocumentService from '../../services/contractDocumentService';
import dueDiligenceService from '../../services/dueDiligenceService';
import financingService from '../../services/financingService';
import bookingService from '../../services/bookingService';

import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import ContractDocumentList from '../../components/shared/ContractDocumentList';
import DueDiligenceTracker from '../../components/shared/DueDiligenceTracker';
import FinancingPanel from '../../components/shared/FinancingPanel';

import { formatDate } from '../../utils/format';

const TABS = [
  { key: 'documents', label: 'Documents', icon: FileText },
  { key: 'due-diligence', label: 'Due Diligence', icon: ClipboardCheck },
  { key: 'financing', label: 'Financing', icon: Banknote },
];

const ContractDetailPage = () => {
  const { id } = useParams(); // booking id
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('documents');

  // Booking summary (for page header context)
  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState('');

  // Contract documents
  const [contractDocs, setContractDocs] = useState([]);
  const [docsLoading, setDocsLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  // Due diligence
  const [dueDiligence, setDueDiligence] = useState(null);
  const [ddLoading, setDdLoading] = useState(false);
  const [ddSaving, setDdSaving] = useState(false);
  const [ddSaveError, setDdSaveError] = useState('');

  // Financing
  const [financing, setFinancing] = useState(null);
  const [finLoading, setFinLoading] = useState(false);
  const [finSaving, setFinSaving] = useState(false);
  const [finSaveError, setFinSaveError] = useState('');
  const [erpSyncing, setErpSyncing] = useState(false);
  const [erpSyncMessage, setErpSyncMessage] = useState('');

  // ── Fetch booking summary ─────────────────────────────────────────────────
  const fetchBooking = useCallback(async () => {
    setBookingLoading(true);
    setBookingError('');
    try {
      const data = await bookingService.getBooking(id);
      setBooking(data);
    } catch (err) {
      setBookingError(err.response?.data?.message || 'Failed to load booking');
    } finally {
      setBookingLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchBooking(); }, [fetchBooking]);

  // ── Fetch contract documents ───────────────────────────────────────────────
  const fetchContractDocs = useCallback(async () => {
    setDocsLoading(true);
    try {
      const items = await contractDocumentService.listDocuments(id);
      setContractDocs(items);
    } catch {
      // Non-blocking
    } finally {
      setDocsLoading(false);
    }
  }, [id]);

  // ── Fetch due diligence ────────────────────────────────────────────────────
  const fetchDueDiligence = useCallback(async () => {
    setDdLoading(true);
    try {
      const data = await dueDiligenceService.getDueDiligence(id);
      setDueDiligence(data);
    } catch {
      // Non-blocking
    } finally {
      setDdLoading(false);
    }
  }, [id]);

  // ── Fetch financing ────────────────────────────────────────────────────────
  const fetchFinancing = useCallback(async () => {
    setFinLoading(true);
    try {
      const data = await financingService.getFinancing(id);
      setFinancing(data);
    } catch {
      // Non-blocking
    } finally {
      setFinLoading(false);
    }
  }, [id]);

  // Load tab data on mount
  useEffect(() => {
    fetchContractDocs();
    fetchDueDiligence();
    fetchFinancing();
  }, [fetchContractDocs, fetchDueDiligence, fetchFinancing]);

  // ── Contract document handlers ─────────────────────────────────────────────
  const handleUpload = async (file, type) => {
    setUploading(true);
    setUploadError('');
    try {
      await contractDocumentService.uploadDocument(id, file, type);
      await fetchContractDocs();
    } catch (err) {
      setUploadError(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateSignature = async (documentId, payload) => {
    await contractDocumentService.updateSignatureStatus(id, documentId, payload);
    await fetchContractDocs();
  };

  const handleDeleteDoc = async (documentId) => {
    await contractDocumentService.deleteDocument(id, documentId);
    await fetchContractDocs();
  };

  // ── Due diligence handlers ─────────────────────────────────────────────────
  const handleDueDiligenceSave = async (data) => {
    setDdSaving(true);
    setDdSaveError('');
    try {
      if (dueDiligence) {
        const updated = await dueDiligenceService.updateDueDiligence(id, data);
        setDueDiligence(updated);
      } else {
        const created = await dueDiligenceService.createDueDiligence(id, data);
        setDueDiligence(created);
      }
    } catch (err) {
      setDdSaveError(err.response?.data?.message || 'Failed to save due diligence');
      throw err; // re-throw so DueDiligenceTracker keeps edit mode open
    } finally {
      setDdSaving(false);
    }
  };

  // ── Financing handlers ─────────────────────────────────────────────────────
  const handleFinancingSave = async (data) => {
    setFinSaving(true);
    setFinSaveError('');
    try {
      if (financing) {
        const updated = await financingService.updateFinancing(id, data);
        setFinancing(updated);
      } else {
        const created = await financingService.createFinancing(id, data);
        setFinancing(created);
      }
    } catch (err) {
      setFinSaveError(err.response?.data?.message || 'Failed to save financing');
      throw err;
    } finally {
      setFinSaving(false);
    }
  };

  const handleErpSync = async () => {
    setErpSyncing(true);
    setErpSyncMessage('');
    try {
      const updated = await financingService.syncErp(id);
      setFinancing(updated);
      setErpSyncMessage('ERP sync successful.');
    } catch (err) {
      setErpSyncMessage(err.response?.data?.message || 'ERP sync failed');
    } finally {
      setErpSyncing(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (bookingLoading) return <PageLayout><LoadingState label="Loading booking..." /></PageLayout>;
  if (bookingError) return <PageLayout><ErrorState message={bookingError} onRetry={fetchBooking} /></PageLayout>;
  if (!booking) return null;

  const contact = booking.inquiry?.contact;
  const unit = booking.unit;

  return (
    <PageLayout>
      <PageHeader
        title="Contract Phase"
        subtitle={`${contact?.fullName || '—'} · Unit ${unit?.unitNumber || '—'} · ${unit?.project?.name || '—'} · Booked ${formatDate(booking.createdAt)}`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              icon={ArrowLeft}
              onClick={() => navigate(`/bookings/${id}`)}
            >
              Back to Booking
            </Button>
          </div>
        }
      />

      {/* Tab navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex gap-6">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab content */}
      <div className="max-w-2xl">
        {activeTab === 'documents' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Contract Documents</h2>
            {docsLoading ? (
              <LoadingState label="Loading documents..." />
            ) : (
              <ContractDocumentList
                documents={contractDocs}
                onUpload={handleUpload}
                onUpdateSignature={handleUpdateSignature}
                onDelete={handleDeleteDoc}
                uploading={uploading}
                uploadError={uploadError}
                canManage={isManager}
              />
            )}
          </div>
        )}

        {activeTab === 'due-diligence' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Due Diligence</h2>
            {ddLoading ? (
              <LoadingState label="Loading due diligence..." />
            ) : (
              <DueDiligenceTracker
                dueDiligence={dueDiligence}
                onSave={handleDueDiligenceSave}
                canEdit={isManager}
                saving={ddSaving}
                saveError={ddSaveError}
              />
            )}
          </div>
        )}

        {activeTab === 'financing' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Financing</h2>
            {finLoading ? (
              <LoadingState label="Loading financing..." />
            ) : (
              <FinancingPanel
                financing={financing}
                onSave={handleFinancingSave}
                onErpSync={handleErpSync}
                canEdit={isManager}
                isAdmin={isAdmin}
                saving={finSaving}
                saveError={finSaveError}
                syncing={erpSyncing}
                syncMessage={erpSyncMessage}
              />
            )}
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default ContractDetailPage;
