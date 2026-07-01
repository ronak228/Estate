import api from '../utils/axios';

const inquiryService = {
  // ─── Reference data ──────────────────────────────────────────────────────────

  getAssignableUsers: async () => {
    const res = await api.get('/inquiries/meta/users');
    return res.data.data.users;
  },

  getProjects: async () => {
    const res = await api.get('/inquiries/meta/projects');
    return res.data.data.projects;
  },

  getBrokers: async () => {
    const res = await api.get('/inquiries/meta/brokers');
    return res.data.data.brokers;
  },

  // ─── Inquiry CRUD ─────────────────────────────────────────────────────────────

  createInquiry: async (data) => {
    const res = await api.post('/inquiries', data);
    return res.data.data.inquiry;
  },

  listInquiries: async (params = {}) => {
    const res = await api.get('/inquiries', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getInquiry: async (id) => {
    const res = await api.get(`/inquiries/${id}`);
    return res.data.data.inquiry;
  },

  updateInquiry: async (id, data) => {
    const res = await api.put(`/inquiries/${id}`, data);
    return res.data.data.inquiry;
  },

  // ─── Stage & Assignment ───────────────────────────────────────────────────────

  assignInquiry: async (id, assignedToId) => {
    const res = await api.patch(`/inquiries/${id}/assign`, { assignedToId });
    return res.data.data.inquiry;
  },

  changeStage: async (id, stage) => {
    const res = await api.patch(`/inquiries/${id}/stage`, { stage });
    return res.data.data.inquiry;
  },

  qualifyInquiry: async (id, notes) => {
    const res = await api.patch(`/inquiries/${id}/qualify`, { notes });
    return res.data.data.inquiry;
  },

  // ─── Follow-ups ───────────────────────────────────────────────────────────────

  createFollowUp: async (inquiryId, data) => {
    const res = await api.post(`/inquiries/${inquiryId}/follow-ups`, data);
    return res.data.data.followUp;
  },

  updateFollowUp: async (inquiryId, followUpId, data) => {
    const res = await api.patch(`/inquiries/${inquiryId}/follow-ups/${followUpId}`, data);
    return res.data.data.followUp;
  },

  // ─── Activity Timeline ────────────────────────────────────────────────────────

  getActivities: async (inquiryId) => {
    const res = await api.get(`/inquiries/${inquiryId}/activities`);
    return res.data.data.items;
  },
};

export default inquiryService;
