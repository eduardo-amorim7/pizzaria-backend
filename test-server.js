const express = require('express');
const cors = require('cors');

const app = express();

// Configurar CORS
app.use(cors({
  origin: "*",
  credentials: true
}));

// Middleware
app.use(express.json());

// Rota de teste
app.get('/api/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'API da Pizzaria funcionando!',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor de teste rodando na porta ${PORT}`);
});

