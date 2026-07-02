import api from '../utils/axios';

const statsService = {
  getStats: async () => {
    const res = await api.get('/stats');
    return res.data.data;
  },
};

export default statsService;
