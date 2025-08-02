import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  IconButton,
  Tooltip,
  TextField,
} from '@mui/material';
import {
  FileDownload,
  TrendingUp,
  TrendingDown,
  PieChart,
  BarChart,
  Refresh,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip as ChartTooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement,
} from 'chart.js';
import { Bar, Pie, Line } from 'react-chartjs-2';
import { analysisService } from '../services/api';

// Registrar componentes do Chart.js
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  ChartTooltip,
  Legend,
  ArcElement,
  LineElement,
  PointElement
);

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reportData, setReportData] = useState(null);
  
  // Filtros
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [endDate, setEndDate] = useState(new Date());
  const [reportType, setReportType] = useState('summary');

  useEffect(() => {
    loadReportData();
  }, [period, startDate, endDate, reportType]);

  const loadReportData = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        period,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        report_type: reportType,
      };

      const data = await analysisService.getReports(params);
      setReportData(data);
    } catch (err) {
      setError('Erro ao carregar relatório');
      console.error(err);
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

  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  const handleExport = async () => {
    try {
      const data = await analysisService.exportReport({
        period,
        start_date: startDate.toISOString().split('T')[0],
        end_date: endDate.toISOString().split('T')[0],
        report_type: reportType,
      });
      
      const blob = new Blob([data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `relatorio-${reportType}-${startDate.toISOString().split('T')[0]}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar relatório');
    }
  };

  // Dados para gráfico de barras (Receitas vs Despesas por mês)
  const barChartData = reportData?.monthly_comparison ? {
    labels: reportData.monthly_comparison.months,
    datasets: [
      {
        label: 'Receitas',
        data: reportData.monthly_comparison.income,
        backgroundColor: '#4CAF50',
        borderColor: '#388E3C',
        borderWidth: 1,
      },
      {
        label: 'Despesas',
        data: reportData.monthly_comparison.expenses,
        backgroundColor: '#F44336',
        borderColor: '#D32F2F',
        borderWidth: 1,
      },
    ],
  } : null;

  // Dados para gráfico de pizza (Despesas por categoria)
  const pieChartData = reportData?.expenses_by_category ? {
    labels: Object.keys(reportData.expenses_by_category).map(key => {
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
      data: Object.values(reportData.expenses_by_category),
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

  // Dados para gráfico de linha (Evolução do saldo)
  const lineChartData = reportData?.balance_evolution ? {
    labels: reportData.balance_evolution.dates,
    datasets: [{
      label: 'Saldo',
      data: reportData.balance_evolution.balances,
      borderColor: '#2196F3',
      backgroundColor: 'rgba(33, 150, 243, 0.1)',
      tension: 0.4,
      fill: true,
    }],
  } : null;

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            if (context.dataset.label) {
              return `${context.dataset.label}: ${formatCurrency(context.raw)}`;
            }
            return formatCurrency(context.raw);
          },
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => formatCurrency(value),
        },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = formatCurrency(context.raw);
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((context.raw / total) * 100).toFixed(1);
            return `${context.label}: ${value} (${percentage}%)`;
          },
        },
      },
    },
  };

  if (loading) {
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
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Relatórios
        </Typography>
        <Box display="flex" gap={1}>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadReportData}
          >
            Atualizar
          </Button>
          <Button
            variant="contained"
            startIcon={<FileDownload />}
            onClick={handleExport}
          >
            Exportar PDF
          </Button>
        </Box>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Período</InputLabel>
                <Select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                >
                  <MenuItem value="weekly">Semanal</MenuItem>
                  <MenuItem value="monthly">Mensal</MenuItem>
                  <MenuItem value="quarterly">Trimestral</MenuItem>
                  <MenuItem value="yearly">Anual</MenuItem>
                  <MenuItem value="custom">Personalizado</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Relatório</InputLabel>
                <Select
                  value={reportType}
                  onChange={(e) => setReportType(e.target.value)}
                >
                  <MenuItem value="summary">Resumo</MenuItem>
                  <MenuItem value="detailed">Detalhado</MenuItem>
                  <MenuItem value="categories">Por Categorias</MenuItem>
                  <MenuItem value="trends">Tendências</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Início"
                  value={startDate}
                  onChange={setStartDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Fim"
                  value={endDate}
                  onChange={setEndDate}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {reportData && (
        <Grid container spacing={3}>
          {/* Cards de Resumo */}
          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingUp color="success" />
                  <Typography variant="h6">Total Receitas</Typography>
                </Box>
                <Typography variant="h4" color="success.main">
                  {formatCurrency(reportData.total_income)}
                </Typography>
                {reportData.income_change && (
                  <Typography variant="body2" color={reportData.income_change >= 0 ? 'success.main' : 'error.main'}>
                    {reportData.income_change >= 0 ? '+' : ''}{formatPercentage(reportData.income_change)} vs período anterior
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" gap={1}>
                  <TrendingDown color="error" />
                  <Typography variant="h6">Total Despesas</Typography>
                </Box>
                <Typography variant="h4" color="error.main">
                  {formatCurrency(reportData.total_expenses)}
                </Typography>
                {reportData.expenses_change && (
                  <Typography variant="body2" color={reportData.expenses_change <= 0 ? 'success.main' : 'error.main'}>
                    {reportData.expenses_change >= 0 ? '+' : ''}{formatPercentage(reportData.expenses_change)} vs período anterior
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Saldo Líquido
                </Typography>
                <Typography 
                  variant="h4" 
                  color={reportData.net_balance >= 0 ? 'success.main' : 'error.main'}
                >
                  {formatCurrency(reportData.net_balance)}
                </Typography>
                {reportData.balance_change && (
                  <Typography variant="body2" color={reportData.balance_change >= 0 ? 'success.main' : 'error.main'}>
                    {reportData.balance_change >= 0 ? '+' : ''}{formatPercentage(reportData.balance_change)} vs período anterior
                  </Typography>
                )}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Taxa de Poupança
                </Typography>
                <Typography variant="h4" color="primary">
                  {formatPercentage(reportData.savings_rate)}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Meta recomendada: 20%
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Gráfico de Receitas vs Despesas */}
          {barChartData && (
            <Grid item xs={12} lg={8}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Receitas vs Despesas
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <Bar data={barChartData} options={chartOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Gráfico de Pizza - Despesas por Categoria */}
          {pieChartData && (
            <Grid item xs={12} lg={4}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Despesas por Categoria
                  </Typography>
                  <Box sx={{ height: 400 }}>
                    <Pie data={pieChartData} options={pieOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Evolução do Saldo */}
          {lineChartData && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Evolução do Saldo
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Line data={lineChartData} options={chartOptions} />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          )}

          {/* Tabela de Categorias */}
          {reportData.category_analysis && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Análise por Categorias
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Categoria</TableCell>
                          <TableCell align="right">Valor</TableCell>
                          <TableCell align="right">% do Total</TableCell>
                          <TableCell align="right">vs Período Anterior</TableCell>
                          <TableCell align="center">Status</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {reportData.category_analysis.map((category) => (
                          <TableRow key={category.name}>
                            <TableCell>{category.name}</TableCell>
                            <TableCell align="right">
                              {formatCurrency(category.amount)}
                            </TableCell>
                            <TableCell align="right">
                              {formatPercentage(category.percentage)}
                            </TableCell>
                            <TableCell align="right">
                              <Typography 
                                color={category.change >= 0 ? 'error.main' : 'success.main'}
                              >
                                {category.change >= 0 ? '+' : ''}{formatPercentage(category.change)}
                              </Typography>
                            </TableCell>
                            <TableCell align="center">
                              <Chip
                                label={category.status}
                                color={
                                  category.status === 'normal' ? 'success' :
                                  category.status === 'atenção' ? 'warning' : 'error'
                                }
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
          )}

          {/* Insights e Recomendações */}
          {reportData.insights && reportData.insights.length > 0 && (
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Insights e Recomendações
                  </Typography>
                  {reportData.insights.map((insight, index) => (
                    <Alert
                      key={index}
                      severity={insight.type}
                      sx={{ mb: 1 }}
                      action={
                        insight.action && (
                          <Button color="inherit" size="small">
                            {insight.action}
                          </Button>
                        )
                      }
                    >
                      <Typography variant="subtitle2">
                        {insight.title}
                      </Typography>
                      <Typography variant="body2">
                        {insight.message}
                      </Typography>
                    </Alert>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          )}
        </Grid>
      )}
    </Box>
  );
};

export default Reports;
