import api from '../utils/axios';

const negotiationService = {
  createNegotiation: async (data) => {
    const res = await api.post('/negotiations', data);
    return res.data.data.negotiation;
  },

  listNegotiations: async (inquiryId) => {
    const res = await api.get('/negotiations', { params: { inquiryId } });
    return res.data.data.items;
  },
};

export default negotiationService;
