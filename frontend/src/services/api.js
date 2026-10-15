import axios from 'axios';

const API_BASE = 'http://localhost:8001/api';

const api = axios.create({ baseURL: API_BASE });

export const detectImage = (file) => {
    const form = new FormData();
    form.append('file', file);
    return api.post('/detect/image', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
    });
};

export const detectFrame = (frameB64, sessionId, save = true) =>
    api.post('/detect/frame', {
        frame: frameB64,
        session_id: sessionId,
        save_detections: save,
    });

export const getHistory = (params) => api.get('/history', { params });

export const deleteRecord = (id) => api.delete(`/history/${id}`);

export const getAnalytics = () => api.get('/analytics');

export const getHealth = () => api.get('/health');

export const getSensorLatest = () => api.get('/sensor/latest');

export const exportCSV = (params) => {
    const query = new URLSearchParams(params).toString();
    window.open(`${API_BASE}/export/csv${query ? '?' + query : ''}`, '_blank');
};

export default api;
