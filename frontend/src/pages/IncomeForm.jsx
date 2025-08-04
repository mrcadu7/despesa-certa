import React, { useState } from 'react';
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
import { incomeService } from '../services/api';

const INCOME_TYPES = [
  { value: 'salario', label: 'Salário' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'investimentos', label: 'Investimentos' },
  { value: 'vendas', label: 'Vendas' },
  { value: 'bonus', label: 'Bônus' },
  { value: 'outros', label: 'Outros' },
];

const IncomeForm = ({ open = true, onClose = () => {}, income = null, onSuccess = () => {} }) => {
  const [formData, setFormData] = useState({
    description: '',
    value: '',
    income_type: '',
    date: null,
    is_recurring: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  React.useEffect(() => {
    if (income) {
      let dateValue = null;
      if (income.date) {
        const [year, month, day] = income.date.split('-');
        dateValue = new Date(Number(year), Number(month) - 1, Number(day));
      }
      setFormData({
        description: income.description,
        value: income.amount,
        income_type: income.income_type,
        date: dateValue,
        is_recurring: income.is_recurring,
      });
    } else {
      setFormData({
        description: '',
        value: '',
        income_type: '',
        date: null,
        is_recurring: false,
      });
    }
  }, [income, open]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      let dateStr = null;
      if (formData.date instanceof Date && !isNaN(formData.date)) {
        // Safe date: hora 12:00 para evitar bug de timezone
        const safeDate = new Date(formData.date.getFullYear(), formData.date.getMonth(), formData.date.getDate(), 12, 0, 0);
        const year = safeDate.getFullYear();
        const month = String(safeDate.getMonth() + 1).padStart(2, '0');
        const day = String(safeDate.getDate()).padStart(2, '0');
        dateStr = `${year}-${month}-${day}`;
      }
      const data = {
        description: formData.description,
        amount: parseFloat(formData.value),
        income_type: formData.income_type,
        date: dateStr,
        is_recurring: formData.is_recurring,
      };

      if (income) {
        await incomeService.update(income.id, data);
      } else {
        await incomeService.create(data);
      }

      onSuccess();
      onClose();
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || 'Erro ao salvar renda');
    } finally {
      setLoading(false);
    }
  };

  return (
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
                onChange={(newValue) => {
                  setFormData({ ...formData, date: newValue });
                }}
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
  );
};

export default IncomeForm;
