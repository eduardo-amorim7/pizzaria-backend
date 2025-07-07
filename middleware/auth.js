const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

const auth = async (req, res, next) => {
  try {
    // Obter token do header
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token de acesso não fornecido' 
      });
    }

    // Verificar token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'pizzaria_secret_key');
    
    // Buscar usuário no banco
    const usuario = await Usuario.findById(decoded.usuario.id).select('-senha');
    
    if (!usuario || !usuario.ativo) {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido ou usuário inativo' 
      });
    }

    // Adicionar usuário ao request
    req.usuario = usuario;
    next();

  } catch (error) {
    console.error('Erro na autenticação:', error);
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token inválido' 
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: 'Token expirado' 
      });
    }

    res.status(500).json({ 
      success: false, 
      message: 'Erro interno do servidor' 
    });
  }
};

// Middleware para verificar permissões específicas
const verificarPermissao = (acao) => {
  return (req, res, next) => {
    if (!req.usuario.temPermissao(acao)) {
      return res.status(403).json({ 
        success: false, 
        message: `Sem permissão para: ${acao}` 
      });
    }
    next();
  };
};

module.exports = { auth, verificarPermissao };

