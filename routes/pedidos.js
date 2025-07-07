const express = require('express');
const Pedido = require('../models/Pedido');
const Produto = require('../models/Produto');
const { auth, verificarPermissao } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/pedidos
// @desc    Listar pedidos
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { status, tipo, data_inicio, data_fim, ativo = true, limit = 50 } = req.query;
    
    // Construir filtros
    const filtros = { ativo };
    
    if (status) {
      filtros.status = status;
    }
    
    if (tipo) {
      filtros.tipo = tipo;
    }
    
    if (data_inicio || data_fim) {
      filtros.createdAt = {};
      if (data_inicio) {
        filtros.createdAt.$gte = new Date(data_inicio);
      }
      if (data_fim) {
        const dataFim = new Date(data_fim);
        dataFim.setHours(23, 59, 59, 999);
        filtros.createdAt.$lte = dataFim;
      }
    }

    const pedidos = await Pedido.find(filtros)
      .populate('itens.produto', 'nome categoria')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json({
      success: true,
      pedidos
    });

  } catch (error) {
    console.error('Erro ao listar pedidos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/pedidos/:id
// @desc    Obter pedido por ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id)
      .populate('itens.produto', 'nome categoria');

    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    res.json({
      success: true,
      pedido
    });

  } catch (error) {
    console.error('Erro ao obter pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   POST /api/pedidos
// @desc    Criar novo pedido
// @access  Private
router.post('/', auth, verificarPermissao('criar_pedido'), async (req, res) => {
  try {
    const { cliente, tipo, canal, itens, pagamento, observacoes_gerais } = req.body;

    // Validações básicas
    if (!cliente || !cliente.nome) {
      return res.status(400).json({
        success: false,
        message: 'Nome do cliente é obrigatório'
      });
    }

    if (!itens || itens.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pelo menos um item é obrigatório'
      });
    }

    // Gerar número do pedido
    const ultimoPedido = await Pedido.findOne().sort({ numero: -1 });
    const proximoNumero = ultimoPedido ? 
      String(parseInt(ultimoPedido.numero) + 1).padStart(3, '0') : 
      '001';

    const novoPedido = new Pedido({
      numero: proximoNumero,
      cliente,
      tipo: tipo || 'entrega',
      canal: canal || 'balcao',
      itens,
      status: 'aguardando_preparo',
      pagamento,
      observacoes_gerais,
      tempos: {
        pedido_criado: new Date()
      }
    });

    await novoPedido.save();

    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.emit('novo_pedido', novoPedido);
    }

    res.status(201).json({
      success: true,
      message: 'Pedido criado com sucesso',
      pedido: novoPedido
    });

  } catch (error) {
    console.error('Erro ao criar pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   PUT /api/pedidos/:id/status
// @desc    Atualizar status do pedido
// @access  Private
router.put('/:id/status', auth, async (req, res) => {
  try {
    const { status } = req.body;
    
    const statusValidos = ['aguardando_preparo', 'em_preparo', 'pronto', 'despachado', 'entregue', 'cancelado'];
    if (!statusValidos.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Status inválido'
      });
    }

    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Atualizar tempos baseado no status
    const agora = new Date();
    if (status === 'em_preparo' && !pedido.tempos.preparo_iniciado) {
      pedido.tempos.preparo_iniciado = agora;
    } else if (status === 'pronto' && !pedido.tempos.preparo_concluido) {
      pedido.tempos.preparo_concluido = agora;
    } else if (status === 'despachado' && !pedido.tempos.despachado) {
      pedido.tempos.despachado = agora;
    } else if (status === 'entregue' && !pedido.tempos.entregue) {
      pedido.tempos.entregue = agora;
    }

    pedido.status = status;
    await pedido.save();

    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.emit('status_atualizado', { pedidoId: pedido._id, status, pedido });
    }

    res.json({
      success: true,
      message: 'Status atualizado com sucesso',
      pedido
    });

  } catch (error) {
    console.error('Erro ao atualizar status:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   DELETE /api/pedidos/:id
// @desc    Cancelar pedido
// @access  Private
router.delete('/:id', auth, verificarPermissao('cancelar_pedido'), async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    pedido.status = 'cancelado';
    pedido.ativo = false;
    await pedido.save();

    // Emitir evento via Socket.IO
    if (req.io) {
      req.io.emit('pedido_cancelado', { pedidoId: pedido._id });
    }

    res.json({
      success: true,
      message: 'Pedido cancelado com sucesso'
    });

  } catch (error) {
    console.error('Erro ao cancelar pedido:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;

