import React, { useState, useEffect } from 'react';
import '../styles/Expenses.css';
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
import ExpenseForm from './ExpenseForm';
import {
  Add,
  Edit,
  Delete,
  Search,
  FilterList,
  FileDownload,
  MoreVert,
  Receipt,
  Warning,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import { useNavigate } from 'react-router-dom';
import { expenseService } from '../services/api';
import { useAppStore } from '../store';

const CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'moradia', label: 'Moradia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'educacao', label: 'Educação' },
  { value: 'outros', label: 'Outros' },
];


const Expenses = () => {
  const navigate = useNavigate();
  const { expenses, setExpenses, isLoading, setLoading } = useAppStore();

  // Seleção em massa
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [bulkForm, setBulkForm] = useState({
    category: '',
    date: null,
  });

  const [selectedExpense, setSelectedExpense] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // Filtros e paginação
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    date_start: null,
    date_end: null,
  });
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [total, setTotal] = useState(0);

  // Menu de ações
  const [menuAnchor, setMenuAnchor] = useState(null);
  const [menuExpense, setMenuExpense] = useState(null);


  // Só carrega ao montar ou ao mudar paginação
  useEffect(() => {
    loadExpenses();
  }, [page, rowsPerPage]);

  const loadExpenses = async () => {
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
      // category: só envia se não vazio
      if (filters.category !== '') {
        params.category = filters.category;
      } else {
        delete params.category;
      }

      const data = await expenseService.getAll(params);
      setExpenses(data.results || []);
      setTotal(data.count || 0);
    } catch (err) {
      setError('Erro ao carregar despesas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await expenseService.delete(expenseToDelete.id);
      setSuccess('Despesa excluída com sucesso');
      loadExpenses();
    } catch (err) {
      setError('Erro ao excluir despesa');
    } finally {
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await expenseService.expenseExport(filters);
      const blob = new Blob([response.data], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      let filename = 'despesas.xlsx';
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
      setError('Erro ao exportar despesas');
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getCategoryLabel = (category) => {
    const cat = CATEGORIES.find(c => c.value === category);
    return cat ? cat.label : category;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'alimentacao': 'primary',
      'transporte': 'secondary',
      'moradia': 'error',
      'saude': 'warning',
      'lazer': 'success',
      'educacao': 'info',
      'outros': 'default',
    };
    return colors[category] || 'default';
  };

  const handleMenuOpen = (event, expense) => {
    setMenuAnchor(event.currentTarget);
    setMenuExpense(expense);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setMenuExpense(null);
  };

  const handleEdit = (expense) => {
    setSelectedExpense(expense);
    setFormOpen(true);
    handleMenuClose();
  };

  const handleDeleteClick = (expense) => {
    setExpenseToDelete(expense);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  return (
    <Box className="expenses-root">
      {/* Header Azul com Título e Ações */}
      <Box className="expenses-header">
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Box display="flex" alignItems="center" gap={2}>
            <Receipt sx={{ color: '#fff' }} />
            <Typography variant="h5" fontWeight={700} sx={{ letterSpacing: 1, color: '#fff' }}>
              Despesas
            </Typography>
          </Box>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Add />}
            onClick={() => { setSelectedExpense(null); setFormOpen(true); }}
            className="header-action-btn"
          >
            Nova Despesa
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
        {/* Bloco de Filtros */}
        <Box className="expenses-filters-wrapper">
          <Box className="expenses-filters-block">
            <FormControl sx={{ minWidth: 160 }}>
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
                sx={{ minWidth: 180 }}
              />
            </FormControl>
            <FormControl sx={{ minWidth: 180 }}>
              <InputLabel sx={{ color: '#fff' }}>Categoria</InputLabel>
              <Select
                value={filters.category}
                label="Categoria"
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                sx={{ background: '#1f537c', color: '#fff', '.MuiOutlinedInput-notchedOutline': { borderColor: '#fff' }, '.MuiSelect-icon': { color: '#fff' } }}
              >
                <MenuItem value="" sx={{ color: '#222', background: '#fff' }}>Todas</MenuItem>
                {CATEGORIES.map((cat) => (
                  <MenuItem key={cat.value} value={cat.value} sx={{ color: '#222', background: '#fff' }}>{cat.label}</MenuItem>
                ))}
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
              onClick={() => { setPage(0); loadExpenses(); }}
            >
              Filtrar
            </Button>
          </Box>
        </Box>
      </Box>

      {/* Cards de Resumo */}
      <Box className="expenses-cards-section">
        <Card>
          <CardContent>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Typography variant="h6">Total </Typography>
            </Box>
            <Typography variant="h4" color="error.main" fontWeight={700}>
              {(() => {
                const totalPage = expenses.reduce((sum, e) => sum + (parseFloat(e.value) || 0), 0);
                return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalPage);
              })()}
            </Typography>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" mb={1}>Registros </Typography>
            <Typography variant="h4" fontWeight={700}>{expenses.length}</Typography>
          </CardContent>
        </Card>
      </Box>

      {error && (<Alert severity="error" sx={{ mt: 1 }} onClose={() => setError(null)}>{error}</Alert>)}
      {success && (<Alert severity="success" sx={{ mt: 1 }} onClose={() => setSuccess(null)}>{success}</Alert>)}

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
              if (window.confirm(`Excluir ${selectedIds.length} despesas selecionadas? Esta ação não pode ser desfeita.`)) {
                const result = await expenseService.bulkDelete(selectedIds);
                setSelectedIds([]);
                loadExpenses();
                setSuccess(`Despesas excluídas em massa: ${result.deleted_count || 0}`);
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
                    checked={selectedIds.length === expenses.length && expenses.length > 0}
                    onChange={e => {
                      if (e.target.checked) {
                        setSelectedIds(expenses.map(i => i.id));
                      } else {
                        setSelectedIds([]);
                      }
                    }}
                  />
                </TableCell>
                <TableCell>Descrição</TableCell>
                <TableCell>Valor</TableCell>
                <TableCell>Categoria</TableCell>
                <TableCell>Data</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell padding="checkbox">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(expense.id)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds([...selectedIds, expense.id]);
                        } else {
                          setSelectedIds(selectedIds.filter(id => id !== expense.id));
                        }
                      }}
                    />
                  </TableCell>
                  <TableCell>
                    <Box display="flex" alignItems="center" gap={1}>
                      <Receipt color="action" />
                      {expense.description}
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Typography variant="h6" color="error">
                      {formatCurrency(expense.value)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={getCategoryLabel(expense.category)}
                      color={getCategoryColor(expense.category)}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {expense.date ? (() => {
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
                    })() : ''}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Mais opções">
                      <IconButton
                        onClick={(e) => handleMenuOpen(e, expense)}
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
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={bulkForm.category}
                  onChange={e => setBulkForm({ ...bulkForm, category: e.target.value })}
                >
                  {CATEGORIES.map((cat) => (
                    <MenuItem key={cat.value} value={cat.value}>
                      {cat.label}
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
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBulkDialogOpen(false)}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={async () => {
              // Chamada de API PATCH para atualizar em massa (bulk)
              const updateData = {};
              if (bulkForm.category) updateData.category = bulkForm.category;
              if (bulkForm.date) {
                let d = bulkForm.date;
                if (typeof d === 'string' && d.includes('-')) {
                  const [year, month, day] = d.split('-');
                  d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
                }
                if (d instanceof Date && !isNaN(d)) {
                  const year = d.getFullYear();
                  const month = String(d.getMonth() + 1).padStart(2, '0');
                  const day = String(d.getDate()).padStart(2, '0');
                  updateData.date = `${year}-${month}-${day}`;
                }
              }
              const result = await expenseService.bulkPatch(selectedIds, updateData);
              setBulkDialogOpen(false);
              setSelectedIds([]);
              setBulkForm({ category: '', date: null });
              loadExpenses();
              setSuccess(`Despesas atualizadas em massa: ${result.updated_count || 0}`);
              if (result.errors) {
                setError('Algumas despesas não foram atualizadas. Verifique os detalhes.');
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
        <MenuItem onClick={() => handleEdit(menuExpense)}>
          <ListItemIcon>
            <Edit />
          </ListItemIcon>
          <ListItemText>Editar</ListItemText>
        </MenuItem>
        <MenuItem onClick={() => handleDeleteClick(menuExpense)}>
          <ListItemIcon>
            <Delete />
          </ListItemIcon>
          <ListItemText>Excluir</ListItemText>
        </MenuItem>
      </Menu>

      {/* Dialog de Formulário */}
      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        expense={selectedExpense}
        onSuccess={() => {
          loadExpenses();
          setSuccess(selectedExpense ? 'Despesa atualizada com sucesso' : 'Despesa criada com sucesso');
        }}
      />

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Confirmar Exclusão</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir a despesa "{expenseToDelete?.description}"?
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
          setSelectedExpense(null);
          setFormOpen(true);
        }}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default Expenses;
