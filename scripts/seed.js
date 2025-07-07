const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const connectDB = require('../config/database');
const Usuario = require('../models/Usuario');
const Produto = require('../models/Produto');
const Pedido = require('../models/Pedido');

async function seedDatabase() {
  try {
    console.log('Conectando ao banco de dados...');
    await connectDB();

    // Limpar dados existentes
    console.log('Limpando dados existentes...');
    await Usuario.deleteMany({});
    await Produto.deleteMany({});
    await Pedido.deleteMany({});

    // Criar usuários
    console.log('Criando usuários...');
    const usuarios = [
      {
        nome: 'Administrador',
        email: 'admin@pizzaria.com',
        senha: '123456',
        nivel_acesso: 'admin'
      },
      {
        nome: 'Gerente',
        email: 'gerente@pizzaria.com',
        senha: '123456',
        nivel_acesso: 'gerente'
      },
      {
        nome: 'Atendente',
        email: 'atendente@pizzaria.com',
        senha: '123456',
        nivel_acesso: 'atendente'
      },
      {
        nome: 'Pizzaiolo',
        email: 'pizzaiolo@pizzaria.com',
        senha: '123456',
        nivel_acesso: 'pizzaiolo'
      },
      {
        nome: 'Entregador',
        email: 'entregador@pizzaria.com',
        senha: '123456',
        nivel_acesso: 'entregador'
      }
    ];

    await Usuario.insertMany(usuarios);
    console.log('Usuários criados com sucesso!');

    // Criar produtos
    console.log('Criando produtos...');
    const produtos = [
      {
        nome: 'Pizza Margherita',
        categoria: 'pizza',
        descricao: 'Molho de tomate, mussarela, manjericão e azeite',
        ingredientes: ['molho de tomate', 'mussarela', 'manjericão', 'azeite'],
        tamanhos: [
          { nome: 'pequena', preco: 25.90, disponivel: true },
          { nome: 'media', preco: 35.90, disponivel: true },
          { nome: 'grande', preco: 45.90, disponivel: true },
          { nome: 'gigante', preco: 55.90, disponivel: true }
        ],
        bordas_disponiveis: [
          { nome: 'catupiry', preco: 5.00, disponivel: true },
          { nome: 'cheddar', preco: 6.00, disponivel: true }
        ],
        adicionais_disponiveis: [
          { nome: 'azeitona', preco: 2.00, disponivel: true },
          { nome: 'oregano', preco: 1.00, disponivel: true }
        ],
        tempo_preparo_estimado: 25,
        vegetariana: true
      },
      {
        nome: 'Pizza Calabresa',
        categoria: 'pizza',
        descricao: 'Molho de tomate, mussarela, calabresa e cebola',
        ingredientes: ['molho de tomate', 'mussarela', 'calabresa', 'cebola'],
        tamanhos: [
          { nome: 'pequena', preco: 28.90, disponivel: true },
          { nome: 'media', preco: 38.90, disponivel: true },
          { nome: 'grande', preco: 48.90, disponivel: true },
          { nome: 'gigante', preco: 58.90, disponivel: true }
        ],
        bordas_disponiveis: [
          { nome: 'catupiry', preco: 5.00, disponivel: true },
          { nome: 'cheddar', preco: 6.00, disponivel: true }
        ],
        adicionais_disponiveis: [
          { nome: 'azeitona', preco: 2.00, disponivel: true },
          { nome: 'oregano', preco: 1.00, disponivel: true }
        ],
        tempo_preparo_estimado: 30
      },
      {
        nome: 'Pizza Portuguesa',
        categoria: 'pizza',
        descricao: 'Molho de tomate, mussarela, presunto, ovos, cebola e azeitona',
        ingredientes: ['molho de tomate', 'mussarela', 'presunto', 'ovos', 'cebola', 'azeitona'],
        tamanhos: [
          { nome: 'pequena', preco: 32.90, disponivel: true },
          { nome: 'media', preco: 42.90, disponivel: true },
          { nome: 'grande', preco: 52.90, disponivel: true },
          { nome: 'gigante', preco: 62.90, disponivel: true }
        ],
        bordas_disponiveis: [
          { nome: 'catupiry', preco: 5.00, disponivel: true },
          { nome: 'cheddar', preco: 6.00, disponivel: true }
        ],
        adicionais_disponiveis: [
          { nome: 'azeitona', preco: 2.00, disponivel: true },
          { nome: 'oregano', preco: 1.00, disponivel: true }
        ],
        tempo_preparo_estimado: 35
      },
      {
        nome: 'Pizza Quatro Queijos',
        categoria: 'pizza',
        descricao: 'Molho de tomate, mussarela, catupiry, parmesão e gorgonzola',
        ingredientes: ['molho de tomate', 'mussarela', 'catupiry', 'parmesão', 'gorgonzola'],
        tamanhos: [
          { nome: 'pequena', preco: 35.90, disponivel: true },
          { nome: 'media', preco: 45.90, disponivel: true },
          { nome: 'grande', preco: 55.90, disponivel: true },
          { nome: 'gigante', preco: 65.90, disponivel: true }
        ],
        bordas_disponiveis: [
          { nome: 'catupiry', preco: 5.00, disponivel: true },
          { nome: 'cheddar', preco: 6.00, disponivel: true }
        ],
        adicionais_disponiveis: [
          { nome: 'azeitona', preco: 2.00, disponivel: true },
          { nome: 'oregano', preco: 1.00, disponivel: true }
        ],
        tempo_preparo_estimado: 30,
        vegetariana: true
      },
      {
        nome: 'Pizza Frango com Catupiry',
        categoria: 'pizza',
        descricao: 'Molho de tomate, mussarela, frango desfiado e catupiry',
        ingredientes: ['molho de tomate', 'mussarela', 'frango desfiado', 'catupiry'],
        tamanhos: [
          { nome: 'pequena', preco: 30.90, disponivel: true },
          { nome: 'media', preco: 40.90, disponivel: true },
          { nome: 'grande', preco: 50.90, disponivel: true },
          { nome: 'gigante', preco: 60.90, disponivel: true }
        ],
        bordas_disponiveis: [
          { nome: 'catupiry', preco: 5.00, disponivel: true },
          { nome: 'cheddar', preco: 6.00, disponivel: true }
        ],
        adicionais_disponiveis: [
          { nome: 'azeitona', preco: 2.00, disponivel: true },
          { nome: 'oregano', preco: 1.00, disponivel: true }
        ],
        tempo_preparo_estimado: 32
      }
    ];

    const produtosCriados = await Produto.insertMany(produtos);
    console.log('Produtos criados com sucesso!');

    // Criar alguns pedidos de exemplo
    console.log('Criando pedidos de exemplo...');
    const agora = new Date();
    const pedidos = [
      {
        numero: '001',
        cliente: {
          nome: 'João Silva',
          telefone: '(11) 99999-1111',
          endereco: {
            rua: 'Rua das Flores',
            numero: '123',
            bairro: 'Centro',
            cidade: 'São Paulo',
            cep: '01234-567'
          }
        },
        tipo: 'entrega',
        canal: 'telefone',
        itens: [
          {
            produto: produtosCriados[0]._id,
            quantidade: 1,
            tamanho: 'grande',
            sabores: ['Margherita'],
            preco: 45.90
          }
        ],
        status: 'aguardando_preparo',
        pagamento: {
          forma: 'dinheiro',
          valor_total: 45.90
        },
        tempos: {
          pedido_criado: new Date(agora.getTime() - 10 * 60000) // 10 minutos atrás
        }
      },
      {
        numero: '002',
        cliente: {
          nome: 'Maria Santos',
          telefone: '(11) 99999-2222'
        },
        tipo: 'retirada',
        canal: 'balcao',
        itens: [
          {
            produto: produtosCriados[1]._id,
            quantidade: 2,
            tamanho: 'media',
            sabores: ['Calabresa'],
            preco: 77.80
          }
        ],
        status: 'em_preparo',
        pagamento: {
          forma: 'cartao_credito',
          valor_total: 77.80
        },
        tempos: {
          pedido_criado: new Date(agora.getTime() - 25 * 60000), // 25 minutos atrás
          preparo_iniciado: new Date(agora.getTime() - 15 * 60000) // 15 minutos atrás
        }
      },
      {
        numero: '003',
        cliente: {
          nome: 'Pedro Oliveira',
          telefone: '(11) 99999-3333',
          endereco: {
            rua: 'Av. Paulista',
            numero: '1000',
            bairro: 'Bela Vista',
            cidade: 'São Paulo',
            cep: '01310-100'
          }
        },
        tipo: 'entrega',
        canal: 'ifood',
        itens: [
          {
            produto: produtosCriados[2]._id,
            quantidade: 1,
            tamanho: 'gigante',
            sabores: ['Portuguesa'],
            preco: 62.90
          }
        ],
        status: 'pronto',
        pagamento: {
          forma: 'pix',
          valor_total: 62.90
        },
        tempos: {
          pedido_criado: new Date(agora.getTime() - 45 * 60000), // 45 minutos atrás
          preparo_iniciado: new Date(agora.getTime() - 35 * 60000), // 35 minutos atrás
          preparo_concluido: new Date(agora.getTime() - 5 * 60000) // 5 minutos atrás
        }
      }
    ];

    await Pedido.insertMany(pedidos);
    console.log('Pedidos criados com sucesso!');

    console.log('\n=== DADOS DE ACESSO ===');
    console.log('Admin: admin@pizzaria.com / 123456');
    console.log('Gerente: gerente@pizzaria.com / 123456');
    console.log('Atendente: atendente@pizzaria.com / 123456');
    console.log('Pizzaiolo: pizzaiolo@pizzaria.com / 123456');
    console.log('Entregador: entregador@pizzaria.com / 123456');
    console.log('========================\n');

    console.log('Banco de dados populado com sucesso!');
    process.exit(0);

  } catch (error) {
    console.error('Erro ao popular banco de dados:', error);
    process.exit(1);
  }
}

seedDatabase();

