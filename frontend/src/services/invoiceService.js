import api from '../utils/axios';

const invoiceService = {
  createInvoice: async (bookingId, data) => {
    const res = await api.post(`/bookings/${bookingId}/invoices`, data);
    return res.data.data.invoice;
  },

  listInvoices: async (bookingId, params = {}) => {
    const res = await api.get(`/bookings/${bookingId}/invoices`, { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getInvoice: async (invoiceId) => {
    const res = await api.get(`/invoices/${invoiceId}`);
    return res.data.data.invoice;
  },

  /**
   * PDF endpoint — returns binary Blob.
   * Same pattern as quotation PDF (Module 3) and booking receipt (Module 4).
   * INTENTIONAL EXCEPTION: this endpoint does NOT return the JSON envelope.
   */
  getInvoicePdfBlob: async (invoiceId) => {
    const res = await api.get(`/invoices/${invoiceId}/pdf`, { responseType: 'blob' });
    return res.data;
  },

  updateInvoiceStatus: async (invoiceId, status) => {
    const res = await api.patch(`/invoices/${invoiceId}/status`, { status });
    return res.data.data.invoice;
  },
};

export default invoiceService;
