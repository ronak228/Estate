import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, RefreshCw, CheckCircle, AlertCircle, FileText, CreditCard, Home, Settings } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

import transactionService from '../../services/transactionService';
import invoiceService from '../../services/invoiceService';
import transactionPaymentService from '../../services/transactionPaymentService';
import bookingService from '../../services/bookingService';

import PageLayout from '../../components/shared/PageLayout';
import PageHeader from '../../components/shared/PageHeader';
import Button from '../../components/shared/Button';
import StatusBadge from '../../components/shared/StatusBadge';
import LoadingState from '../../components/shared/LoadingState';
import ErrorState from '../../components/shared/ErrorState';
import Modal from '../../components/shared/Modal';
import Select from '../../components/shared/Select';
import TransactionStatusBar from '../../components/shared/TransactionStatusBar';
import InvoiceList from '../../components/shared/InvoiceList';
import TransactionPaymentList from '../../components/shared/TransactionPaymentList';
import TitleTransferTracker from '../../components/shared/TitleTransferTracker';

import { formatCurrency, formatDate, formatDateTime } from '../../utils/format';

const TABS = [
  { key: 'invoices', label: 'Invoices', icon: FileText },
  { key: 'payments', label: 'Payments', icon: CreditCard },
  { key: 'title-transfer', label: 'Title Transfer', icon: Home },
  { key: 'status', label: 'Status', icon: Settings },
];

const TRANSACTION_STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

const TransactionDetailPage = () => {
  const { id } = useParams(); // booking id
  const navigate = useNavigate();
  const { user } = useAuth();

  const isManager = ['ADMIN', 'MANAGER'].includes(user?.role);
  const isAdmin = user?.role === 'ADMIN';

  const [activeTab, setActiveTab] = useState('invoices');

  // Booking context (for header)
  const [booking, setBooking] = useState(null);
  const [bookingLoading, setBookingLoading] = useState(true);
  const [bookingError, setBookingError] = useState('');

  // Transaction record
  const [transaction, setTransaction] = useState(null);
  const [txLoading, setTxLoading] = useState(false);
  const [txInitializing, setTxInitializing] = useState(false);
  const [txError, setTxError] = useState('');

  // Invoices
  const [invoices, setInvoices] = useState([]);
  const [invLoading, setInvLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState('');

  // Transaction payments
  const [payments, setPayments] = useState([]);
  const [pmtLoading, setPmtLoading] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [addPaymentError, setAddPaymentError] = useState('');

  // Title transfer
  const [titleTransfer, setTitleTransfer] = useState(null);
  const [ttLoading, setTtLoading] = useState(false);
  const [ttSaving, setTtSaving] = useState(false);
  const [ttSaveError, setTtSaveError] = useState('');

  // ERP sync
  const [erpSyncing, setErpSyncing] = useState(false);
  const [erpMessage, setErpMessage] = useState('');

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [statusError, setStatusError] = useState('');

  // ── Fetch booking ────────────────────────────────────────────────────────
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

  // ── Fetch transaction record ─────────────────────────────────────────────
  const fetchTransaction = useCallback(async () => {
    setTxLoading(true);
    setTxError('');
    try {
      const data = await transactionService.getTransaction(id);
      setTransaction(data);
    } catch (err) {
      setTxError(err.response?.data?.message || 'Failed to load transaction');
    } finally {
      setTxLoading(false);
    }
  }, [id]);

  // ── Fetch invoices ───────────────────────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setInvLoading(true);
    try {
      const result = await invoiceService.listInvoices(id);
      setInvoices(result.items || []);
    } catch {
      // Non-blocking
    } finally {
      setInvLoading(false);
    }
  }, [id]);

  // ── Fetch transaction payments ───────────────────────────────────────────
  const fetchPayments = useCallback(async () => {
    setPmtLoading(true);
    try {
      const result = await transactionPaymentService.listPayments(id);
      setPayments(result.items || []);
    } catch {
      // Non-blocking
    } finally {
      setPmtLoading(false);
    }
  }, [id]);

  // ── Fetch title transfer ─────────────────────────────────────────────────
  const fetchTitleTransfer = useCallback(async () => {
    setTtLoading(true);
    try {
      const data = await transactionService.getTitleTransfer(id);
      setTitleTransfer(data);
    } catch {
      // Non-blocking
    } finally {
      setTtLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
    fetchTransaction();
    fetchInvoices();
    fetchPayments();
    fetchTitleTransfer();
  }, [fetchBooking, fetchTransaction, fetchInvoices, fetchPayments, fetchTitleTransfer]);

  // ── Initialize transaction ───────────────────────────────────────────────
  const handleInitializeTransaction = async () => {
    setTxInitializing(true);
    setTxError('');
    try {
      const data = await transactionService.createTransaction(id);
      setTransaction(data);
    } catch (err) {
      setTxError(err.response?.data?.message || 'Failed to initialize transaction');
    } finally {
      setTxInitializing(false);
    }
  };

  // ── Invoice handlers ─────────────────────────────────────────────────────
  const handleGenerateInvoice = async (data) => {
    setGenerating(true);
    setGenerateError('');
    try {
      await invoiceService.createInvoice(id, data);
      await fetchInvoices();
    } catch (err) {
      setGenerateError(err.response?.data?.message || 'Failed to generate invoice');
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadInvoicePdf = async (invoiceId, invoiceNumber) => {
    try {
      const blob = await invoiceService.getInvoicePdfBlob(invoiceId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceNumber}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert('Failed to download invoice PDF');
    }
  };

  const handleUpdateInvoiceStatus = async (invoiceId, status) => {
    try {
      await invoiceService.updateInvoiceStatus(invoiceId, status);
      await fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update invoice status');
    }
  };

  // ── Payment handlers ─────────────────────────────────────────────────────
  const handleAddPayment = async (data) => {
    setAddingPayment(true);
    setAddPaymentError('');
    try {
      await transactionPaymentService.createPayment(id, data);
      await fetchPayments();
    } catch (err) {
      setAddPaymentError(err.response?.data?.message || 'Failed to record payment');
      throw err;
    } finally {
      setAddingPayment(false);
    }
  };

  const handleReconcile = async (paymentId, invoiceId) => {
    try {
      await transactionPaymentService.reconcile(paymentId, invoiceId);
      await Promise.all([fetchPayments(), fetchInvoices()]);
    } catch (err) {
      throw err;
    }
  };

  // ── Title transfer handlers ──────────────────────────────────────────────
  const handleTitleTransferSave = async (data) => {
    setTtSaving(true);
    setTtSaveError('');
    try {
      if (titleTransfer) {
        const updated = await transactionService.updateTitleTransfer(id, data);
        setTitleTransfer(updated);
      } else {
        const created = await transactionService.createTitleTransfer(id, data);
        setTitleTransfer(created);
      }
    } catch (err) {
      setTtSaveError(err.response?.data?.message || 'Failed to save title transfer');
      throw err;
    } finally {
      setTtSaving(false);
    }
  };

  // ── ERP sync ─────────────────────────────────────────────────────────────
  const handleErpSync = async () => {
    setErpSyncing(true);
    setErpMessage('');
    try {
      const updated = await transactionService.syncErp(id);
      setTransaction(updated);
      setErpMessage('ERP sync successful.');
    } catch (err) {
      setErpMessage(err.response?.data?.message || 'ERP sync failed');
    } finally {
      setErpSyncing(false);
    }
  };

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusUpdate = async () => {
    if (!newStatus) { setStatusError('Please select a status'); return; }
    setStatusUpdating(true);
    setStatusError('');
    try {
      const updated = await transactionService.updateTransactionStatus(id, newStatus);
      setTransaction(updated);
      setStatusModalOpen(false);
    } catch (err) {
      setStatusError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setStatusUpdating(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────
  if (bookingLoading) return <PageLayout><LoadingState label="Loading booking..." /></PageLayout>;
  if (bookingError) return <PageLayout><ErrorState message={bookingError} onRetry={fetchBooking} /></PageLayout>;
  if (!booking) return null;

  const contact = booking.inquiry?.contact;
  const unit = booking.unit;

  return (
    <PageLayout>
      <PageHeader
        title="Transaction Phase"
        subtitle={`${contact?.fullName || '—'} · Unit ${unit?.unitNumber || '—'} · ${unit?.project?.name || '—'} · ${formatDate(booking.createdAt)}`}
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

      {/* Transaction initialization prompt */}
      {!txLoading && !transaction && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-amber-800">Transaction not initialized</p>
            <p className="text-xs text-amber-600 mt-0.5">
              Initialize a transaction record to begin the financial close process.
            </p>
          </div>
          {isManager && (
            <Button
              size="sm"
              loading={txInitializing}
              onClick={handleInitializeTransaction}
            >
              Initialize Transaction
            </Button>
          )}
        </div>
      )}

      {txError && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-3 mb-6 text-sm text-red-700">
          {txError}
        </div>
      )}

      {/* Status bar — only when transaction exists */}
      {transaction && (
        <TransactionStatusBar
          invoices={invoices}
          payments={payments}
          titleTransfer={titleTransfer}
          transaction={transaction}
        />
      )}

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
      <div className="max-w-4xl">
        {/* ── Invoices tab ─────────────────────────────────────────────────── */}
        {activeTab === 'invoices' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Invoices</h2>
            {invLoading ? (
              <LoadingState label="Loading invoices..." />
            ) : (
              <InvoiceList
                invoices={invoices}
                onGenerate={handleGenerateInvoice}
                onDownloadPdf={handleDownloadInvoicePdf}
                onUpdateStatus={handleUpdateInvoiceStatus}
                generating={generating}
                generateError={generateError}
                canManage={isManager}
              />
            )}
          </div>
        )}

        {/* ── Payments tab ─────────────────────────────────────────────────── */}
        {activeTab === 'payments' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Transaction Payments</h2>
            {pmtLoading ? (
              <LoadingState label="Loading payments..." />
            ) : (
              <TransactionPaymentList
                payments={payments}
                invoices={invoices}
                onAddPayment={handleAddPayment}
                onReconcile={handleReconcile}
                adding={addingPayment}
                addError={addPaymentError}
                canManage={isManager}
              />
            )}
          </div>
        )}

        {/* ── Title Transfer tab ───────────────────────────────────────────── */}
        {activeTab === 'title-transfer' && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-700 mb-4">Title Transfer</h2>
            {ttLoading ? (
              <LoadingState label="Loading title transfer..." />
            ) : (
              <TitleTransferTracker
                titleTransfer={titleTransfer}
                onSave={handleTitleTransferSave}
                canEdit={isManager}
                saving={ttSaving}
                saveError={ttSaveError}
              />
            )}
          </div>
        )}

        {/* ── Status tab ───────────────────────────────────────────────────── */}
        {activeTab === 'status' && (
          <div className="flex flex-col gap-4">
            {/* Transaction status card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Transaction Status</h2>
              {txLoading ? (
                <LoadingState label="Loading..." />
              ) : transaction ? (
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between items-center">
                    <dt className="text-gray-500">Status</dt>
                    <dd><StatusBadge value={transaction.status} /></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Initiated By</dt>
                    <dd className="font-medium text-gray-900">{transaction.createdBy?.fullName || '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Initiated On</dt>
                    <dd className="font-medium text-gray-900">{formatDate(transaction.createdAt)}</dd>
                  </div>
                  <div className="flex justify-between items-center border-t border-gray-100 pt-3">
                    <dt className="text-gray-500">ERP Sync</dt>
                    <dd>
                      {transaction.erpSyncedAt ? (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle size={13} />
                          <span className="text-xs font-medium">
                            Synced · {formatDateTime(transaction.erpSyncedAt)}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-amber-600">
                          <AlertCircle size={13} />
                          <span className="text-xs font-medium">Not synced</span>
                        </div>
                      )}
                    </dd>
                  </div>

                  {/* Update status — ADMIN/MANAGER */}
                  {isManager && (
                    <div className="pt-3 border-t border-gray-100">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setNewStatus(transaction.status); setStatusModalOpen(true); }}
                        className="w-full justify-center"
                      >
                        Update Status
                      </Button>
                    </div>
                  )}

                  {/* ERP sync — ADMIN only */}
                  {isAdmin && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={handleErpSync}
                        disabled={erpSyncing}
                        className="w-full flex items-center justify-center gap-2 text-sm font-medium text-gray-700 hover:text-primary border border-gray-300 hover:border-primary hover:bg-primary/5 px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                      >
                        <RefreshCw size={14} className={erpSyncing ? 'animate-spin' : ''} />
                        {erpSyncing ? 'Syncing...' : 'Sync to ERP'}
                      </button>
                      {erpMessage && (
                        <p
                          className={`text-xs mt-2 text-center ${
                            erpMessage.includes('success') ? 'text-emerald-600' : 'text-red-600'
                          }`}
                        >
                          {erpMessage}
                        </p>
                      )}
                    </div>
                  )}
                </dl>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">
                  No transaction record yet. Initialize one to begin.
                </p>
              )}
            </div>

            {/* Booking financial summary */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
              <h2 className="text-sm font-semibold text-gray-700 mb-4">Booking Financial Summary</h2>
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Final Agreed Amount</dt>
                  <dd className="font-bold text-primary text-base">
                    {formatCurrency(booking.finalAmount)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Booking Token Paid</dt>
                  <dd className="font-medium text-gray-900">
                    {formatCurrency(booking.bookingAmount)}
                  </dd>
                </div>
                <div className="flex justify-between border-t border-gray-100 pt-3">
                  <dt className="text-gray-500">Total Invoiced (CRM)</dt>
                  <dd className="font-medium text-gray-900">
                    {formatCurrency(invoices.reduce((s, inv) => s + Number(inv.amount), 0))}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Total Payments Recorded</dt>
                  <dd className="font-medium text-emerald-700">
                    {formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0))}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        )}
      </div>

      {/* Update Status Modal */}
      <Modal
        isOpen={statusModalOpen}
        onClose={() => { setStatusModalOpen(false); setStatusError(''); }}
        title="Update Transaction Status"
        size="sm"
      >
        <div className="flex flex-col gap-4">
          <Select
            label="New Status"
            name="status"
            value={newStatus}
            onChange={(e) => { setNewStatus(e.target.value); setStatusError(''); }}
            options={TRANSACTION_STATUS_OPTIONS}
            placeholder="Select status..."
            error={statusError}
          />
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-200">
            <Button
              variant="ghost"
              onClick={() => { setStatusModalOpen(false); setStatusError(''); }}
            >
              Cancel
            </Button>
            <Button
              loading={statusUpdating}
              onClick={handleStatusUpdate}
            >
              Update
            </Button>
          </div>
        </div>
      </Modal>
    </PageLayout>
  );
};

export default TransactionDetailPage;
