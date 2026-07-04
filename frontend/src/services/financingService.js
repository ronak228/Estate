import api from '../utils/axios';

const financingService = {
  getFinancing: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/financing`);
    return res.data.data.financing; // may be null if not created yet
  },

  createFinancing: async (bookingId, data) => {
    const res = await api.post(`/bookings/${bookingId}/financing`, data);
    return res.data.data.financing;
  },

  updateFinancing: async (bookingId, data) => {
    const res = await api.patch(`/bookings/${bookingId}/financing`, data);
    return res.data.data.financing;
  },

  syncErp: async (bookingId) => {
    const res = await api.post(`/bookings/${bookingId}/financing/erp-sync`);
    return res.data.data.financing;
  },
};

export default financingService;
