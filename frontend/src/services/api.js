import axios from 'axios';

// Configuração base do axios
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para adicionar token de autenticação
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth-storage');
  if (token) {
    try {
      const authData = JSON.parse(token);
      if (authData?.state?.token) {
        config.headers.Authorization = `Bearer ${authData.state.token}`;
      }
    } catch (error) {
      console.error('Erro ao parse do token:', error);
    }
  }
  return config;
});

// Interceptor para tratar erros de resposta
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      try {
        const authStorage = localStorage.getItem('auth-storage');
        if (authStorage) {
          const authData = JSON.parse(authStorage);
          const refreshToken = authData?.state?.refreshToken;
          
          if (refreshToken) {
            // Tentar renovar o token
            const response = await api.post('/token/refresh/', { refresh: refreshToken });
            const newAccessToken = response.data.access;
            
            // Atualizar o token no storage
            authData.state.token = newAccessToken;
            localStorage.setItem('auth-storage', JSON.stringify(authData));
            
            // Refazer a requisição original
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Erro ao renovar token:', refreshError);
      }
      
      // Se chegou aqui, o refresh falhou ou não há token
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    }
    
    return Promise.reject(error);
  }
);

// Serviços de autenticação
export const authService = {
  login: async (email, password) => {
    const response = await api.post('/token/', { username: email, password });
    return response.data;
  },
  
  register: async (username, password, email = '') => {
    const response = await api.post('/register/', { username, password, email });
    return response.data;
  },
  
  refreshToken: async (refreshToken) => {
    const response = await api.post('/token/refresh/', { refresh: refreshToken });
    return response.data;
  },
};

// Serviços de despesas
export const expenseService = {
  getAll: async (params = {}) => {
    const response = await api.get('/expenses/', { params });
    return response.data;
  },
  
  getById: async (id) => {
    const response = await api.get(`/expenses/${id}/`);
    return response.data;
  },
  
  create: async (expense) => {
    const response = await api.post('/expenses/', expense);
    return response.data;
  },
  
  update: async (id, expense) => {
    const response = await api.put(`/expenses/${id}/`, expense);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/expenses/${id}/`);
  },
  
  export: async (params = {}) => {
    const response = await api.get('/expenses/export/', {
      params,
      responseType: 'blob',
    });
    return response.data;
  },
  
  getMonthlyReport: async (params = {}) => {
    const response = await api.get('/expenses/report/monthly/', { params });
    return response.data;
  },
};

// Serviços de renda mensal
export const incomeService = {
  getAll: async (params = {}) => {
    const response = await api.get('/monthly-income/', { params });
    return response.data;
  },
  
  create: async (income) => {
    const response = await api.post('/monthly-income/', income);
    return response.data;
  },
  
  update: async (id, income) => {
    const response = await api.put(`/monthly-income/${id}/`, income);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/monthly-income/${id}/`);
  },
  
  export: async (params = {}) => {
    const response = await api.get('/monthly-income/export/', { 
      params,
      responseType: 'blob'
    });
    return response.data;
  },
};

// Serviços de análise financeira
export const analysisService = {
  getFinancialSummary: async (month) => {
    const params = month ? { month } : {};
    const response = await api.get('/financial-summary/', { params });
    return response.data;
  },
  
  generateAlerts: async (month) => {
    const response = await api.post('/generate-alerts/', { month });
    return response.data;
  },
  
  getAlerts: async () => {
    const response = await api.get('/financial-alerts/');
    return response.data;
  },
  
  markAlertAsRead: async (id) => {
    const response = await api.patch(`/financial-alerts/${id}/mark_as_read/`);
    return response.data;
  },
  
  markAllAlertsAsRead: async () => {
    const response = await api.patch('/financial-alerts/mark_all_as_read/');
    return response.data;
  },
};

// Serviços de usuário
export const userService = {
  updateProfile: async (profileData) => {
    const response = await api.patch('/users/profile/', profileData);
    return response.data;
  },
  
  getLoginHistory: async () => {
    const response = await api.get('/users/login-history/');
    return response.data;
  },
  
  getDataUsage: async () => {
    const response = await api.get('/users/data-usage/');
    return response.data;
  },
  
  getPreferences: async () => {
    const response = await api.get('/users/preferences/');
    return response.data;
  },
  
  updatePreferences: async (preferences) => {
    const response = await api.patch('/users/preferences/', preferences);
    return response.data;
  },
  
  deleteAccount: async () => {
    await api.delete('/users/profile/');
  },
  
  exportData: async () => {
    const response = await api.get('/users/export-data/', {
      responseType: 'blob',
    });
    return response.data;
  },
};

export default api;
