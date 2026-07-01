import api from '../utils/axios';

const quotationService = {
  createQuotation: async (data) => {
    const res = await api.post('/quotations', data);
    return res.data.data.quotation;
  },

  listQuotations: async (params = {}) => {
    const res = await api.get('/quotations', { params });
    return res.data.data; // { items, total, page, pageSize }
  },

  getQuotation: async (id) => {
    const res = await api.get(`/quotations/${id}`);
    return res.data.data.quotation;
  },

  /**
   * PDF endpoint — intentionally bypasses the standard { success, message, data }
   * envelope. Returns a Blob for direct download/preview.
   */
  getQuotationPdfBlob: async (id) => {
    const res = await api.get(`/quotations/${id}/pdf`, { responseType: 'blob' });
    return res.data; // raw Blob
  },

  updateDecision: async (id, decision) => {
    const res = await api.patch(`/quotations/${id}/decision`, { decision });
    return res.data.data.quotation;
  },
};

export default quotationService;
