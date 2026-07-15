import api from '../utils/axios';

const bookingService = {
  createBooking: async (data) => {
    const res = await api.post('/bookings', data);
    return res.data.data.booking;
  },

  listBookings: async (params = {}) => {
    const res = await api.get('/bookings', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getBooking: async (id) => {
    const res = await api.get(`/bookings/${id}`);
    return res.data.data.booking;
  },

  /**
   * Receipt endpoint — returns binary Blob (same pattern as quotation PDF).
   */
  getReceiptBlob: async (id) => {
    const res = await api.get(`/bookings/${id}/receipt`, { responseType: 'blob' });
    return res.data;
  },

  retryErpSync: async (id) => {
    const res = await api.post(`/bookings/${id}/sync-erp`);
    return res.data.data;
  },

  cancelBooking: async (id, reason) => {
    const res = await api.post(`/bookings/${id}/cancel`, { reason });
    return res.data.data.booking;
  },

  addPayment: async (bookingId, data) => {
    const res = await api.post(`/bookings/${bookingId}/payments`, data);
    return res.data.data.payment;
  },

  listPayments: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/payments`);
    return res.data.data.items;
  },

  /**
   * Receipt for a single payment row. `paymentId` may be the literal string
   * "token" for the booking's token/booking amount (see utils/booking.js).
   */
  getPaymentReceiptBlob: async (bookingId, paymentId) => {
    const res = await api.get(`/bookings/${bookingId}/payments/${paymentId}/receipt`, { responseType: 'blob' });
    return res.data;
  },
};

export default bookingService;
