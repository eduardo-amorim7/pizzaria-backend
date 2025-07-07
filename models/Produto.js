const mongoose = require('mongoose');

const tamanhoSchema = new mongoose.Schema({
  nome: {
    type: String,
    enum: ['pequena', 'media', 'grande', 'gigante', 'broto'],
    required: true
  },
  preco: {
    type: Number,
    required: true
  },
  disponivel: {
    type: Boolean,
    default: true
  }
});

const bordaSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  preco: {
    type: Number,
    required: true
  },
  disponivel: {
    type: Boolean,
    default: true
  }
});

const adicionalSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  preco: {
    type: Number,
    required: true
  },
  disponivel: {
    type: Boolean,
    default: true
  }
});

const produtoSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  categoria: {
    type: String,
    enum: ['pizza', 'bebida', 'sobremesa', 'adicional'],
    required: true
  },
  descricao: String,
  ingredientes: [String],
  tamanhos: [tamanhoSchema],
  bordas_disponiveis: [bordaSchema],
  adicionais_disponiveis: [adicionalSchema],
  tempo_preparo_estimado: {
    type: Number, // em minutos
    default: 30
  },
  disponivel: {
    type: Boolean,
    default: true
  },
  vegetariana: {
    type: Boolean,
    default: false
  },
  imagem: String,
  ordem_exibicao: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Índices para melhor performance
produtoSchema.index({ categoria: 1, disponivel: 1 });
produtoSchema.index({ nome: 'text', descricao: 'text' });

module.exports = mongoose.model('Produto', produtoSchema);

