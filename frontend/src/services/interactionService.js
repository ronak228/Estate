import api from '../utils/axios';

const interactionService = {
  createInteraction: async (contactId, data) => {
    const res = await api.post(`/contacts/${contactId}/interactions`, data);
    return res.data.data.interaction;
  },

  listInteractions: async (contactId, params = {}) => {
    const res = await api.get(`/contacts/${contactId}/interactions`, { params });
    return res.data.data; // { items, total, page, pageSize }
  },
};

export default interactionService;
