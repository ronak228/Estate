import api from '../utils/axios';

const siteVisitService = {
  createSiteVisit: async (data) => {
    const res = await api.post('/site-visits', data);
    return res.data.data.siteVisit;
  },

  listSiteVisits: async (params = {}) => {
    const res = await api.get('/site-visits', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getSiteVisit: async (id) => {
    const res = await api.get(`/site-visits/${id}`);
    return res.data.data.siteVisit;
  },

  updateSiteVisit: async (id, data) => {
    const res = await api.patch(`/site-visits/${id}`, data);
    return res.data.data.siteVisit;
  },

  // Module 3 — mark a site visit as completed
  completeSiteVisit: async (id, notes) => {
    const res = await api.patch(`/site-visits/${id}/complete`, { notes });
    return res.data.data.siteVisit;
  },
};

export default siteVisitService;
