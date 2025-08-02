import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  TextField,
  Button,
  Avatar,
  IconButton,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Switch,
  FormControlLabel,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  Edit,
  PhotoCamera,
  Security,
  Notifications,
  DeleteForever,
  Email,
  Phone,
  CalendarToday,
  AccountCircle,
  Settings,
  Logout,
  Download,
  Shield,
  History,
} from '@mui/icons-material';
import { useAuthStore } from '../store';
import { authService, userService } from '../services/api';

const Profile = () => {
  const { user, setUser, logout } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Estados para diferentes seções
  const [profileData, setProfileData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    birth_date: '',
  });
  
  const [preferences, setPreferences] = useState({
    email_notifications: true,
    push_notifications: true,
    weekly_reports: true,
    expense_alerts: true,
    currency: 'BRL',
    language: 'pt-BR',
  });
  
  const [securityData, setSecurityData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });
  
  // Estados para modais
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false);
  
  // Estados para dados adicionais
  const [loginHistory, setLoginHistory] = useState([]);
  const [dataUsage, setDataUsage] = useState(null);

  useEffect(() => {
    if (user) {
      setProfileData({
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        email: user.email || '',
        phone: user.phone || '',
        birth_date: user.birth_date || '',
      });
    }
    loadUserData();
  }, [user]);

  const loadUserData = async () => {
    try {
      // Carregar histórico de login
      const history = await userService.getLoginHistory();
      setLoginHistory(history);
      
      // Carregar estatísticas de uso
      const usage = await userService.getDataUsage();
      setDataUsage(usage);
      
      // Carregar preferências
      const prefs = await userService.getPreferences();
      setPreferences({ ...preferences, ...prefs });
    } catch (err) {
      console.error('Erro ao carregar dados do usuário:', err);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const updatedUser = await userService.updateProfile(profileData);
      setUser(updatedUser);
      setSuccess('Perfil atualizado com sucesso');
      setEditProfileOpen(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao atualizar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      setLoading(true);
      await userService.updatePreferences(preferences);
      setSuccess('Preferências atualizadas com sucesso');
    } catch (err) {
      setError('Erro ao atualizar preferências');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (securityData.new_password !== securityData.confirm_password) {
        setError('Senhas não coincidem');
        return;
      }
      
      await authService.changePassword(securityData);
      setSuccess('Senha alterada com sucesso');
      setChangePasswordOpen(false);
      setSecurityData({
        current_password: '',
        new_password: '',
        confirm_password: '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao alterar senha');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    try {
      setLoading(true);
      await userService.deleteAccount();
      logout();
    } catch (err) {
      setError('Erro ao excluir conta');
      setLoading(false);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await userService.exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meus-dados.json';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar dados');
    }
  };

  const getInitials = () => {
    const firstName = user?.first_name || '';
    const lastName = user?.last_name || '';
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      pt: '64px', // Espaço para navbar fixa
      px: 3, 
      py: 3,
      overflow: 'auto'
    }}>
      <Typography variant="h4" gutterBottom>
        Meu Perfil
      </Typography>

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

      <Grid container spacing={3}>
        {/* Card do Perfil Principal */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Box position="relative" display="inline-block">
                <Avatar
                  sx={{ 
                    width: 100, 
                    height: 100, 
                    fontSize: '2rem',
                    bgcolor: 'primary.main',
                    mb: 2 
                  }}
                >
                  {getInitials()}
                </Avatar>
                <IconButton
                  sx={{
                    position: 'absolute',
                    bottom: 16,
                    right: -8,
                    bgcolor: 'background.paper',
                    boxShadow: 1,
                  }}
                  size="small"
                >
                  <PhotoCamera />
                </IconButton>
              </Box>
              
              <Typography variant="h5" gutterBottom>
                {user?.first_name} {user?.last_name}
              </Typography>
              
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {user?.email}
              </Typography>
              
              <Chip
                label={user?.is_active ? 'Conta Ativa' : 'Conta Inativa'}
                color={user?.is_active ? 'success' : 'error'}
                sx={{ mb: 2 }}
              />
              
              <Box sx={{ mt: 2 }}>
                <Button
                  variant="contained"
                  startIcon={<Edit />}
                  onClick={() => setEditProfileOpen(true)}
                  fullWidth
                  sx={{ mb: 1 }}
                >
                  Editar Perfil
                </Button>
                
                <Button
                  variant="outlined"
                  startIcon={<Security />}
                  onClick={() => setChangePasswordOpen(true)}
                  fullWidth
                >
                  Alterar Senha
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Informações Pessoais */}
        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Informações Pessoais
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <AccountCircle />
                  </ListItemIcon>
                  <ListItemText
                    primary="Nome Completo"
                    secondary={`${user?.first_name || ''} ${user?.last_name || ''}`}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText
                    primary="Email"
                    secondary={user?.email}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Phone />
                  </ListItemIcon>
                  <ListItemText
                    primary="Telefone"
                    secondary={user?.phone || 'Não informado'}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText
                    primary="Data de Nascimento"
                    secondary={user?.birth_date ? new Date(user.birth_date).toLocaleDateString('pt-BR') : 'Não informado'}
                  />
                </ListItem>
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferências e Configurações */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Preferências
              </Typography>
              
              <List>
                <ListItem>
                  <ListItemIcon>
                    <Email />
                  </ListItemIcon>
                  <ListItemText primary="Notificações por Email" />
                  <Switch
                    checked={preferences.email_notifications}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      email_notifications: e.target.checked
                    })}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Notifications />
                  </ListItemIcon>
                  <ListItemText primary="Notificações Push" />
                  <Switch
                    checked={preferences.push_notifications}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      push_notifications: e.target.checked
                    })}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <CalendarToday />
                  </ListItemIcon>
                  <ListItemText primary="Relatórios Semanais" />
                  <Switch
                    checked={preferences.weekly_reports}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      weekly_reports: e.target.checked
                    })}
                  />
                </ListItem>
                
                <ListItem>
                  <ListItemIcon>
                    <Settings />
                  </ListItemIcon>
                  <ListItemText primary="Alertas de Gastos" />
                  <Switch
                    checked={preferences.expense_alerts}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      expense_alerts: e.target.checked
                    })}
                  />
                </ListItem>
              </List>
              
              <Button
                variant="contained"
                onClick={handleUpdatePreferences}
                disabled={loading}
                sx={{ mt: 2 }}
              >
                Salvar Preferências
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Estatísticas de Uso */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Estatísticas de Uso
              </Typography>
              
              {dataUsage && (
                <List>
                  <ListItem>
                    <ListItemText
                      primary="Total de Despesas"
                      secondary={dataUsage.total_expenses}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Total de Rendas"
                      secondary={dataUsage.total_income}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Membro desde"
                      secondary={new Date(user?.date_joined).toLocaleDateString('pt-BR')}
                    />
                  </ListItem>
                  
                  <ListItem>
                    <ListItemText
                      primary="Último acesso"
                      secondary={user?.last_login ? new Date(user.last_login).toLocaleDateString('pt-BR') : 'Nunca'}
                    />
                  </ListItem>
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Histórico de Login */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Histórico de Login Recente
              </Typography>
              
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Data</TableCell>
                      <TableCell>Dispositivo</TableCell>
                      <TableCell>IP</TableCell>
                      <TableCell>Status</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loginHistory.slice(0, 5).map((login, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {new Date(login.timestamp).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell>{login.device}</TableCell>
                        <TableCell>{login.ip_address}</TableCell>
                        <TableCell>
                          <Chip
                            label={login.success ? 'Sucesso' : 'Falha'}
                            color={login.success ? 'success' : 'error'}
                            size="small"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Ações da Conta */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Ações da Conta
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Download />}
                    onClick={handleExportData}
                    fullWidth
                  >
                    Exportar Dados
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Shield />}
                    onClick={() => setChangePasswordOpen(true)}
                    fullWidth
                  >
                    Segurança
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    startIcon={<Logout />}
                    onClick={logout}
                    fullWidth
                  >
                    Sair
                  </Button>
                </Grid>
                
                <Grid item xs={12} sm={6} md={3}>
                  <Button
                    variant="outlined"
                    color="error"
                    startIcon={<DeleteForever />}
                    onClick={() => setDeleteAccountOpen(true)}
                    fullWidth
                  >
                    Excluir Conta
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Dialog para Editar Perfil */}
      <Dialog open={editProfileOpen} onClose={() => setEditProfileOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar Perfil</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Nome"
                value={profileData.first_name}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Sobrenome"
                value={profileData.last_name}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Telefone"
                value={profileData.phone}
                onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Data de Nascimento"
                type="date"
                value={profileData.birth_date}
                onChange={(e) => setProfileData({ ...profileData, birth_date: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditProfileOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleUpdateProfile} variant="contained" disabled={loading}>
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Alterar Senha */}
      <Dialog open={changePasswordOpen} onClose={() => setChangePasswordOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Alterar Senha</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Senha Atual"
                type="password"
                value={securityData.current_password}
                onChange={(e) => setSecurityData({ ...securityData, current_password: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Nova Senha"
                type="password"
                value={securityData.new_password}
                onChange={(e) => setSecurityData({ ...securityData, new_password: e.target.value })}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Confirmar Nova Senha"
                type="password"
                value={securityData.confirm_password}
                onChange={(e) => setSecurityData({ ...securityData, confirm_password: e.target.value })}
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChangePasswordOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleChangePassword} variant="contained" disabled={loading}>
            Alterar Senha
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog para Confirmar Exclusão da Conta */}
      <Dialog open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)}>
        <DialogTitle>Confirmar Exclusão da Conta</DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2 }}>
            Esta ação é irreversível! Todos os seus dados serão permanentemente excluídos.
          </Alert>
          <Typography>
            Tem certeza que deseja excluir sua conta? Digite "EXCLUIR" para confirmar.
          </Typography>
          <TextField
            fullWidth
            placeholder="Digite EXCLUIR para confirmar"
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteAccountOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDeleteAccount} color="error" variant="contained" disabled={loading}>
            Excluir Conta
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Profile;
