import React, { useState, useEffect } from 'react';
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
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      pt: '64px', // Espaço para navbar fixa
      px: 3, 
      py: 3,
      overflow: 'auto'
    }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {financialSummary && (
        <Grid container spacing={3}>
          {/* Cards de Resumo */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <AccountBalance color="primary" />
                  <Typography variant="h6">Renda</Typography>
                </Box>
                <Typography variant="h4" color="primary">
                  {formatCurrency(financialSummary.income)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingDown color="error" />
                  <Typography variant="h6">Despesas</Typography>
                </Box>
                <Typography variant="h4" color="error">
                  {formatCurrency(financialSummary.total_expenses)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUp color={financialSummary.balance >= 0 ? 'success' : 'error'} />
                  <Typography variant="h6">Saldo</Typography>
                </Box>
                <Typography 
                  variant="h4" 
                  color={financialSummary.balance >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(financialSummary.balance)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Saúde Financeira
                </Typography>
                <Chip
                  label={getHealthLabel(financialSummary.financial_health)}
                  color={getHealthColor(financialSummary.financial_health)}
                  icon={financialSummary.financial_health === 'excellent' ? <CheckCircle /> : <Warning />}
                />
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfico de Despesas por Categoria */}
          <Grid item xs={12} md={8}>
            <Card>
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

          {/* Alertas Financeiros */}
          <Grid item xs={12} md={4}>
            <Card>
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

          {/* Despesas Recentes */}
          <Grid item xs={12}>
            <Card>
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
        </Grid>
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
