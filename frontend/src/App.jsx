import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box } from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';

import theme from './theme/theme';
import { useAuthStore } from './store';
import Navbar from './components/Navbar';

// Pages
import Dashboard from './pages/Dashboard';
import Expenses from './pages/Expenses';
import Income from './pages/Income';
// import Reports from './pages/Reports';
import Profile from './pages/Profile';
import Auth from './pages/Auth';
import ExpenseForm from './pages/ExpenseForm';
import IncomeForm from './pages/IncomeForm';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth" replace />;
  }
  
  return children;
};

// Layout Component
const Layout = ({ children }) => {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Navbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          bgcolor: 'background.default',
          width: '100%',
          minHeight: 'calc(100vh - 64px)',
          padding: 0,
          margin: 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

function App() {
  const { isAuthenticated } = useAuthStore();

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
        <Router>
          <Routes>
            {/* Rota de autenticação */}
            <Route 
              path="/auth" 
              element={
                isAuthenticated ? (
                  <Navigate to="/dashboard" replace />
                ) : (
                  <Auth />
                )
              } 
            />
            
            {/* Rotas protegidas */}
            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Dashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/expenses/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <ExpenseForm />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/incomes/new"
              element={
                <ProtectedRoute>
                  <Layout>
                    <IncomeForm />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/expenses"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Expenses />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            <Route
              path="/income"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Income />
                  </Layout>
                </ProtectedRoute>
              }
            />
            

            
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Layout>
                    <Profile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            
            {/* Redirecionamento da rota raiz */}
            <Route
              path="/"
              element={
                <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />
              }
            />
            
            {/* Rota 404 */}
            <Route
              path="*"
              element={
                <Navigate to={isAuthenticated ? "/dashboard" : "/auth"} replace />
              }
            />
          </Routes>
        </Router>
      </LocalizationProvider>
    </ThemeProvider>
  );
}

export default App;
