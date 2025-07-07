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
    const { status, tipo, data_inicio, data_fim, ativo = true } = req.query;
    
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
        filtros.createdAt.$lte = new Date(data_fim);
      }
    }

    const pedidos = await Pedido.find(filtros)
      .populate('itens.produto', 'nome categoria')
      .sort({ createdAt: -1 })
      .limit(100); // Limitar para performance

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

// @route   GET /api/pedidos/kds
// @desc    Obter pedidos para o painel KDS
// @access  Private
router.get('/kds', auth, async (req, res) => {
  try {
    const { setor } = req.query;
    
    // Filtros baseados no setor
    let statusFiltros = ['aguardando_preparo', 'em_preparo', 'pronto', 'despachado'];
    
    if (setor === 'preparo') {
      statusFiltros = ['aguardando_preparo', 'em_preparo'];
    } else if (setor === 'expedição') {
      statusFiltros = ['pronto', 'despachado'];
    } else if (setor === 'entrega') {
      statusFiltros = ['despachado'];
    }

    const pedidos = await Pedido.find({
      status: { $in: statusFiltros },
      ativo: true
    })
    .populate('itens.produto', 'nome categoria tempo_preparo_estimado')
    .sort({ 'tempos.pedido_criado': 1 });

    // Calcular tempo decorrido para cada pedido
    const pedidosComTempo = pedidos.map(pedido => {
      const agora = new Date();
      let tempoDecorrido = 0;
      
      if (pedido.status === 'aguardando_preparo') {
        tempoDecorrido = Math.round((agora - pedido.tempos.pedido_criado) / (1000 * 60));
      } else if (pedido.status === 'em_preparo' && pedido.tempos.preparo_iniciado) {
        tempoDecorrido = Math.round((agora - pedido.tempos.preparo_iniciado) / (1000 * 60));
      } else if (pedido.status === 'pronto' && pedido.tempos.preparo_concluido) {
        tempoDecorrido = Math.round((agora - pedido.tempos.preparo_concluido) / (1000 * 60));
      } else if (pedido.status === 'despachado' && pedido.tempos.despachado) {
        tempoDecorrido = Math.round((agora - pedido.tempos.despachado) / (1000 * 60));
      }

      return {
        ...pedido.toObject(),
        tempo_decorrido_minutos: tempoDecorrido
      };
    });

    res.json({
      success: true,
      pedidos: pedidosComTempo
    });

  } catch (error) {
    console.error('Erro ao obter pedidos KDS:', error);
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
      .populate('itens.produto', 'nome categoria descricao');

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
    const {
      cliente,
      tipo,
      canal,
      itens,
      pagamento,
      observacoes_gerais
    } = req.body;

    // Validar itens e calcular preços
    let valorTotal = 0;
    const itensProcessados = [];

    for (const item of itens) {
      const produto = await Produto.findById(item.produto);
      if (!produto || !produto.disponivel) {
        return res.status(400).json({
          success: false,
          message: `Produto não encontrado ou indisponível: ${item.produto}`
        });
      }

      // Encontrar preço do tamanho
      const tamanhoInfo = produto.tamanhos.find(t => t.nome === item.tamanho);
      if (!tamanhoInfo || !tamanhoInfo.disponivel) {
        return res.status(400).json({
          success: false,
          message: `Tamanho não disponível: ${item.tamanho}`
        });
      }

      let precoItem = tamanhoInfo.preco * item.quantidade;

      // Adicionar preço da borda
      if (item.borda && item.borda.tipo) {
        const bordaInfo = produto.bordas_disponiveis.find(b => b.nome === item.borda.tipo);
        if (bordaInfo && bordaInfo.disponivel) {
          precoItem += bordaInfo.preco * item.quantidade;
          item.borda.preco = bordaInfo.preco;
        }
      }

      // Adicionar preço dos adicionais
      if (item.adicionais && item.adicionais.length > 0) {
        for (const adicional of item.adicionais) {
          const adicionalInfo = produto.adicionais_disponiveis.find(a => a.nome === adicional.nome);
          if (adicionalInfo && adicionalInfo.disponivel) {
            precoItem += adicionalInfo.preco * item.quantidade;
            adicional.preco = adicionalInfo.preco;
          }
        }
      }

      item.preco = precoItem;
      valorTotal += precoItem;
      itensProcessados.push(item);
    }

    // Criar pedido
    const novoPedido = new Pedido({
      cliente,
      tipo,
      canal,
      itens: itensProcessados,
      pagamento: {
        ...pagamento,
        valor_total: valorTotal
      },
      observacoes_gerais
    });

    await novoPedido.save();

    // Popular dados para resposta
    await novoPedido.populate('itens.produto', 'nome categoria');

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

    // Verificar permissões baseadas no status
    if (status === 'em_preparo' || status === 'pronto') {
      if (!req.usuario.temPermissao('atualizar_status_preparo')) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para atualizar status de preparo'
        });
      }
    }

    if (status === 'despachado' || status === 'entregue') {
      if (!req.usuario.temPermissao('atualizar_status_entrega')) {
        return res.status(403).json({
          success: false,
          message: 'Sem permissão para atualizar status de entrega'
        });
      }
    }

    pedido.status = status;
    await pedido.save();

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

// @route   PUT /api/pedidos/:id
// @desc    Editar pedido
// @access  Private
router.put('/:id', auth, verificarPermissao('editar_pedido'), async (req, res) => {
  try {
    const pedido = await Pedido.findById(req.params.id);
    if (!pedido) {
      return res.status(404).json({
        success: false,
        message: 'Pedido não encontrado'
      });
    }

    // Não permitir edição de pedidos já em preparo
    if (['em_preparo', 'pronto', 'despachado', 'entregue'].includes(pedido.status)) {
      return res.status(400).json({
        success: false,
        message: 'Não é possível editar pedidos em preparo ou finalizados'
      });
    }

    const camposEditaveis = ['cliente', 'observacoes_gerais'];
    camposEditaveis.forEach(campo => {
      if (req.body[campo] !== undefined) {
        pedido[campo] = req.body[campo];
      }
    });

    await pedido.save();

    res.json({
      success: true,
      message: 'Pedido atualizado com sucesso',
      pedido
    });

  } catch (error) {
    console.error('Erro ao editar pedido:', error);
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

