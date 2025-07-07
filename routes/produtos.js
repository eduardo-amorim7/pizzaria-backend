const express = require('express');
const Produto = require('../models/Produto');
const { auth, verificarPermissao } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/produtos
// @desc    Listar produtos
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { categoria, disponivel = true, busca } = req.query;
    
    // Construir filtros
    const filtros = {};
    
    if (categoria) {
      filtros.categoria = categoria;
    }
    
    if (disponivel !== undefined) {
      filtros.disponivel = disponivel === 'true';
    }
    
    if (busca) {
      filtros.$text = { $search: busca };
    }

    const produtos = await Produto.find(filtros)
      .sort({ ordem_exibicao: 1, nome: 1 });

    res.json({
      success: true,
      produtos
    });

  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/produtos/categorias
// @desc    Listar categorias disponíveis
// @access  Private
router.get('/categorias', auth, async (req, res) => {
  try {
    const categorias = await Produto.distinct('categoria', { disponivel: true });
    
    res.json({
      success: true,
      categorias
    });

  } catch (error) {
    console.error('Erro ao listar categorias:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/produtos/:id
// @desc    Obter produto por ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const produto = await Produto.findById(req.params.id);

    if (!produto) {
      return res.status(404).json({ 
        success: false, 
        message: 'Produto não encontrado' 
      });
    }

    res.json({
      success: true,
      produto
    });

  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   POST /api/produtos
// @desc    Criar novo produto
// @access  Private
router.post('/', auth, verificarPermissao('gerenciar_produtos'), async (req, res) => {
  try {
    const {
      nome,
      categoria,
      descricao,
      ingredientes,
      tamanhos,
      bordas_disponiveis,
      adicionais_disponiveis,
      tempo_preparo_estimado,
      vegetariana,
      imagem,
      ordem_exibicao
    } = req.body;

    // Verificar se produto já existe
    const produtoExistente = await Produto.findOne({ nome, categoria });
    if (produtoExistente) {
      return res.status(400).json({
        success: false,
        message: 'Produto já existe nesta categoria'
      });
    }

    const novoProduto = new Produto({
      nome,
      categoria,
      descricao,
      ingredientes,
      tamanhos,
      bordas_disponiveis,
      adicionais_disponiveis,
      tempo_preparo_estimado,
      vegetariana,
      imagem,
      ordem_exibicao
    });

    await novoProduto.save();

    res.status(201).json({
      success: true,
      message: 'Produto criado com sucesso',
      produto: novoProduto
    });

  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   PUT /api/produtos/:id
// @desc    Atualizar produto
// @access  Private
router.put('/:id', auth, verificarPermissao('gerenciar_produtos'), async (req, res) => {
  try {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    const camposEditaveis = [
      'nome', 'descricao', 'ingredientes', 'tamanhos', 
      'bordas_disponiveis', 'adicionais_disponiveis', 
      'tempo_preparo_estimado', 'disponivel', 'vegetariana', 
      'imagem', 'ordem_exibicao'
    ];

    camposEditaveis.forEach(campo => {
      if (req.body[campo] !== undefined) {
        produto[campo] = req.body[campo];
      }
    });

    await produto.save();

    res.json({
      success: true,
      message: 'Produto atualizado com sucesso',
      produto
    });

  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   DELETE /api/produtos/:id
// @desc    Remover produto
// @access  Private
router.delete('/:id', auth, verificarPermissao('gerenciar_produtos'), async (req, res) => {
  try {
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    // Marcar como indisponível ao invés de deletar
    produto.disponivel = false;
    await produto.save();

    res.json({
      success: true,
      message: 'Produto removido com sucesso'
    });

  } catch (error) {
    console.error('Erro ao remover produto:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   PUT /api/produtos/:id/disponibilidade
// @desc    Alterar disponibilidade do produto
// @access  Private
router.put('/:id/disponibilidade', auth, verificarPermissao('gerenciar_produtos'), async (req, res) => {
  try {
    const { disponivel } = req.body;
    
    const produto = await Produto.findById(req.params.id);
    if (!produto) {
      return res.status(404).json({
        success: false,
        message: 'Produto não encontrado'
      });
    }

    produto.disponivel = disponivel;
    await produto.save();

    res.json({
      success: true,
      message: `Produto ${disponivel ? 'ativado' : 'desativado'} com sucesso`,
      produto
    });

  } catch (error) {
    console.error('Erro ao alterar disponibilidade:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;

