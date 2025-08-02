import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  Pagination,
  InputAdornment,
  Fab,
  Grid,
  TablePagination,
  Menu,
  ListItemIcon,
  ListItemText,
  Tooltip,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  FileDownload,
  MoreVert,
  AttachMoney,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import { useNavigate } from 'react-router-dom';
import { incomeService } from '../services/api';
import { useAppStore } from '../store';

const INCOME_TYPES = [
  { value: 'salario', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investimentos', label: 'Investimentos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'outros', label: 'Outros' },
];

const IncomeForm = ({ open, onClose, income = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    income_type: '',
    date: new Date(),
    is_recurring: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (income) {
      setFormData({
        description: income.description,
        value: income.value,
        income_type: income.income_type,
        date: new Date(income.date),
        is_recurring: income.is_recurring,
      });
    } else {
      setFormData({
        description: '',
        value: '',
        income_type: '',
        date: new Date(),
        is_recurring: false,
      });
    }
  }, [income, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const data = {
        ...formData,
        value: parseFloat(formData.value),
        date: formData.date.toISOString().split('T')[0],
      };

      if (income) {
        await incomeService.update(income.id, data);
      } else {
        await incomeService.create(data);
      }

      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar renda');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {income ? 'Editar Renda' : 'Nova Renda'}
        </DialogTitle>
        <DialogContent>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Descrição"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Valor"
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                InputProps={{
                  startAdornment: <InputAdornment position="start">R$</InputAdornment>,
                }}
                inputProps={{ step: "0.01", min: "0" }}
                required
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Renda</InputLabel>
                <Select
                  value={formData.income_type}
                  onChange={(e) => setFormData({ ...formData, income_type: e.target.value })}
                >
                  {INCOME_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data"
                  value={formData.date}
                  onChange={(newValue) => setFormData({ ...formData, date: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recorrente</InputLabel>
                <Select
                  value={formData.is_recurring}
                  onChange={(e) => setFormData({ ...formData, is_recurring: e.target.value })}
                >
                  <MenuItem value={false}>Não</MenuItem>
                  <MenuItem value={true}>Sim</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Salvando...' : (income ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

const Income = () => {
  const navigate = useNavigate();
  const { monthlyIncomes, setMonthlyIncomes, isLoading, setLoading } = useAppStore();
  
  const [selectedIncome, setSelectedIncome] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [incomeToDelete, setIncomeToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Filtros e paginação
  const [filters, setFilters] = useState({
    search: '',
    income_type: '',
    date_start: null,
    date_end: null,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Menu de ações
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuIncome, setMenuIncome] = useState(null);

  useEffect(() => {
    console.log('Income component mounted, loading income...');
    loadIncome();
  }, [page, rowsPerPage, filters]);

  console.log('Income component render:', { monthlyIncomes, isLoading, error });

  const loadIncome = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: page + 1,
        page_size: rowsPerPage,
        ordering: '-created',
        ...filters,
      };

      // Remover parâmetros vazios
      Object.keys(params).forEach(key => {
        if (params[key] === '' || params[key] === null) {
          delete params[key];
        }
      });

      if (filters.date_start) {
        params.date_start = filters.date_start.toISOString().split('T')[0];
      }
      if (filters.date_end) {
        params.date_end = filters.date_end.toISOString().split('T')[0];
      }

      console.log('Loading income with params:', params);
      const data = await incomeService.getAll(params);
      console.log('Income data received:', data);
      setMonthlyIncomes(data.results || []);
      setTotal(data.count || 0);
    } catch (err) {
      console.error('Error loading income:', err);
      setError('Erro ao carregar rendas');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await incomeService.delete(incomeToDelete.id);
      setSuccess('Renda excluída com sucesso');
      loadIncome();
    } catch (err) {
      setError('Erro ao excluir renda');
    } finally {
      setDeleteDialogOpen(false);
      setIncomeToDelete(null);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const data = await incomeService.export(filters);
      // Criar e fazer download do arquivo
      const blob = new Blob([data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'rendas.csv';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('Erro ao exportar rendas');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getIncomeTypeLabel = (type) => {
    const incomeType = INCOME_TYPES.find(t => t.value === type);
    return incomeType ? incomeType.label : type;
  };

  const getIncomeTypeColor = (type) => {
    const colors = {
      'salario': 'success',
      'freelance': 'primary',
      'investimentos': 'info',
      'vendas': 'warning',
      'bonus': 'secondary',
      'outros': 'default',
    };
    return colors[type] || 'default';
  };

  const handleMenuOpen = (event, income) => {
    setMenuAnchor(event.currentTarget);
    setMenuIncome(income);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuIncome(null);
  };

  const handleEdit = (income) => {
    setSelectedIncome(income);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = (income) => {
    setIncomeToDelete(income);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  return (
    <Box sx={{ 
      width: '100%', 
      height: '100vh',
      pt: '64px', // Espaço para navbar fixa
      px: 3, 
      py: 3,
      overflow: 'auto',
      bgcolor: 'background.default'
    }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">
          Rendas
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedIncome(null);
            setFormOpen(true);
          }}
        >
          Nova Renda
        </Button>
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

      {/* Resumo */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom color="success.main">
                Total do Mês
              </Typography>
              <Typography variant="h4" color="success.main">
                {formatCurrency(
                  monthlyIncomes
                    .filter(item => {
                      const itemDate = new Date(item.date);
                      const now = new Date();
                      return itemDate.getMonth() === now.getMonth() && 
                             itemDate.getFullYear() === now.getFullYear();
                    })
                    .reduce((sum, item) => sum + parseFloat(item.value), 0)
                )}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Registros do Mês
              </Typography>
              <Typography variant="h4">
                {monthlyIncomes.filter(item => {
                  const itemDate = new Date(item.date);
                  const now = new Date();
                  return itemDate.getMonth() === now.getMonth() && 
                         itemDate.getFullYear() === now.getFullYear();
                }).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Rendas Recorrentes
              </Typography>
              <Typography variant="h4">
                {monthlyIncomes.filter(item => item.is_recurring).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filtros */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Filtros
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Buscar"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Renda</InputLabel>
                <Select
                  value={filters.income_type}
                  onChange={(e) => setFilters({ ...filters, income_type: e.target.value })}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {INCOME_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Início"
                  value={filters.date_start}
                  onChange={(newValue) => setFilters({ ...filters, date_start: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12} md={3}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Fim"
                  value={filters.date_end}
                  onChange={(newValue) => setFilters({ ...filters, date_end: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
          <Box sx={{ mt: 2, display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<FileDownload />}
              onClick={handleExport}
            >
              Exportar
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Descrição</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Data</TableCell>
                <TableCell>Recorrente</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {monthlyIncomes.map((incomeItem) => (
                <TableRow key={incomeItem.id}>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AttachMoney color="success" />
                      {incomeItem.description}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(incomeItem.value)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getIncomeTypeLabel(incomeItem.income_type)}
                      color={getIncomeTypeColor(incomeItem.income_type)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(incomeItem.date).toLocaleDateString('pt-BR')}
                  </TableCell>
                  <TableCell>
                    {incomeItem.is_recurring ? (
                      <Chip label="Sim" color="primary" size="small" />
                    ) : (
                      <Chip label="Não" color="default" size="small" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Mais opções">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, incomeItem)}
                      >
                        <MoreVert />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(e, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value));
            setPage(0);
          }}
          labelRowsPerPage="Linhas por página:"
          labelDisplayedRows={({ from, to, count }) =>
            `${from}-${to} de ${count !== -1 ? count : `mais de ${to}`}`
          }
        />
      </Card>

      {/* Menu de Ações */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => handleEdit(menuIncome)}>
          <ListItemIcon>
            <Edit />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteClick(menuIncome)}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog de Formulário */}
      <IncomeForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        income={selectedIncome}
        onSuccess={() => {
          loadIncome();
          setSuccess(selectedIncome ? 'Renda atualizada com sucesso' : 'Renda criada com sucesso');
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a renda "{incomeToDelete?.description}"?
            Esta ação não pode ser desfeita.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>

      {/* Botão Flutuante */}
      <Fab
        color="primary"
        aria-label="add"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
        }}
        onClick={() => {
          setSelectedIncome(null);
          setFormOpen(true);
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Income;
