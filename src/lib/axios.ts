import axios from 'axios';
import { toast } from 'sonner';

const api = axios.create({
  //baseURL: "https://medi-bridge-backend-r95j.onrender.com/api/v1",
  //baseURL: "https://deploy-medibridge-backend.onrender.com/api/v1",
  baseURL:"https://medi-bridge-backend-hthrafcgftbnasgh.centralindia-01.azurewebsites.net/api/v1",
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'An error occurred';
    toast.error(message);
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api; 
