import api from '../utils/axios';

const projectService = {
  createProject: async (data) => {
    const res = await api.post('/projects', data);
    return res.data.data.project;
  },

  listProjects: async (params = {}) => {
    const res = await api.get('/projects', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getProject: async (id) => {
    const res = await api.get(`/projects/${id}`);
    return res.data.data; // { project, unitSummary }
  },

  updateProject: async (id, data) => {
    const res = await api.put(`/projects/${id}`, data);
    return res.data.data.project;
  },
};

export default projectService;
