import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // Estado
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      
      // Ações
      login: (accessToken, refreshToken, userData = null) => {
        set({
          user: userData,
          token: accessToken,
          refreshToken: refreshToken,
          isAuthenticated: true,
        });
      },
      
      logout: () => {
        set({
          user: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
        });
      },
      
      updateUser: (userData) => {
        set({ user: userData });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export const useAppStore = create((set, get) => ({
  // Estado da aplicação
  expenses: [],
  monthlyIncomes: [],
  financialAlerts: [],
  isLoading: false,
  
  // Ações para despesas
  setExpenses: (expenses) => set({ expenses }),
  addExpense: (expense) => set((state) => ({ 
    expenses: [...state.expenses, expense] 
  })),
  updateExpense: (id, expense) => set((state) => ({
    expenses: state.expenses.map(e => e.id === id ? { ...e, ...expense } : e)
  })),
  removeExpense: (id) => set((state) => ({
    expenses: state.expenses.filter(e => e.id !== id)
  })),
  
  // Ações para renda mensal
  setMonthlyIncomes: (incomes) => set({ monthlyIncomes: incomes }),
  addMonthlyIncome: (income) => set((state) => ({
    monthlyIncomes: [...state.monthlyIncomes, income]
  })),
  
  // Ações para alertas
  setFinancialAlerts: (alerts) => set({ financialAlerts: alerts }),
  
  // Loading
  setLoading: (loading) => set({ isLoading: loading }),
}));
