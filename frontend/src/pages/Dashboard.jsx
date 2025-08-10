import React, { useState, useEffect } from 'react';
import '../styles/Dashboard.css';
import { FormControl, InputLabel, Select, TextField } from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Alert,
  Chip,
  Button,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Fab,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import ExpenseForm from './ExpenseForm';
import IncomeForm from './IncomeForm';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Warning,
  Add,
  CheckCircle,
  Error,
} from '@mui/icons-material';
import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { useNavigate } from 'react-router-dom';
import { analysisService, expenseService } from '../services/api';
import { useAppStore } from '../store';

// Registrar componentes do Chart.js
ChartJS.register(ArcElement, Tooltip, Legend);

const Dashboard = () => {

  const navigate = useNavigate();
  const { expenses, setExpenses, setLoading, isLoading } = useAppStore();

  const [financialSummary, setFinancialSummary] = useState(null);
  const [recentExpenses, setRecentExpenses] = useState([]);
  const [error, setError] = useState(null);

    // Filtros para relatório
    const [period, setPeriod] = useState('monthly');
    const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
    const [endDate, setEndDate] = useState(new Date());
    const [reportType, setReportType] = useState('summary');

  // Estado para menu do FAB
  const [fabAnchorEl, setFabAnchorEl] = useState(null);
  const fabMenuOpen = Boolean(fabAnchorEl);

  // Estado para modais de formulário
  const [openExpenseModal, setOpenExpenseModal] = useState(false);
  const [openIncomeModal, setOpenIncomeModal] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Carregar resumo financeiro
      const summaryData = await analysisService.getFinancialSummary();
      setFinancialSummary(summaryData);

      // Carregar despesas recentes
      const expensesData = await expenseService.getAll({ 
        page_size: 5,
        ordering: '-created' 
      });
      setRecentExpenses(expensesData.results || []);
      setExpenses(expensesData.results || []);

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value || 0);
  };

  const getHealthColor = (health) => {
    switch (health) {
      case 'excellent': return 'success';
      case 'good': return 'primary';
      case 'warning': return 'warning';
      case 'critical': return 'error';
      default: return 'default';
    }
  };

  const getHealthLabel = (health) => {
    switch (health) {
      case 'excellent': return 'Excelente';
      case 'good': return 'Boa';
      case 'warning': return 'Atenção';
      case 'critical': return 'Crítica';
      default: return 'Desconhecida';
    }
  };

  // Dados para o gráfico de pizza
  const pieChartData = financialSummary?.expenses_by_category ? {
    labels: Object.keys(financialSummary.expenses_by_category).map(key => {
      const categoryLabels = {
        'alimentacao': 'Alimentação',
        'transporte': 'Transporte',
        'moradia': 'Moradia',
        'saude': 'Saúde',
        'lazer': 'Lazer',
        'educacao': 'Educação',
        'outros': 'Outros'
      };
      return categoryLabels[key] || key;
    }),
    datasets: [{
      data: Object.values(financialSummary.expenses_by_category),
      backgroundColor: [
        '#2196F3',
        '#4CAF50',
        '#FF9800',
        '#F44336',
        '#9C27B0',
        '#00BCD4',
        '#795548',
      ],
      borderWidth: 2,
      borderColor: '#fff',
    }],
  } : null;

  const pieChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = formatCurrency(context.raw);
            const percentage = financialSummary?.category_percentages?.[Object.keys(financialSummary.expenses_by_category)[context.dataIndex]];
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
  <Box className="dashboard-root">
      {/* Header unificado (título + filtros) */}
  <Box className="dashboard-header">
        <Box sx={{ display: 'flex', alignItems: 'center', color: '#fff', mb: 2 }}>
          <Box sx={{ mr: 2 }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><path d="M3 13h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2V7H3v2zm4 8h2v-2H7v2zm0-4h2v-2H7v2zm0-8v2h2V5H7zm4 12h8v-2h-8v2zm0-4h8v-2h-8v2zm0-8v2h8V5h-8z" fill="#fff"/></svg>
          </Box>
          <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: 1, color: '#fff' }}>
            Dashboard
          </Typography>
        </Box>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {financialSummary && (
          <Box className="dashboard-filters-wrapper">
            <Box className="dashboard-filters">
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel sx={{ color: '#fff' }}>Período</InputLabel>
                <Select
                  value={period}
                  label="Período"
                  onChange={e => setPeriod(e.target.value)}
                  sx={{ background: '#1f537c', color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '.MuiSelect-icon': { color: '#fff' } }}
                  inputProps={{ style: { color: '#fff' } }}
                >
                  <MenuItem value="weekly" sx={{ color: '#222', background: '#fff' }}>Semanal</MenuItem>
                  <MenuItem value="monthly" sx={{ color: '#222', background: '#fff' }}>Mensal</MenuItem>
                  <MenuItem value="quarterly" sx={{ color: '#222', background: '#fff' }}>Trimestral</MenuItem>
                  <MenuItem value="yearly" sx={{ color: '#222', background: '#fff' }}>Anual</MenuItem>
                  <MenuItem value="custom" sx={{ color: '#222', background: '#fff' }}>Personalizado</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 180 }}>
                <InputLabel sx={{ color: '#fff' }}>Tipo de Relatório</InputLabel>
                <Select
                  value={reportType}
                  label="Tipo de Relatório"
                  onChange={e => setReportType(e.target.value)}
                  sx={{ background: '#1f537c', color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '.MuiSelect-icon': { color: '#fff' } }}
                  inputProps={{ style: { color: '#fff' } }}
                >
                  <MenuItem value="summary" sx={{ color: '#222', background: '#fff' }}>Resumo</MenuItem>
                  <MenuItem value="detailed" sx={{ color: '#222', background: '#fff' }}>Detalhado</MenuItem>
                  <MenuItem value="categories" sx={{ color: '#222', background: '#fff' }}>Por Categorias</MenuItem>
                  <MenuItem value="trends" sx={{ color: '#222', background: '#fff' }}>Tendências</MenuItem>
                </Select>
              </FormControl>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Início"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} sx={{ minWidth: 140, background: '#1f537c', color: '#fff', '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '& .MuiInputLabel-root': { color: '#fff' }, '& .MuiSvgIcon-root': { color: '#fff' } } } />}
                />
              </LocalizationProvider>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Fim"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} sx={{ minWidth: 140, background: '#1f537c', color: '#fff', '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '& .MuiInputLabel-root': { color: '#fff' }, '& .MuiSvgIcon-root': { color: '#fff' } } } />}
                />
              </LocalizationProvider>
              <Button variant="contained" color="primary" sx={{ height: 56, fontWeight: 700 }}>Aplicar Filtros</Button>
            </Box>
          </Box>
        )}
      </Box>

      {/* Área branca com cards sobrepostos */}
      {financialSummary && (
  <Box className="dashboard-cards-section">
          <Box sx={{ display: 'flex', gap: 3, mb: 3, flexWrap: 'wrap' }}>
            <Card sx={{ flex: 1, minWidth: 220, boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <AccountBalance color="primary" />
                  <Typography variant="h6">Renda</Typography>
                </Box>
                <Typography variant="h3" color="primary" fontWeight={700}>
                  {formatCurrency(financialSummary.income)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 220, boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingDown color="error" />
                  <Typography variant="h6">Despesas</Typography>
                </Box>
                <Typography variant="h3" color="error" fontWeight={700}>
                  {formatCurrency(financialSummary.total_expenses)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 220, boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <TrendingUp color={financialSummary.balance >= 0 ? 'success' : 'error'} />
                  <Typography variant="h6">Saldo</Typography>
                </Box>
                <Typography variant="h3" color={financialSummary.balance >= 0 ? 'success.main' : 'error.main'} fontWeight={700}>
                  {formatCurrency(financialSummary.balance)}
                </Typography>
              </CardContent>
            </Card>
            <Card sx={{ flex: 1, minWidth: 220, boxShadow: 3, borderRadius: 2 }}>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1} mb={1}>
                  <CheckCircle color="success" />
                  <Typography variant="h6">Saúde Financeira</Typography>
                </Box>
                <Chip
                  label={getHealthLabel(financialSummary.financial_health)}
                  color={getHealthColor(financialSummary.financial_health)}
                  icon={financialSummary.financial_health === 'excellent' ? <CheckCircle /> : <Warning />}
                  sx={{ fontSize: 18, px: 2, py: 1 }}
                />
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* Conteúdo restante */}

    {financialSummary && (
        <Card className="dashboard-main-card" sx={{ mt: 2, boxShadow: 3, borderRadius: 2 }}>
          <CardContent>
            {/* Gráfico de Despesas por Categoria e Alertas lado a lado */}
            <Grid container spacing={3}>
              <Grid item xs={12} md={8}>
                <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Despesas por Categoria
                    </Typography>
                    {pieChartData && Object.keys(financialSummary.expenses_by_category).length > 0 ? (
                      <Box sx={{ height: 300 }}>
                        <Pie data={pieChartData} options={pieChartOptions} />
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhuma despesa encontrada para este mês.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} md={4}>
                <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Alertas Financeiros
                    </Typography>
                    {financialSummary.alerts && financialSummary.alerts.length > 0 ? (
                      <List dense>
                        {financialSummary.alerts.slice(0, 3).map((alert, index) => (
                          <ListItem key={index}>
                            <ListItemIcon>
                              {alert.type === 'warning' ? (
                                <Warning color="warning" />
                              ) : (
                                <Error color="error" />
                              )}
                            </ListItemIcon>
                            <ListItemText
                              primary={alert.title}
                              secondary={alert.message}
                            />
                          </ListItem>
                        ))}
                      </List>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Nenhum alerta para este mês.
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Despesas Recentes */}
            <Grid item xs={12} sx={{ mt: 3 }}>
              <Card sx={{ boxShadow: 1, borderRadius: 2 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">
                      Despesas Recentes
                    </Typography>
                    <Button
                      variant="outlined"
                      onClick={() => navigate('/expenses')}
                    >
                      Ver Todas
                    </Button>
                  </Box>
                  {recentExpenses.length > 0 ? (
                    <List>
                      {recentExpenses.map((expense) => (
                      <ListItem key={expense.id} divider>
                        <ListItemText
                          primary={expense.description}
                          secondary={`${expense.category} • ${(() => {
                            if (typeof expense.date === 'string' && expense.date.includes('-')) {
                              const [year, month, day] = expense.date.split('-');
                              return `${day}/${month}/${year}`;
                            } else if (expense.date instanceof Date && !isNaN(expense.date)) {
                              const year = expense.date.getFullYear();
                              const month = String(expense.date.getMonth() + 1).padStart(2, '0');
                              const day = String(expense.date.getDate()).padStart(2, '0');
                              return `${day}/${month}/${year}`;
                            }
                            return '';
                          })()}`}
                        />
                        <Typography variant="h6" color="error">
                          {formatCurrency(expense.value)}
                        </Typography>
                      </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      Nenhuma despesa encontrada.
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </CardContent>
        </Card>
      )}

      {/* Botão Flutuante para Adicionar */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={e => setFabAnchorEl(e.currentTarget)}
      >
        <Add />
      </Fab>

      <Menu
        anchorEl={fabAnchorEl}
        open={fabMenuOpen}
        onClose={() => setFabAnchorEl(null)}
        anchorOrigin={{ vertical: 'top', horizontal: 'left' }}
        transformOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <MenuItem
          onClick={() => {
            setFabAnchorEl(null);
            setOpenExpenseModal(true);
          }}
        >
          Adicionar Despesa
        </MenuItem>
        <MenuItem
          onClick={() => {
            setFabAnchorEl(null);
            setOpenIncomeModal(true);
          }}
        >
          Adicionar Renda
        </MenuItem>
      </Menu>

      {/* Modal de Adicionar Despesa */}
      <Dialog 
        open={openExpenseModal} 
        onClose={() => setOpenExpenseModal(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)' } } }}
      >
        <DialogTitle>Adicionar Despesa</DialogTitle>
        <DialogContent>
          <ExpenseForm 
            open={openExpenseModal}
            onClose={() => setOpenExpenseModal(false)}
            onSuccess={loadDashboardData}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenExpenseModal(false)} color="secondary">Fechar</Button>
        </DialogActions>
      </Dialog>

      {/* Modal de Adicionar Renda */}
      <Dialog 
        open={openIncomeModal} 
        onClose={() => setOpenIncomeModal(false)} 
        maxWidth="sm" 
        fullWidth
        slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)' } } }}
      >
        <DialogContent>
          <IncomeForm />
        </DialogContent>
      </Dialog>
    </Box>
  );
};

export default Dashboard;
