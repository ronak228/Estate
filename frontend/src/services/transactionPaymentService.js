import api from '../utils/axios';

const transactionPaymentService = {
  createPayment: async (bookingId, data) => {
    const res = await api.post(`/bookings/${bookingId}/transaction-payments`, data);
    return res.data.data.payment;
  },

  listPayments: async (bookingId, params = {}) => {
    const res = await api.get(`/bookings/${bookingId}/transaction-payments`, { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  /**
   * Reconcile a payment to an invoice.
   * Sets TransactionPayment.invoiceId and status = RECONCILED.
   * Does NOT auto-change Invoice.status — ADMIN updates that separately.
   */
  reconcile: async (paymentId, invoiceId) => {
    const res = await api.patch(`/transaction-payments/${paymentId}/reconcile`, { invoiceId });
    return res.data.data.payment;
  },
};

export default transactionPaymentService;
