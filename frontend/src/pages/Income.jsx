import React, { useState, useEffect } from 'react';
import '../styles/Income.css';
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
  TrendingUp,
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
      const response = await incomeService.incomeExport(filters);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      let filename = 'rendas.xlsx';
      const disposition = response.headers && response.headers['content-disposition'];
      if (disposition) {
        const match = disposition.match(/filename="(.+?)"/);
        if (match) filename = match[1];
      }
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
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
    <Box className="income-root">
      {/* Header Azul com Título e Filtros */}
      <Box className="income-header">
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <TrendingUp sx={{ color: '#fff' }} />
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: 1, color: '#fff' }}>
              Rendas
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => { setSelectedIncome(null); setFormOpen(true); }}
            className="header-action-btn"
          >
            Nova Renda
          </Button>
        </Box>
        {/* Botão Exportar reposicionado */}
        <Box display="flex" justifyContent="flex-end" mb={2}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FileDownload />}
            onClick={handleExport}
            className="header-action-btn"
          >
            Exportar
          </Button>
        </Box>
        <Box className="income-filters-wrapper">
          <Box className="income-filters-block">
            <FormControl sx={{ minWidth: 180 }}>
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
                  sx: { height: 52 }
                }}
                size="medium"
              />
            </FormControl>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel sx={{ color: '#fff' }}>Tipo de Renda</InputLabel>
              <Select
                value={filters.income_type}
                label="Tipo de Renda"
                onChange={(e) => setFilters({ ...filters, income_type: e.target.value })}
                sx={{ background: '#1f537c', color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '.MuiSelect-icon': { color: '#fff' } }}
              >
                <MenuItem value="" sx={{ color: '#222', background: '#fff' }}>Todos</MenuItem>
                {INCOME_TYPES.map((type) => (
                  <MenuItem key={type.value} value={type.value} sx={{ color: '#222', background: '#fff' }}>{type.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 160 }}>
              <InputLabel sx={{ color: '#fff' }}>Recorrente</InputLabel>
              <Select
                value={filters.is_recurring}
                label="Recorrente"
                onChange={(e) => setFilters({ ...filters, is_recurring: e.target.value })}
                sx={{ background: '#1f537c', color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '.MuiSelect-icon': { color: '#fff' } }}
              >
                <MenuItem value="" sx={{ color: '#222', background: '#fff' }}>Todos</MenuItem>
                <MenuItem value="true" sx={{ color: '#222', background: '#fff' }}>Sim</MenuItem>
                <MenuItem value="false" sx={{ color: '#222', background: '#fff' }}>Não</MenuItem>
              </Select>
            </FormControl>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Início"
                value={filters.date_start}
                onChange={(newValue) => setFilters({ ...filters, date_start: newValue })}
                renderInput={(params) => <TextField {...params} sx={{ minWidth: 140, background: '#1f537c', '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '& .MuiInputLabel-root': { color: '#fff' }, '& .MuiSvgIcon-root': { color: '#fff' } }} />}
              />
            </LocalizationProvider>
            <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={ptBR}>
              <DatePicker
                label="Data Fim"
                value={filters.date_end}
                onChange={(newValue) => setFilters({ ...filters, date_end: newValue })}
                renderInput={(params) => <TextField {...params} sx={{ minWidth: 140, background: '#1f537c', '& .MuiInputBase-input': { color: '#fff' }, '& .MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '& .MuiInputLabel-root': { color: '#fff' }, '& .MuiSvgIcon-root': { color: '#fff' } }} />}
              />
            </LocalizationProvider>
            <Button
              variant="contained"
              color="primary"
              startIcon={<FilterList />}
              sx={{ height: 56, fontWeight: 700 }}
              onClick={() => { setPage(0); loadIncome(); }}
            >
              Filtrar
            </Button>
          </Box>
        </Box>
      </Box>

      {error && (<Alert severity="error" sx={{ mt: 3 }} onClose={() => setError(null)}>{error}</Alert>)}
      {success && (<Alert severity="success" sx={{ mt: 3 }} onClose={() => setSuccess(null)}>{success}</Alert>)}

  {/* Cards de Resumo com sobreposição */}
      <Box className="income-cards-section">
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom color="success.main">Total (Página)</Typography>
            <Typography variant="h4" color="success.main" fontWeight={700}>
              {(() => {
                const totalPage = monthlyIncomes.reduce((sum, i) => sum + (parseFloat(i.amount) || 0), 0);
                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPage);
              })()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Registros (Página)</Typography>
            <Typography variant="h4" fontWeight={700}>{monthlyIncomes.length}</Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Recorrentes (Página)</Typography>
            <Typography variant="h4" fontWeight={700}>{monthlyIncomes.filter(i => i.is_recurring).length}</Typography>
          </CardContent>
        </Card>
      </Box>

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
