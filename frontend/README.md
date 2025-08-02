# 🎨 Frontend - Despesa Certa

Interface moderna e responsiva para o sistema de controle financeiro, desenvolvida com React, Material-UI e Vite.

## 🏗️ Arquitetura

### Stack Tecnológico
- **React 18** - Biblioteca para interfaces de usuário
- **Vite** - Build tool rápido e moderno
- **Material-UI 5** - Sistema de design
- **Zustand** - Gerenciamento de estado simplificado
- **React Router 6** - Roteamento SPA
- **Chart.js** - Gráficos interativos
- **Axios** - Cliente HTTP
- **date-fns** - Manipulação de datas

### Estrutura de Arquivos
```
src/
├── components/          # Componentes reutilizáveis
│   └── Navbar.jsx      # Barra de navegação
├── pages/              # Páginas da aplicação
│   ├── Dashboard.jsx   # Painel principal
│   ├── Expenses.jsx    # Gestão de despesas
│   ├── Income.jsx      # Controle de rendas
│   ├── Reports.jsx     # Relatórios e análises
│   ├── Profile.jsx     # Perfil do usuário
│   └── Auth.jsx        # Login/Registro
├── services/           # Camada de API
│   └── api.js         # Configuração Axios e endpoints
├── store/              # Estado global
│   └── index.js       # Stores Zustand
├── theme/              # Configuração do tema
│   └── theme.js       # Tema Material-UI
└── App.jsx            # Componente raiz
```

## 🎨 Design System

### Paleta de Cores
```javascript
const theme = {
  primary: '#2196F3',      // Azul principal
  secondary: '#4CAF50',    // Verde secundário
  error: '#F44336',        // Vermelho erro
  warning: '#FF9800',      // Laranja aviso
  success: '#4CAF50',      // Verde sucesso
  background: '#FAFAFA'    // Fundo cinza claro
}
```

### Componentes Personalizados
- **Cards** com sombras suaves
- **Botões** com estados de hover
- **Inputs** com validação visual
- **Gráficos** responsivos
- **Navegação** adaptativa

## 🔄 Gerenciamento de Estado

### Zustand Stores

#### Auth Store
```javascript
const useAuthStore = create((set) => ({
  isAuthenticated: false,
  user: null,
  token: null,
  login: (token, refreshToken, user) => { /* ... */ },
  logout: () => { /* ... */ },
  updateUser: (userData) => { /* ... */ }
}))
```

#### App Store
```javascript
const useAppStore = create((set) => ({
  expenses: [],
  income: [],
  isLoading: false,
  setExpenses: (expenses) => { /* ... */ },
  setIncome: (income) => { /* ... */ },
  setLoading: (loading) => { /* ... */ }
}))
```

## 🌐 Integração com API

### Configuração Axios
```javascript
// Interceptor para adicionar token automaticamente
api.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Interceptor para renovar token automaticamente
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      await refreshToken()
      return api.request(error.config)
    }
    return Promise.reject(error)
  }
)
```

### Serviços da API
- **authService** - Autenticação e autorização
- **expenseService** - CRUD de despesas
- **incomeService** - CRUD de rendas
- **analysisService** - Relatórios e análises
- **userService** - Perfil e configurações

## 📱 Responsividade

### Breakpoints Material-UI
```javascript
const theme = createTheme({
  breakpoints: {
    xs: 0,     // Mobile portrait
    sm: 600,   // Mobile landscape
    md: 960,   // Tablet
    lg: 1280,  // Desktop
    xl: 1920   // Large desktop
  }
})
```

### Componentes Responsivos
- **Grid system** flexível
- **Drawer** colapsível em mobile
- **Tables** com scroll horizontal
- **Charts** que se adaptam ao container
- **Forms** otimizados para touch

## 📊 Visualizações

### Chart.js Integration
```javascript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'

// Configuração global
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
)
```

### Tipos de Gráficos
- **Pie Chart** - Despesas por categoria
- **Bar Chart** - Receitas vs Despesas
- **Line Chart** - Evolução do saldo
- **Doughnut Chart** - Distribuição de gastos

## 🚀 Comandos Disponíveis

### Desenvolvimento
```bash
npm run dev          # Servidor de desenvolvimento
npm run build        # Build para produção
npm run preview      # Preview do build
npm run lint         # Análise de código
npm run lint:fix     # Correção automática
npm run type-check   # Verificação de tipos
```

### Docker
```bash
docker build -t despesa-certa-frontend .
docker run -p 3000:80 despesa-certa-frontend
```

## 🔧 Configuração

### Variáveis de Ambiente
```env
VITE_API_URL=http://localhost:8000/api
VITE_APP_NAME=Despesa Certa
VITE_APP_VERSION=1.0.0
VITE_ENVIRONMENT=development
```

### Vite Config
```javascript
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
})
```

## 🧪 Testes

### Setup de Testes
```bash
npm install --save-dev @testing-library/react
npm install --save-dev @testing-library/jest-dom
npm install --save-dev @testing-library/user-event
```

### Executar Testes
```bash
npm run test         # Testes interativos
npm run test:ci      # Testes CI
npm run coverage     # Cobertura de código
```

## 🎯 Funcionalidades Principais

### 📊 Dashboard
- **Resumo Financeiro** em cards informativos
- **Gráfico de Pizza** para categorias de gastos
- **Lista de Despesas Recentes** com links rápidos
- **Indicadores de Saúde Financeira** coloridos
- **Botão Flutuante** para adicionar despesas rapidamente

### 💸 Gestão de Despesas
- **Formulário Modal** para criar/editar despesas
- **Tabela Avançada** com filtros e paginação
- **Categorização Visual** com chips coloridos
- **Menu de Ações** para cada item
- **Exportação** em CSV e PDF

### 💰 Controle de Rendas
- **Cards de Resumo** do mês atual
- **Tipos de Renda** configuráveis
- **Filtros por Período** flexíveis
- **Indicadores Visuais** para recorrência

### 📈 Relatórios
- **Múltiplos Gráficos** interativos
- **Filtros Personalizáveis** por período
- **Insights Automáticos** baseados em dados
- **Exportação** em múltiplos formatos

### 👤 Perfil
- **Informações Pessoais** editáveis
- **Configurações de Notificação** granulares
- **Histórico de Atividades** detalhado
- **Exportação de Dados** pessoais

## 🔐 Segurança

### Autenticação
- **JWT Tokens** com renovação automática
- **Persistência Segura** no localStorage
- **Logout Automático** em caso de token inválido
- **Rotas Protegidas** com redirecionamento

### Validação
- **Validação de Formulários** em tempo real
- **Sanitização de Inputs** antes do envio
- **Feedback Visual** para erros de validação

## 🎨 Customização

### Tema Personalizado
```javascript
const customTheme = createTheme({
  palette: {
    primary: {
      main: '#2196F3',
      light: '#64B5F6',
      dark: '#1976D2'
    },
    // ... outras configurações
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
          borderRadius: 12
        }
      }
    }
  }
})
```

### Componentes Customizados
Todos os componentes seguem as guidelines do Material-UI e podem ser facilmente customizados através do sistema de temas.

## 📚 Documentação Adicional

- [Material-UI Documentation](https://mui.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Zustand Documentation](https://github.com/pmndrs/zustand)
- [Chart.js Documentation](https://www.chartjs.org/)
- [Vite Documentation](https://vitejs.dev/)

## 🚀 Deploy

### Build de Produção
```bash
npm run build
```

### Docker Multi-stage Build
O Dockerfile utiliza build multi-stage para otimização:
1. **Stage 1**: Build da aplicação com Node.js
2. **Stage 2**: Servir com Nginx otimizado

### Nginx Configuration
- **SPA Routing** configurado
- **Compressão Gzip** habilitada
- **Cache** otimizado para assets estáticos
- **Security Headers** configurados

---

✨ **Interface moderna, responsiva e intuitiva para gestão financeira pessoal!** ✨
