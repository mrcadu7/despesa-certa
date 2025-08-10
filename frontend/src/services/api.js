import axios from 'axios';
import CryptoJS from 'crypto-js';

// Configuração base do axios
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Chave para criptografia (em produção, deve vir de variável de ambiente)
const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'despesa-certa-secret-key-2025';

// Funções de criptografia usando AES (compatível com browser)
const encryptPassword = (password) => {
  try {
    return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Erro ao criptografar senha:', error);
    return password; // Fallback para senha em texto plano
  }
};

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

// Interceptor para tratar erros de resposta e refresh automático
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
            const response = await axios.post(`${API_BASE_URL}/token/refresh/`, { 
              refresh: refreshToken 
            });
            const newTokens = response.data;
            
            // Atualizar tokens no storage
            authData.state.token = newTokens.access;
            if (newTokens.refresh) {
              authData.state.refreshToken = newTokens.refresh;
            }
            localStorage.setItem('auth-storage', JSON.stringify(authData));
            
            // Refazer a requisição original
            originalRequest.headers.Authorization = `Bearer ${newTokens.access}`;
            return api(originalRequest);
          }
        }
      } catch (refreshError) {
        console.error('Erro ao renovar token:', refreshError);
        // Limpar storage e redirecionar para login
        localStorage.removeItem('auth-storage');
        window.location.href = '/auth';
        return Promise.reject(refreshError);
      }
      
      // Se chegou aqui, não há token de refresh
      localStorage.removeItem('auth-storage');
      window.location.href = '/auth';
    }
    
    return Promise.reject(error);
  }
);

// Função para verificar e renovar token automaticamente
const scheduleTokenRefresh = () => {
  setInterval(async () => {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const authData = JSON.parse(authStorage);
        const token = authData?.state?.token;
        const refreshToken = authData?.state?.refreshToken;
        
        if (token && refreshToken) {
          // Decodificar o token para verificar se está próximo do vencimento
          const tokenPayload = JSON.parse(atob(token.split('.')[1]));
          const currentTime = Math.floor(Date.now() / 1000);
          const timeUntilExpiry = tokenPayload.exp - currentTime;
          
          // Se o token expira em menos de 30 minutos, renovar
          if (timeUntilExpiry < 1800) {
            const response = await axios.post(`${API_BASE_URL}/token/refresh/`, {
              refresh: refreshToken
            });
            const newTokens = response.data;
            
            // Atualizar tokens no storage
            authData.state.token = newTokens.access;
            if (newTokens.refresh) {
              authData.state.refreshToken = newTokens.refresh;
            }
            localStorage.setItem('auth-storage', JSON.stringify(authData));
            
            console.log('Token renovado automaticamente');
          }
        }
      }
    } catch (error) {
      console.error('Erro na renovação automática do token:', error);
    }
  }, 300000); // Verificar a cada 5 minutos
};

// Iniciar verificação automática de token
scheduleTokenRefresh();

// Serviços de autenticação
export const authService = {
  login: async (email, password) => {
    const encryptedPassword = encryptPassword(password);
    const response = await api.post('/token/', { 
      username: email, 
      password: encryptedPassword,
      encrypted: true
    });
    return response.data;
  },
  
  register: async (username, password, email = '') => {
    // Criptografar a senha antes de enviar
    const encryptedPassword = encryptPassword(password);
    const response = await api.post('/register/', { 
      username, 
      password: encryptedPassword, 
      email,
      encrypted: true // Flag para indicar que a senha está criptografada
    });
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
  
  expenseExport: async (params = {}) => {
    const response = await api.get('/export-expense-csv/', {
      params,
      responseType: 'blob',
    });
    return response;
  },
  
  getMonthlyReport: async (params = {}) => {
    const response = await api.get('/expenses/report/monthly/', { params });
    return response.data;
  },
  bulkDelete: async (ids) => {
    const response = await api.delete('/expenses/bulk_delete/', { data: { ids } });
    return response.data;
  },
  bulkPatch: async (ids, updateFields) => {
    const response = await api.patch('/expenses/bulk_update/', { ids, ...updateFields });
    return response.data;
  },
};

// Serviços de renda mensal
export const incomeService = {
  bulkDelete: async (ids) => {
    const response = await api.delete('/monthly-income/bulk_delete/', { data: { ids } });
    return response.data;
  },
  bulkPatch: async (ids, updateFields) => {
    const response = await api.patch('/monthly-income/bulk_update/', { ids, ...updateFields });
    return response.data;
  },
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
  
  patch: async (id, income) => {
    const response = await api.patch(`/monthly-income/${id}/`, income);
    return response.data;
  },
  
  delete: async (id) => {
    await api.delete(`/monthly-income/${id}/`);
  },
  
  incomeExport: async (params = {}) => {
    const response = await api.get('/export-income-csv/', {
      params,
      responseType: 'blob',
    });
    return response;
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
