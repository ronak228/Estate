import api from '../utils/axios';

const transactionService = {
  // ── Transaction record (per booking) ─────────────────────────────────────

  createTransaction: async (bookingId) => {
    const res = await api.post(`/bookings/${bookingId}/transaction`);
    return res.data.data.transaction;
  },

  getTransaction: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/transaction`);
    return res.data.data.transaction; // may be null if not initialized yet
  },

  updateTransactionStatus: async (bookingId, status) => {
    const res = await api.patch(`/bookings/${bookingId}/transaction/status`, { status });
    return res.data.data.transaction;
  },

  syncErp: async (bookingId) => {
    const res = await api.post(`/bookings/${bookingId}/transaction/erp-sync`);
    return res.data.data.transaction;
  },

  // ── Sidebar-level list ────────────────────────────────────────────────────

  listTransactions: async (params = {}) => {
    const res = await api.get('/transactions', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  // ── Title transfer ────────────────────────────────────────────────────────

  createTitleTransfer: async (bookingId, data = {}) => {
    const res = await api.post(`/bookings/${bookingId}/title-transfer`, data);
    return res.data.data.titleTransfer;
  },

  getTitleTransfer: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/title-transfer`);
    return res.data.data.titleTransfer; // may be null
  },

  updateTitleTransfer: async (bookingId, data) => {
    const res = await api.patch(`/bookings/${bookingId}/title-transfer`, data);
    return res.data.data.titleTransfer;
  },
};

export default transactionService;
