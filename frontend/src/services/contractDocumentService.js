import api from '../utils/axios';

const contractDocumentService = {
  /**
   * Upload a contract document. Uses multipart/form-data.
   * @param {string} bookingId
   * @param {File} file
   * @param {string} type - ContractDocumentType enum value
   */
  uploadDocument: async (bookingId, file, type) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', type);

    const res = await api.post(`/bookings/${bookingId}/contract-documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data.data.contractDocument;
  },

  listDocuments: async (bookingId) => {
    const res = await api.get(`/bookings/${bookingId}/contract-documents`);
    return res.data.data.items;
  },

  updateSignatureStatus: async (bookingId, documentId, payload) => {
    const res = await api.patch(
      `/bookings/${bookingId}/contract-documents/${documentId}/signature`,
      payload
    );
    return res.data.data.contractDocument;
  },

  deleteDocument: async (bookingId, documentId) => {
    await api.delete(`/bookings/${bookingId}/contract-documents/${documentId}`);
  },
};

export default contractDocumentService;
