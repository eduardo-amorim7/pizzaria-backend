const mongoose = require('mongoose');

const itemPedidoSchema = new mongoose.Schema({
  produto: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Produto',
    required: true
  },
  quantidade: {
    type: Number,
    required: true,
    default: 1
  },
  tamanho: {
    type: String,
    enum: ['pequena', 'media', 'grande', 'gigante', 'broto'],
    required: true
  },
  sabores: [{
    type: String,
    required: true
  }],
  borda: {
    tipo: String,
    preco: Number
  },
  adicionais: [{
    nome: String,
    preco: Number
  }],
  observacoes: String,
  preco: {
    type: Number,
    required: true
  }
});

const pedidoSchema = new mongoose.Schema({
  numero: {
    type: String,
    required: true,
    unique: true
  },
  cliente: {
    nome: {
      type: String,
      required: true
    },
    telefone: String,
    endereco: {
      rua: String,
      numero: String,
      bairro: String,
      cidade: String,
      cep: String,
      complemento: String
    }
  },
  tipo: {
    type: String,
    enum: ['entrega', 'retirada', 'consumo_local'],
    required: true
  },
  canal: {
    type: String,
    enum: ['balcao', 'telefone', 'ifood', 'site', 'whatsapp'],
    required: true
  },
  itens: [itemPedidoSchema],
  status: {
    type: String,
    enum: ['aguardando_preparo', 'em_preparo', 'pronto', 'despachado', 'entregue', 'cancelado'],
    default: 'aguardando_preparo'
  },
  pagamento: {
    forma: {
      type: String,
      enum: ['dinheiro', 'cartao_debito', 'cartao_credito', 'pix'],
      required: true
    },
    valor_total: {
      type: Number,
      required: true
    },
    troco: Number,
    pago: {
      type: Boolean,
      default: false
    }
  },
  tempos: {
    pedido_criado: {
      type: Date,
      default: Date.now
    },
    preparo_iniciado: Date,
    preparo_concluido: Date,
    despachado: Date,
    entregue: Date
  },
  observacoes_gerais: String,
  ativo: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Middleware para gerar número do pedido automaticamente
pedidoSchema.pre('save', async function(next) {
  if (!this.numero) {
    const count = await mongoose.model('Pedido').countDocuments();
    this.numero = String(count + 1).padStart(3, '0');
  }
  next();
});

// Middleware para atualizar tempos automaticamente
pedidoSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    const now = new Date();
    switch (this.status) {
      case 'em_preparo':
        if (!this.tempos.preparo_iniciado) {
          this.tempos.preparo_iniciado = now;
        }
        break;
      case 'pronto':
        if (!this.tempos.preparo_concluido) {
          this.tempos.preparo_concluido = now;
        }
        break;
      case 'despachado':
        if (!this.tempos.despachado) {
          this.tempos.despachado = now;
        }
        break;
      case 'entregue':
        if (!this.tempos.entregue) {
          this.tempos.entregue = now;
        }
        break;
    }
  }
  next();
});

// Métodos para calcular tempos
pedidoSchema.methods.getTempoPreparoMinutos = function() {
  if (this.tempos.preparo_iniciado && this.tempos.preparo_concluido) {
    return Math.round((this.tempos.preparo_concluido - this.tempos.preparo_iniciado) / (1000 * 60));
  }
  return null;
};

pedidoSchema.methods.getTempoEntregaMinutos = function() {
  if (this.tempos.despachado && this.tempos.entregue) {
    return Math.round((this.tempos.entregue - this.tempos.despachado) / (1000 * 60));
  }
  return null;
};

pedidoSchema.methods.getTempoTotalMinutos = function() {
  if (this.tempos.pedido_criado && this.tempos.entregue) {
    return Math.round((this.tempos.entregue - this.tempos.pedido_criado) / (1000 * 60));
  }
  return null;
};

module.exports = mongoose.model('Pedido', pedidoSchema);

