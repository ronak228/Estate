import api from '../utils/axios';

const searchService = {
  /**
   * Global, typo-tolerant search (GET /api/search?q=) across contacts,
   * inquiries, bookings, projects, and units. Returns grouped, ranked
   * results — see backend/src/controllers/searchController.js.
   */
  globalSearch: async (query) => {
    const res = await api.get('/search', { params: { q: query } });
    return res.data.data;
  },
};

export default searchService;
