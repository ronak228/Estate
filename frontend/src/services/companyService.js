import api from '../utils/axios';

const companyService = {
  // ─── SUPER_ADMIN ────────────────────────────────────────────────────────────

  createCompany: async (data) => {
    const res = await api.post('/companies', data);
    return res.data.data;
  },

  listCompanies: async (params = {}) => {
    const res = await api.get('/companies', { params });
    return res.data.data;
  },

  getCompanyById: async (id) => {
    const res = await api.get(`/companies/${id}`);
    return res.data.data.company;
  },

  updateCompanyStatus: async (id, status) => {
    const res = await api.patch(`/companies/${id}/status`, { status });
    return res.data.data.company;
  },

  setCompanyAdmin: async (id, data) => {
    const res = await api.patch(`/companies/${id}/admin`, data);
    return res.data.data.admin;
  },

  // ─── Own Company ────────────────────────────────────────────────────────────

  getMyCompany: async () => {
    const res = await api.get('/companies/me');
    return res.data.data.company;
  },

  updateMyCompanySettings: async (formData) => {
    const res = await api.put('/companies/me/settings', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.company;
  },

  // ─── Employee Management ────────────────────────────────────────────────────

  createEmployee: async (data) => {
    const res = await api.post('/companies/me/employees', data);
    return res.data.data.user;
  },

  listEmployees: async (params = {}) => {
    const res = await api.get('/companies/me/employees', { params });
    return res.data.data;
  },

  getEmployee: async (id) => {
    const res = await api.get(`/companies/me/employees/${id}`);
    return res.data.data.employee;
  },

  updateEmployee: async (id, data) => {
    const res = await api.put(`/companies/me/employees/${id}`, data);
    return res.data.data.user;
  },

  updateEmployeeStatus: async (id, isActive) => {
    const res = await api.patch(`/companies/me/employees/${id}/status`, { isActive });
    return res.data.data.user;
  },

  resetEmployeePassword: async (id, newPassword) => {
    const res = await api.patch(`/companies/me/employees/${id}/reset-password`, { newPassword });
    return res.data;
  },
};

export default companyService;
