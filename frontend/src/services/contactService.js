import api from '../utils/axios';

const contactService = {
  listContacts: async (params = {}) => {
    const res = await api.get('/contacts', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getContact: async (id) => {
    const res = await api.get(`/contacts/${id}`);
    return res.data.data.contact;
  },

  updateContact: async (id, data) => {
    const res = await api.put(`/contacts/${id}`, data);
    return res.data.data.contact;
  },
};

export default contactService;
