const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Para desenvolvimento local, usaremos uma instância local do MongoDB
    // Em produção, você deve usar uma string de conexão segura
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/pizzaria_management';
    
    const conn = await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`MongoDB conectado: ${conn.connection.host}`);
    
    // Configurar eventos de conexão
    mongoose.connection.on('error', (err) => {
      console.error('Erro na conexão com MongoDB:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB desconectado');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('Conexão com MongoDB fechada devido ao encerramento da aplicação');
      process.exit(0);
    });

  } catch (error) {
    console.error('Erro ao conectar com MongoDB:', error);
    process.exit(1);
  }
};

module.exports = connectDB;

