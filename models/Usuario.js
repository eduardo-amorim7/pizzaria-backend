const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const usuarioSchema = new mongoose.Schema({
  nome: {
    type: String,
    required: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  senha: {
    type: String,
    required: true,
    minlength: 6
  },
  nivel_acesso: {
    type: String,
    enum: ['gerente', 'atendente', 'pizzaiolo', 'entregador', 'admin'],
    required: true
  },
  ativo: {
    type: Boolean,
    default: true
  },
  ultimo_login: Date,
  configuracoes: {
    notificacoes_sonoras: {
      type: Boolean,
      default: true
    },
    setor_preferido: {
      type: String,
      enum: ['todos', 'preparo', 'expedição', 'entrega']
    }
  }
}, {
  timestamps: true
});

// Middleware para hash da senha antes de salvar
usuarioSchema.pre('save', async function(next) {
  if (!this.isModified('senha')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.senha = await bcrypt.hash(this.senha, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Método para comparar senhas
usuarioSchema.methods.compararSenha = async function(senhaCandidata) {
  return await bcrypt.compare(senhaCandidata, this.senha);
};

// Método para verificar permissões
usuarioSchema.methods.temPermissao = function(acao) {
  const permissoes = {
    admin: ['*'],
    gerente: ['criar_pedido', 'editar_pedido', 'cancelar_pedido', 'ver_relatorios', 'gerenciar_produtos', 'gerenciar_usuarios'],
    atendente: ['criar_pedido', 'editar_pedido', 'ver_pedidos'],
    pizzaiolo: ['ver_pedidos', 'atualizar_status_preparo'],
    entregador: ['ver_pedidos', 'atualizar_status_entrega']
  };
  
  const permissoesUsuario = permissoes[this.nivel_acesso] || [];
  return permissoesUsuario.includes('*') || permissoesUsuario.includes(acao);
};

// Índices
usuarioSchema.index({ email: 1 });
usuarioSchema.index({ nivel_acesso: 1, ativo: 1 });

module.exports = mongoose.model('Usuario', usuarioSchema);

