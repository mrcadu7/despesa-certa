import React, { useState, useEffect } from 'react';
import IncomeForm from './IncomeForm';
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

const Income = () => {
  // Seleção em massa
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    income_type: '',
    date: null,
    is_recurring: ''
  });
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
    is_recurring: '',
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);
  
  // Menu de ações
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuIncome, setMenuIncome] = useState(null);

  useEffect(() => {
    // Carrega ao montar ou ao mudar paginação
    loadIncome();
  }, [page, rowsPerPage]);

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
      // income_type: só envia se não vazio
      if (filters.income_type !== '') {
        params.income_type = filters.income_type;
      } else {
        delete params.income_type;
      }
      // is_recurring: só envia se não vazio, e como string 'true'/'false'
      if (filters.is_recurring !== '') {
        params.is_recurring = filters.is_recurring === 'true' || filters.is_recurring === true ? 'true' : 'false';
      } else {
        delete params.is_recurring;
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
                      let year, month;
                      if (typeof item.date === 'string' && item.date.includes('-')) {
                        [year, month] = item.date.split('-');
                        year = Number(year);
                        month = Number(month) - 1;
                      } else if (item.date instanceof Date && !isNaN(item.date)) {
                        year = item.date.getFullYear();
                        month = item.date.getMonth();
                      } else {
                        return false;
                      }
                      const now = new Date();
                      return month === now.getMonth() && year === now.getFullYear();
                    })
                    .reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
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
                  let itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                  const now = new Date();
                  return itemDate.getUTCMonth() === now.getUTCMonth() && 
                         itemDate.getUTCFullYear() === now.getUTCFullYear();
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
                {monthlyIncomes.filter(item => {
                  let itemDate = item.date instanceof Date ? item.date : new Date(item.date);
                  const now = new Date();
                  return item.is_recurring && itemDate.getUTCMonth() === now.getUTCMonth() && itemDate.getUTCFullYear() === now.getUTCFullYear();
                }).length}
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
          <Grid container spacing={2} alignItems="center" wrap="nowrap">
            <Grid item sx={{ flexGrow: 1 }}>
              <TextField
                label="Buscar"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                  sx: { fontSize: 18, height: 52 }
                }}
                InputLabelProps={{ sx: { fontSize: 18 } }}
                size="medium"
                fullWidth
                sx={{ fontSize: 18, height: 52 }}
              />
            </Grid>
            <Grid item sx={{ flexGrow: 1 }}>
              <FormControl fullWidth size="medium" sx={{ height: 52 }}>
                <InputLabel sx={{ fontSize: 18 }}>Tipo de Renda</InputLabel>
                <Select
                  value={filters.income_type}
                  onChange={(e) => setFilters({ ...filters, income_type: e.target.value })}
                  label="Tipo de Renda"
                  sx={{ fontSize: 18, height: 52 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  {INCOME_TYPES.map((type) => (
                    <MenuItem key={type.value} value={type.value} sx={{ fontSize: 18 }}>
                      {type.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item sx={{ flexGrow: 1 }}>
              <FormControl fullWidth size="medium" sx={{ height: 52 }}>
                <InputLabel sx={{ fontSize: 18 }}>Recorrente</InputLabel>
                <Select
                  value={filters.is_recurring}
                  onChange={(e) => setFilters({ ...filters, is_recurring: e.target.value })}
                  label="Recorrente"
                  sx={{ fontSize: 18, height: 52 }}
                >
                  <MenuItem value="">Todos</MenuItem>
                  <MenuItem value="true" sx={{ fontSize: 18 }}>Sim</MenuItem>
                  <MenuItem value="false" sx={{ fontSize: 18 }}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item sx={{ flexGrow: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Início"
                  value={filters.date_start}
                  onChange={(newValue) => {
                    setFilters({ ...filters, date_start: newValue });
                  }}
                  renderInput={(params) => <TextField {...params} size="medium" fullWidth sx={{ fontSize: 18, height: 52 }} InputLabelProps={{ sx: { fontSize: 18 } }} />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item sx={{ flexGrow: 1 }}>
              <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
                <DatePicker
                  label="Data Fim"
                  value={filters.date_end}
                  onChange={(newValue) => {
                    setFilters({ ...filters, date_end: newValue });
                  }}
                  renderInput={(params) => <TextField {...params} size="medium" fullWidth sx={{ fontSize: 18, height: 52 }} InputLabelProps={{ sx: { fontSize: 18 } }} />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item sx={{ minWidth: 160, display: 'flex', justifyContent: 'flex-end', alignItems: 'center' }}>
              <Button
                variant="contained"
                color="primary"
                startIcon={<FilterList />}
                sx={{ height: 52, minWidth: 120, fontSize: 18 }}
                onClick={() => {
                  setPage(0);
                  loadIncome();
                }}
              >
                Filtrar
              </Button>
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

      {/* Tabela com seleção em massa */}
      <Card>
        <Box display="flex" justifyContent="space-between" alignItems="center" px={2} py={1}>
          <Button
            variant="outlined"
            disabled={selectedIds.length === 0}
            onClick={() => setBulkDialogOpen(true)}
          >
            Ações em Massa ({selectedIds.length})
          </Button>
          <Button
            variant="outlined"
            color="error"
            disabled={selectedIds.length === 0}
            onClick={async () => {
              if (window.confirm(`Excluir ${selectedIds.length} rendas selecionadas? Esta ação não pode ser desfeita.`)) {
                const result = await incomeService.bulkDelete(selectedIds);
                setSelectedIds([]);
                loadIncome();
                setSuccess(`Rendas excluídas em massa: ${result.deleted_count || 0}`);
              }
            }}
          >
            Excluir Selecionados
          </Button>
        </Box>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === monthlyIncomes.length && monthlyIncomes.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(monthlyIncomes.map(i => i.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableCell>
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
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(incomeItem.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, incomeItem.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== incomeItem.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AttachMoney color="success" />
                      {incomeItem.description}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6" color="success.main">
                      {formatCurrency(isNaN(Number(incomeItem.amount)) ? 0 : Number(incomeItem.amount))}
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
                    {incomeItem.date ? (() => {
                      const [year, month, day] = incomeItem.date.split('-');
                      return `${day}/${month}/${year}`;
                    })() : ''}
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
      {/* Modal de edição em massa */}
      <Dialog open={bulkDialogOpen} onClose={() => setBulkDialogOpen(false)}>
        <DialogTitle>Edição em Massa</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Renda</InputLabel>
                <Select
                  value={bulkForm.income_type}
                  onChange={e => setBulkForm({ ...bulkForm, income_type: e.target.value })}
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
                  label="Nova Data"
                  value={bulkForm.date}
                  onChange={newValue => setBulkForm({ ...bulkForm, date: newValue })}
                  renderInput={params => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Recorrente</InputLabel>
                <Select
                  value={bulkForm.is_recurring}
                  onChange={e => setBulkForm({ ...bulkForm, is_recurring: e.target.value })}
                >
                  <MenuItem value={true}>Sim</MenuItem>
                  <MenuItem value={false}>Não</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              // Chamada de API PATCH para atualizar em massa (bulk)
              const updateData = {};
              if (bulkForm.income_type) updateData.income_type = bulkForm.income_type;
              if (bulkForm.date) updateData.date = new Date(bulkForm.date).toISOString().split('T')[0];
              if (bulkForm.is_recurring !== '') updateData.is_recurring = bulkForm.is_recurring;
              const result = await incomeService.bulkPatch(selectedIds, updateData);
              setBulkDialogOpen(false);
              setSelectedIds([]);
              setBulkForm({ income_type: '', date: null, is_recurring: '' });
              loadIncome();
              setSuccess(`Rendas atualizadas em massa: ${result.updated_count || 0}`);
              if (result.errors) {
                setError('Algumas rendas não foram atualizadas. Verifique os detalhes.');
                console.error('Erros no bulk update:', result.errors);
              }
            }}
            disabled={selectedIds.length === 0}
          >
            Salvar
          </Button>
        </DialogActions>
      </Dialog>

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
      <Dialog open={formOpen} onClose={() => setFormOpen(false)} maxWidth="sm" fullWidth slotProps={{ backdrop: { sx: { backgroundColor: 'rgba(0,0,0,0.5)' } } }}>
        <IncomeForm
          open={formOpen}
          onClose={() => setFormOpen(false)}
          income={selectedIncome}
          onSuccess={() => {
            loadIncome();
            setSuccess(selectedIncome ? 'Renda atualizada com sucesso' : 'Renda criada com sucesso');
          }}
        />
      </Dialog>

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
