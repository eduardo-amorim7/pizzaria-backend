const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const connectDB = require('./config/database');

// Importar rotas
const authRoutes = require('./routes/auth');
const pedidosRoutes = require('./routes/pedidos');
const produtosRoutes = require('./routes/produtos');
const relatoriosRoutes = require('./routes/relatorios');

const app = express();
const server = http.createServer(app);

// Configurar CORS para Express
app.use(cors({
  origin: "*", // Em produção, especificar domínios específicos
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

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/relatorios', relatoriosRoutes);

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

  // Entrar em sala específica (ex: setor)
  socket.on('join_setor', (setor) => {
    socket.join(setor);
    console.log(`Cliente ${socket.id} entrou no setor: ${setor}`);
  });

  // Sair de sala
  socket.on('leave_setor', (setor) => {
    socket.leave(setor);
    console.log(`Cliente ${socket.id} saiu do setor: ${setor}`);
  });

  // Atualização de status de pedido
  socket.on('pedido_status_update', (data) => {
    // Emitir para todos os clientes conectados
    io.emit('pedido_updated', data);
    
    // Emitir para setores específicos se necessário
    if (data.setor) {
      io.to(data.setor).emit('pedido_updated', data);
    }
  });

  // Novo pedido criado
  socket.on('novo_pedido', (pedido) => {
    // Emitir para todos os clientes
    io.emit('novo_pedido', pedido);
    
    // Emitir alerta sonoro para cozinha
    io.to('preparo').emit('novo_pedido_alerta', pedido);
  });

  // Pedido atrasado
  socket.on('pedido_atrasado', (pedido) => {
    io.emit('pedido_atrasado', pedido);
  });

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

