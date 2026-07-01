import api from '../utils/axios';

const unitService = {
  createUnit: async (data) => {
    const res = await api.post('/units', data);
    return res.data.data.unit;
  },

  listUnits: async (params = {}) => {
    const res = await api.get('/units', { params });
    return res.data.data.items;
  },

  getUnit: async (id) => {
    const res = await api.get(`/units/${id}`);
    return res.data.data.unit;
  },

  updateUnit: async (id, data) => {
    const res = await api.put(`/units/${id}`, data);
    return res.data.data.unit;
  },

  updateStatus: async (id, status) => {
    const res = await api.patch(`/units/${id}/status`, { status });
    return res.data.data.unit;
  },
};

export default unitService;
