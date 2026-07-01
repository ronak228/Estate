import api from '../utils/axios';

const authService = {
  /**
   * Change authenticated user's password.
   */
  changePassword: async (currentPassword, newPassword) => {
    const res = await api.post('/auth/change-password', { currentPassword, newPassword });
    return res.data;
  },

  /**
   * Fetch current user profile.
   */
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data.data.user;
  },
};

export default authService;
