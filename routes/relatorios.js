const express = require('express');
const Pedido = require('../models/Pedido');
const Produto = require('../models/Produto');
const { auth, verificarPermissao } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/relatorios/dashboard
// @desc    Obter dados para dashboard
// @access  Private
router.get('/dashboard', auth, async (req, res) => {
  try {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    // Pedidos de hoje
    const pedidosHoje = await Pedido.find({
      createdAt: { $gte: hoje, $lt: amanha },
      ativo: true
    });

    // Pedidos ativos (não entregues/cancelados)
    const pedidosAtivos = await Pedido.find({
      status: { $in: ['aguardando_preparo', 'em_preparo', 'pronto', 'despachado'] },
      ativo: true
    });

    // Calcular faturamento de hoje
    const faturamentoHoje = pedidosHoje
      .filter(p => p.status === 'entregue')
      .reduce((total, pedido) => total + pedido.pagamento.valor_total, 0);

    // Calcular tempo médio de preparo
    const pedidosComTempo = pedidosHoje.filter(p => 
      p.tempos.preparo_iniciado && p.tempos.preparo_concluido
    );
    
    let tempoMedioPreparo = 0;
    if (pedidosComTempo.length > 0) {
      const tempoTotal = pedidosComTempo.reduce((total, pedido) => {
        const tempo = (pedido.tempos.preparo_concluido - pedido.tempos.preparo_iniciado) / (1000 * 60);
        return total + tempo;
      }, 0);
      tempoMedioPreparo = Math.round(tempoTotal / pedidosComTempo.length);
    }

    res.json({
      success: true,
      dados: {
        pedidos_hoje: pedidosHoje.length,
        pedidos_ativos: pedidosAtivos.length,
        faturamento_hoje: faturamentoHoje,
        tempo_medio_preparo: tempoMedioPreparo
      }
    });

  } catch (error) {
    console.error('Erro ao obter dados do dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/relatorios/vendas
// @desc    Relatório de vendas
// @access  Private
router.get('/vendas', auth, verificarPermissao('ver_relatorios'), async (req, res) => {
  try {
    const { data_inicio, data_fim, agrupamento = 'dia' } = req.query;
    
    let filtroData = {};
    if (data_inicio || data_fim) {
      filtroData.createdAt = {};
      if (data_inicio) {
        filtroData.createdAt.$gte = new Date(data_inicio);
      }
      if (data_fim) {
        const dataFim = new Date(data_fim);
        dataFim.setHours(23, 59, 59, 999);
        filtroData.createdAt.$lte = dataFim;
      }
    }

    // Pipeline de agregação baseado no agrupamento
    let groupBy;
    let dateFormat;
    
    switch (agrupamento) {
      case 'hora':
        groupBy = {
          ano: { $year: '$createdAt' },
          mes: { $month: '$createdAt' },
          dia: { $dayOfMonth: '$createdAt' },
          hora: { $hour: '$createdAt' }
        };
        dateFormat = '%Y-%m-%d %H:00';
        break;
      case 'mes':
        groupBy = {
          ano: { $year: '$createdAt' },
          mes: { $month: '$createdAt' }
        };
        dateFormat = '%Y-%m';
        break;
      default: // dia
        groupBy = {
          ano: { $year: '$createdAt' },
          mes: { $month: '$createdAt' },
          dia: { $dayOfMonth: '$createdAt' }
        };
        dateFormat = '%Y-%m-%d';
    }

    const pipeline = [
      {
        $match: {
          ...filtroData,
          status: 'entregue',
          ativo: true
        }
      },
      {
        $group: {
          _id: groupBy,
          total_vendas: { $sum: '$pagamento.valor_total' },
          quantidade_pedidos: { $sum: 1 },
          ticket_medio: { $avg: '$pagamento.valor_total' },
          data_formatada: {
            $first: {
              $dateToString: {
                format: dateFormat,
                date: '$createdAt'
              }
            }
          }
        }
      },
      {
        $sort: { '_id.ano': 1, '_id.mes': 1, '_id.dia': 1, '_id.hora': 1 }
      }
    ];

    const resultados = await Pedido.aggregate(pipeline);

    // Calcular totais
    const totais = resultados.reduce((acc, item) => ({
      total_vendas: acc.total_vendas + item.total_vendas,
      quantidade_pedidos: acc.quantidade_pedidos + item.quantidade_pedidos
    }), { total_vendas: 0, quantidade_pedidos: 0 });

    totais.ticket_medio = totais.quantidade_pedidos > 0 ? 
      totais.total_vendas / totais.quantidade_pedidos : 0;

    res.json({
      success: true,
      dados: resultados,
      totais: totais
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de vendas:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/relatorios/produtos
// @desc    Relatório de produtos mais vendidos
// @access  Private
router.get('/produtos', auth, verificarPermissao('ver_relatorios'), async (req, res) => {
  try {
    const { data_inicio, data_fim, limite = 10 } = req.query;
    
    let filtroData = {};
    if (data_inicio || data_fim) {
      filtroData.createdAt = {};
      if (data_inicio) {
        filtroData.createdAt.$gte = new Date(data_inicio);
      }
      if (data_fim) {
        const dataFim = new Date(data_fim);
        dataFim.setHours(23, 59, 59, 999);
        filtroData.createdAt.$lte = dataFim;
      }
    }

    const pipeline = [
      {
        $match: {
          ...filtroData,
          status: 'entregue',
          ativo: true
        }
      },
      {
        $unwind: '$itens'
      },
      {
        $lookup: {
          from: 'produtos',
          localField: 'itens.produto',
          foreignField: '_id',
          as: 'produto_info'
        }
      },
      {
        $unwind: '$produto_info'
      },
      {
        $group: {
          _id: '$itens.produto',
          nome_produto: { $first: '$produto_info.nome' },
          categoria: { $first: '$produto_info.categoria' },
          quantidade_vendida: { $sum: '$itens.quantidade' },
          receita_total: { $sum: '$itens.preco' },
          preco_medio: { $avg: '$itens.preco' }
        }
      },
      {
        $sort: { quantidade_vendida: -1 }
      },
      {
        $limit: parseInt(limite)
      }
    ];

    const resultados = await Pedido.aggregate(pipeline);

    res.json({
      success: true,
      dados: resultados
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de produtos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/relatorios/tempos
// @desc    Relatório de tempos de preparo e entrega
// @access  Private
router.get('/tempos', auth, verificarPermissao('ver_relatorios'), async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let filtroData = {};
    if (data_inicio || data_fim) {
      filtroData.createdAt = {};
      if (data_inicio) {
        filtroData.createdAt.$gte = new Date(data_inicio);
      }
      if (data_fim) {
        const dataFim = new Date(data_fim);
        dataFim.setHours(23, 59, 59, 999);
        filtroData.createdAt.$lte = dataFim;
      }
    }

    const pedidos = await Pedido.find({
      ...filtroData,
      status: { $in: ['pronto', 'despachado', 'entregue'] },
      ativo: true
    }).populate('itens.produto', 'nome categoria');

    const metricas = {
      tempo_preparo: {
        pedidos_analisados: 0,
        tempo_medio: 0,
        tempo_minimo: null,
        tempo_maximo: null,
        tempos: []
      },
      tempo_entrega: {
        pedidos_analisados: 0,
        tempo_medio: 0,
        tempo_minimo: null,
        tempo_maximo: null,
        tempos: []
      },
      tempo_total: {
        pedidos_analisados: 0,
        tempo_medio: 0,
        tempo_minimo: null,
        tempo_maximo: null,
        tempos: []
      }
    };

    pedidos.forEach(pedido => {
      // Tempo de preparo
      if (pedido.tempos.preparo_iniciado && pedido.tempos.preparo_concluido) {
        const tempoPreparo = Math.round(
          (pedido.tempos.preparo_concluido - pedido.tempos.preparo_iniciado) / (1000 * 60)
        );
        metricas.tempo_preparo.tempos.push(tempoPreparo);
      }

      // Tempo de entrega
      if (pedido.tempos.despachado && pedido.tempos.entregue) {
        const tempoEntrega = Math.round(
          (pedido.tempos.entregue - pedido.tempos.despachado) / (1000 * 60)
        );
        metricas.tempo_entrega.tempos.push(tempoEntrega);
      }

      // Tempo total
      if (pedido.tempos.pedido_criado && pedido.tempos.entregue) {
        const tempoTotal = Math.round(
          (pedido.tempos.entregue - pedido.tempos.pedido_criado) / (1000 * 60)
        );
        metricas.tempo_total.tempos.push(tempoTotal);
      }
    });

    // Calcular estatísticas para cada métrica
    Object.keys(metricas).forEach(metrica => {
      const tempos = metricas[metrica].tempos;
      if (tempos.length > 0) {
        metricas[metrica].pedidos_analisados = tempos.length;
        metricas[metrica].tempo_medio = Math.round(
          tempos.reduce((a, b) => a + b, 0) / tempos.length
        );
        metricas[metrica].tempo_minimo = Math.min(...tempos);
        metricas[metrica].tempo_maximo = Math.max(...tempos);
      }
    });

    res.json({
      success: true,
      dados: metricas
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de tempos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/relatorios/canais
// @desc    Relatório por canal de vendas
// @access  Private
router.get('/canais', auth, verificarPermissao('ver_relatorios'), async (req, res) => {
  try {
    const { data_inicio, data_fim } = req.query;
    
    let filtroData = {};
    if (data_inicio || data_fim) {
      filtroData.createdAt = {};
      if (data_inicio) {
        filtroData.createdAt.$gte = new Date(data_inicio);
      }
      if (data_fim) {
        const dataFim = new Date(data_fim);
        dataFim.setHours(23, 59, 59, 999);
        filtroData.createdAt.$lte = dataFim;
      }
    }

    const pipeline = [
      {
        $match: {
          ...filtroData,
          status: 'entregue',
          ativo: true
        }
      },
      {
        $group: {
          _id: '$canal',
          quantidade_pedidos: { $sum: 1 },
          receita_total: { $sum: '$pagamento.valor_total' },
          ticket_medio: { $avg: '$pagamento.valor_total' }
        }
      },
      {
        $sort: { receita_total: -1 }
      }
    ];

    const resultados = await Pedido.aggregate(pipeline);

    // Calcular percentuais
    const totalReceita = resultados.reduce((total, item) => total + item.receita_total, 0);
    const totalPedidos = resultados.reduce((total, item) => total + item.quantidade_pedidos, 0);

    const dadosComPercentual = resultados.map(item => ({
      ...item,
      percentual_receita: totalReceita > 0 ? (item.receita_total / totalReceita) * 100 : 0,
      percentual_pedidos: totalPedidos > 0 ? (item.quantidade_pedidos / totalPedidos) * 100 : 0
    }));

    res.json({
      success: true,
      dados: dadosComPercentual,
      totais: {
        receita_total: totalReceita,
        quantidade_pedidos: totalPedidos
      }
    });

  } catch (error) {
    console.error('Erro ao gerar relatório de canais:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;

