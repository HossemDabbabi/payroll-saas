import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('payroll_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('payroll_token');
      localStorage.removeItem('payroll_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

export const payrollAPI = {
  upload: (formData) => api.post('/payroll/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  getAll: (params) => api.get('/payroll', { params }),
  getById: (id) => api.get(`/payroll/${id}`),
  delete: (id) => api.delete(`/payroll/${id}`),
  getDashboardStats: () => api.get('/payroll/dashboard/stats'),
};

export const reportAPI = {
  downloadExcel: (payrollId) => api.get(`/reports/${payrollId}/excel`, { responseType: 'blob' }),
  downloadPayslip: (payrollId, matricule) =>
    api.get(`/reports/${payrollId}/payslip/${matricule}`, { responseType: 'blob' }),
};

export const subscriptionAPI = {
  getPlans: () => api.get('/subscriptions/plans'),
  getCurrent: () => api.get('/subscriptions/current'),
  upgrade: (data) => api.post('/subscriptions/upgrade', data),
};

export const copilotAPI = {
  chat: (query) => api.post('/copilot/chat', { query }),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getUsers: () => api.get('/admin/users'),
  updateUser: (id, data) => api.patch(`/admin/users/${id}`, data),
  deleteUser: (id) => api.delete(`/admin/users/${id}`),
  getCompanies: () => api.get('/admin/companies'),
  getCompany: (id) => api.get(`/admin/companies/${id}`),
  updateSubscription: (id, data) => api.patch(`/admin/companies/${id}/subscription`, data),
  getPayments: (params) => api.get('/admin/payments', { params }),
  updatePayment: (id, data) => api.patch(`/admin/payments/${id}`, data),
  getPayroll: (params) => api.get('/admin/payroll', { params }),
  getPayrollRecord: (id) => api.get(`/admin/payroll/${id}`),
  deletePayroll: (id) => api.delete(`/admin/payroll/${id}`),
};

export default api;
