const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');

const app = express();
const server = http.createServer(app);

// Configurar CORS para Express
app.use(cors({
  origin: "*",
  credentials: true
}));

// Configurar Socket.IO com CORS
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Conectar ao banco de dados
connectDB();

// Middleware para adicionar io ao request
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Importar e usar rotas uma por vez para identificar o problema
try {
  const authRoutes = require('./routes/auth');
  app.use('/api/auth', authRoutes);
  console.log('Rotas de auth carregadas com sucesso');
} catch (error) {
  console.error('Erro ao carregar rotas de auth:', error.message);
}

try {
  const produtosRoutes = require('./routes/produtos');
  app.use('/api/produtos', produtosRoutes);
  console.log('Rotas de produtos carregadas com sucesso');
} catch (error) {
  console.error('Erro ao carregar rotas de produtos:', error.message);
}

try {
  const relatoriosRoutes = require('./routes/relatorios');
  app.use('/api/relatorios', relatoriosRoutes);
  console.log('Rotas de relatórios carregadas com sucesso');
} catch (error) {
  console.error('Erro ao carregar rotas de relatórios:', error.message);
}

try {
  const pedidosRoutes = require('./routes/pedidos');
  app.use('/api/pedidos', pedidosRoutes);
  console.log('Rotas de pedidos carregadas com sucesso');
} catch (error) {
  console.error('Erro ao carregar rotas de pedidos:', error.message);
}

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API da Pizzaria funcionando!',
    timestamp: new Date().toISOString()
  });
});

// Socket.IO para tempo real
io.on('connection', (socket) => {
  console.log('Cliente conectado:', socket.id);

  socket.on('disconnect', () => {
    console.log('Cliente desconectado:', socket.id);
  });
});

// Middleware de tratamento de erros
app.use((err, req, res, next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({
    success: false,
    message: 'Erro interno do servidor'
  });
});

// Middleware para rotas não encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada'
  });
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`API disponível em: http://localhost:${PORT}/api`);
});

module.exports = { app, server, io };

