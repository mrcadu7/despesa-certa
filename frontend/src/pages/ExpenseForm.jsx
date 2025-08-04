import React, { useState, useEffect } from 'react';
import {
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
  Button,
  Grid,
  InputAdornment,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import ptBR from 'date-fns/locale/pt-BR';
import { expenseService } from '../services/api';

const CATEGORIES = [
  { value: 'alimentacao', label: 'Alimentação' },
  { value: 'transporte', label: 'Transporte' },
  { value: 'moradia', label: 'Moradia' },
  { value: 'saude', label: 'Saúde' },
  { value: 'lazer', label: 'Lazer' },
  { value: 'educacao', label: 'Educação' },
  { value: 'outros', label: 'Outros' },
];

const ExpenseForm = ({ open, onClose, expense = null, onSuccess }) => {
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    category: '',
    date: new Date(),
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);


  useEffect(() => {
    if (expense) {
      let dateValue = null;
      if (expense.date) {
        if (typeof expense.date === 'string' && expense.date.includes('-')) {
          const [year, month, day] = expense.date.split('-');
          dateValue = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
        } else if (expense.date instanceof Date) {
          dateValue = expense.date;
        } else {
          dateValue = null;
        }
      }
      setFormData({
        description: expense.description,
        value: expense.value,
        category: expense.category,
        date: dateValue,
      });
    } else {
      setFormData({
        description: '',
        value: '',
        category: '',
        date: null,
      });
    }
  }, [expense, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      let dateStr = null;
      if (formData.date instanceof Date && !isNaN(formData.date)) {
        const safeDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate(), 12, 0, 0);
        const year = safeDate.getFullYear();
        const month = String(safeDate.getMonth() + 1).padStart(2, '0');
        const day = String(safeDate.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      const data = {
        ...formData,
        value: parseFloat(formData.value),
        date: dateStr,
      };
      if (expense) {
        await expenseService.update(expense.id, data);
      } else {
        await expenseService.create(data);
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar despesa');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>
          {expense ? 'Editar Despesa' : 'Nova Despesa'}
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
                <InputLabel>Categoria</InputLabel>
                <Select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
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
                  label="Data"
                  value={formData.date}
                  onChange={(newValue) => setFormData({ ...formData, date: newValue })}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </LocalizationProvider>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Salvando...' : (expense ? 'Salvar' : 'Criar')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default ExpenseForm;
