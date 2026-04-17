import axios from 'axios';
const API_BASE = 'https://hireflow-vsxq.onrender.com/api';
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);
export const auth = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  me: () => api.get('/auth/me'),
  users: () => api.get('/auth/users'),
  createUser: (data) => api.post('/auth/users', data),
};
export const jobs = {
  list: (params) => api.get('/jobs', { params }),
  get: (id) => api.get(`/jobs/${id}`),
  create: (data) => api.post('/jobs', data),
  update: (id, data) => api.put(`/jobs/${id}`, data),
  delete: (id) => api.delete(`/jobs/${id}`),
  stats: (id) => api.get(`/jobs/${id}/stats`),
};
export const candidates = {
  list: (params) => api.get('/candidates', { params }),
  get: (id) => api.get(`/candidates/${id}`),
  create: (data) => api.post('/candidates', data),
  update: (id, data) => api.put(`/candidates/${id}`, data),
  applications: (id) => api.get(`/candidates/${id}/applications`),
};
export const applications = {
  list: (params) => api.get('/applications', { params }),
  get: (id) => api.get(`/applications/${id}`),
  create: (data) => api.post('/applications', data),
  updateStage: (id, stage, reason) => api.put(`/applications/${id}/stage`, { stage, reason }),
  updateNotes: (id, notes) => api.put(`/applications/${id}/notes`, { notes }),
  history: (id) => api.get(`/applications/${id}/history`),
  pipeline: (jobId) => api.get('/applications/pipeline', { params: { job_id: jobId } }),
};
export const interviews = {
  list: (params) => api.get('/interviews', { params }),
  get: (id) => api.get(`/interviews/${id}`),
  create: (data) => api.post('/interviews', data),
  update: (id, data) => api.put(`/interviews/${id}`, data),
  delete: (id) => api.delete(`/interviews/${id}`),
  submitScorecard: (id, data) => api.post(`/interviews/${id}/scorecard`, data),
  scorecards: (id) => api.get(`/interviews/${id}/scorecard`),
};
export const offers = {
  list: (params) => api.get('/offers', { params }),
  get: (id) => api.get(`/offers/${id}`),
  create: (data) => api.post('/offers', data),
  update: (id, data) => api.put(`/offers/${id}`, data),
};
export const analytics = {
  overview: (days) => api.get('/analytics/overview', { params: { days } }),
  funnel: (jobId) => api.get('/analytics/funnel', { params: { job_id: jobId } }),
  timeToHire: () => api.get('/analytics/time-to-hire'),
  sources: () => api.get('/analytics/sources'),
};
export default api;
