import api from '../utils/axios';

const bookingDocumentService = {
  /**
   * Upload a booking document. Uses multipart/form-data.
   * @param {string} bookingId
   * @param {File} file
   * @param {string} type - DocumentType enum value
   */
  uploadDocument: async (bookingId, file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await api.post(`/bookings/${bookingId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.document;
  },

  listDocuments: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/documents`);
    return res.data.data.items;
  },

  /**
   * Download a booking document through the authenticated, tenant-scoped route.
   * Returns a Blob (JWT is attached by the axios interceptor).
   */
  downloadDocument: async (bookingId, documentId) => {
    const res = await api.get(
      `/bookings/${bookingId}/documents/${documentId}/download`,
      { responseType: 'blob' }
    );
    return res.data;
  },

  deleteDocument: async (bookingId, documentId) => {
    await api.delete(`/bookings/${bookingId}/documents/${documentId}`);
  },
};

export default bookingDocumentService;
