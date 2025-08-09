import React, { useState } from 'react';
import '../styles/Auth.css';
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Link,
  Alert,
  Tabs,
  Tab,
  Grid,
  IconButton,
  InputAdornment,
  Checkbox,
  FormControlLabel,
  Divider,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Google,
  GitHub,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store';
import { authService } from '../services/api';

const Auth = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuthStore();
  
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [loginData, setLoginData] = useState({
    email: '',
    password: '',
    remember_me: false,
  });
  
  const [registerData, setRegisterData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    confirm_password: '',
    accept_terms: false,
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const response = await authService.login(
        loginData.email,
        loginData.password
      );
      
      // JWT tokens - access e refresh
      login(response.access, response.refresh);
      
      // Redirecionar para a página anterior ou dashboard
      const from = location.state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
      
    } catch (err) {
      setError(err.response?.data?.detail || err.response?.data?.error || 'Erro ao fazer login');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      if (registerData.password !== registerData.confirm_password) {
        setError('Senhas não coincidem');
        return;
      }
      
      if (!registerData.accept_terms) {
        setError('Você deve aceitar os termos de uso');
        return;
      }
      
      await authService.register(
        registerData.email, // Como username
        registerData.password,
        registerData.email
      );
      
      setSuccess('Conta criada com sucesso! Faça login para continuar.');
      setTab(0); // Voltar para o login
      
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao criar conta');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!loginData.email) {
      setError('Digite seu email para recuperar a senha');
      return;
    }
    
    try {
      await authService.forgotPassword(loginData.email);
      setSuccess('Instruções de recuperação enviadas para seu email');
    } catch (err) {
      setError('Erro ao enviar email de recuperação');
    }
  };

  const handleSocialLogin = async (provider) => {
    try {
      // Implementar login social quando disponível no backend
      setError(`Login com ${provider} não disponível ainda`);
    } catch (err) {
      setError(`Erro no login com ${provider}`);
    }
  };

  return (
    <Box className="auth-root">
      <Card className="auth-card" sx={{ boxShadow: 3 }}>
        <CardContent sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Typography variant="h4" component="h1" gutterBottom color="primary">
              Despesa Certa
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Gerencie suas finanças com inteligência
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
              {error}
            </Alert>
          )}

          {success && (
            <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccess(null)}>
              {success}
            </Alert>
          )}

          <Tabs value={tab} onChange={(e, newValue) => setTab(newValue)} centered sx={{ mb: 3 }}>
            <Tab label="Entrar" />
            <Tab label="Criar Conta" />
          </Tabs>

          {/* Login Form */}
          {tab === 0 && (
            <Box component="form" onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={loginData.email}
                onChange={(e) => setLoginData({ ...loginData, email: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                required
              />
              
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={loginData.password}
                onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
                required
              />
              
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={loginData.remember_me}
                      onChange={(e) => setLoginData({ ...loginData, remember_me: e.target.checked })}
                    />
                  }
                  label="Lembrar-me"
                />
                <Link
                  component="button"
                  type="button"
                  onClick={handleForgotPassword}
                  variant="body2"
                >
                  Esqueci a senha
                </Link>
              </Box>
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mb: 3 }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </Button>
            </Box>
          )}

          {/* Register Form */}
          {tab === 1 && (
            <Box component="form" onSubmit={handleRegister}>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Nome"
                    value={registerData.first_name}
                    onChange={(e) => setRegisterData({ ...registerData, first_name: e.target.value })}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person />
                        </InputAdornment>
                      ),
                    }}
                    required
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Sobrenome"
                    value={registerData.last_name}
                    onChange={(e) => setRegisterData({ ...registerData, last_name: e.target.value })}
                    required
                  />
                </Grid>
              </Grid>
              
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={registerData.email}
                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email />
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                required
              />
              
              <TextField
                fullWidth
                label="Senha"
                type={showPassword ? 'text' : 'password'}
                value={registerData.password}
                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowPassword(!showPassword)}
                        edge="end"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 3 }}
                required
              />
              
              <TextField
                fullWidth
                label="Confirmar Senha"
                type={showConfirmPassword ? 'text' : 'password'}
                value={registerData.confirm_password}
                onChange={(e) => setRegisterData({ ...registerData, confirm_password: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        edge="end"
                      >
                        {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{ mb: 2 }}
                required
              />
              
              <FormControlLabel
                control={
                  <Checkbox
                    checked={registerData.accept_terms}
                    onChange={(e) => setRegisterData({ ...registerData, accept_terms: e.target.checked })}
                  />
                }
                label={
                  <Typography variant="body2">
                    Aceito os{' '}
                    <Link href="#" onClick={(e) => e.preventDefault()}>
                      termos de uso
                    </Link>
                    {' '}e{' '}
                    <Link href="#" onClick={(e) => e.preventDefault()}>
                      política de privacidade
                    </Link>
                  </Typography>
                }
                sx={{ mb: 3 }}
                required
              />
              
              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading}
                sx={{ mb: 3 }}
              >
                {loading ? 'Criando conta...' : 'Criar Conta'}
              </Button>
            </Box>
          )}

          {/* Social Login */}
          <Divider sx={{ my: 3 }}>
            <Typography variant="body2" color="text.secondary">
              ou continue com
            </Typography>
          </Divider>
          
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<Google />}
                onClick={() => handleSocialLogin('Google')}
                disabled={loading}
              >
                Google
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                fullWidth
                variant="outlined"
                startIcon={<GitHub />}
                onClick={() => handleSocialLogin('GitHub')}
                disabled={loading}
              >
                GitHub
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Auth;
