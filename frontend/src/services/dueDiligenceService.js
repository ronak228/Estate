import api from '../utils/axios';

const dueDiligenceService = {
  getDueDiligence: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/due-diligence`);
    return res.data.data.dueDiligence; // may be null if not created yet
  },

  createDueDiligence: async (bookingId, data) => {
    const res = await api.post(`/bookings/${bookingId}/due-diligence`, data);
    return res.data.data.dueDiligence;
  },

  updateDueDiligence: async (bookingId, data) => {
    const res = await api.patch(`/bookings/${bookingId}/due-diligence`, data);
    return res.data.data.dueDiligence;
  },
};

export default dueDiligenceService;
