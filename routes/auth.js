const express = require('express');
const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Registrar novo usuário
// @access  Public (inicialmente, depois pode ser restrito por lógica interna)
router.post("/register", async (req, res) => {
  try {
    const { nome, email, senha, nivel_acesso } = req.body;

    // Criar novo usuário
    const usuarioExistente = await Usuario.findOne({ email });
    if (usuarioExistente) {
      return res.status(400).json({ 
        success: false, 
        message: 'Usuário já existe com este email' 
      });
    }

    // Criar novo usuário
    const novoUsuario = new Usuario({
      nome,
      email,
      senha,
      nivel_acesso
    });

    await novoUsuario.save();

    // Remover senha da resposta
    const usuarioResposta = novoUsuario.toObject();
    delete usuarioResposta.senha;

    res.status(201).json({
      success: true,
      message: 'Usuário criado com sucesso',
      usuario: usuarioResposta
    });

  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   POST /api/auth/login
// @desc    Autenticar usuário
// @access  Public
router.post('/login', async (req, res) => {
  try {
    const { email, senha } = req.body;

    // Validar entrada
    if (!email || !senha) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email e senha são obrigatórios' 
      });
    }

    // Verificar se usuário existe
    const usuario = await Usuario.findOne({ email, ativo: true });
    if (!usuario) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Verificar senha
    const senhaValida = await usuario.compararSenha(senha);
    if (!senhaValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Credenciais inválidas' 
      });
    }

    // Atualizar último login
    usuario.ultimo_login = new Date();
    await usuario.save();

    // Gerar JWT
    const payload = {
      usuario: {
        id: usuario._id,
        email: usuario.email,
        nivel_acesso: usuario.nivel_acesso
      }
    };

    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || 'pizzaria_secret_key',
      { expiresIn: '24h' }
    );

    // Remover senha da resposta
    const usuarioResposta = usuario.toObject();
    delete usuarioResposta.senha;

    res.json({
      success: true,
      message: 'Login realizado com sucesso',
      token,
      usuario: usuarioResposta
    });

  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   GET /api/auth/me
// @desc    Obter dados do usuário logado
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id).select('-senha');
    
    if (!usuario) {
      return res.status(404).json({ 
        success: false, 
        message: 'Usuário não encontrado' 
      });
    }

    res.json({
      success: true,
      usuario
    });

  } catch (error) {
    console.error('Erro ao obter dados do usuário:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

// @route   PUT /api/auth/senha
// @desc    Alterar senha do usuário
// @access  Private
router.put('/senha', auth, async (req, res) => {
  try {
    const { senha_atual, nova_senha } = req.body;

    if (!senha_atual || !nova_senha) {
      return res.status(400).json({ 
        success: false, 
        message: 'Senha atual e nova senha são obrigatórias' 
      });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    
    // Verificar senha atual
    const senhaValida = await usuario.compararSenha(senha_atual);
    if (!senhaValida) {
      return res.status(401).json({ 
        success: false, 
        message: 'Senha atual incorreta' 
      });
    }

    // Atualizar senha
    usuario.senha = nova_senha;
    await usuario.save();

    res.json({
      success: true,
      message: 'Senha alterada com sucesso'
    });

  } catch (error) {
    console.error('Erro ao alterar senha:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
});

module.exports = router;

