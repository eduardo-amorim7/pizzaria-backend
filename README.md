# Backend - Sistema de Gestão de Pizzaria

Este diretório contém o backend da aplicação de gestão de pizzaria, desenvolvido com Node.js, Express e MongoDB.

## Pré-requisitos

Certifique-se de ter os seguintes softwares instalados em sua máquina:

-   **Node.js** (versão 14 ou superior)
-   **npm** (gerenciador de pacotes do Node.js)
-   **MongoDB** (servidor de banco de dados)

## Configuração do Banco de Dados (MongoDB)

1.  **Instale o MongoDB:** Siga as instruções oficiais para instalar o MongoDB em seu sistema operacional:
    -   [MongoDB Community Edition Installation](https://docs.mongodb.com/manual/installation/)

2.  **Inicie o serviço MongoDB:**
    ```bash
    sudo systemctl start mongod
    sudo systemctl enable mongod
    ```

3.  **Verifique o status do MongoDB:**
    ```bash
    sudo systemctl status mongod
    ```
    Deve aparecer `active (running)`.

## Instalação e Execução

Siga os passos abaixo para configurar e rodar o backend:

1.  **Navegue até o diretório do backend:**
    ```bash
    cd pizzaria-management-system/backend
    ```

2.  **Instale as dependências:**
    ```bash
    npm install
    ```

3.  **Popule o banco de dados com dados de exemplo (opcional, mas recomendado para testes iniciais):**
    ```bash
    node scripts/seed.js
    ```
    Este script irá criar usuários de exemplo e alguns pedidos.

4.  **Inicie o servidor backend:**
    ```bash
    npm start
    ```
    O servidor estará rodando na porta `3000` (http://localhost:3000).

## Endpoints da API

A API estará disponível em `http://localhost:3000/api`. Alguns endpoints principais incluem:

-   `/api/auth`: Autenticação de usuários
-   `/api/pedidos`: Gestão de pedidos
-   `/api/produtos`: Gestão de produtos
-   `/api/relatorios`: Relatórios e métricas

## Dados de Acesso (após executar o `seed.js`)

-   **Admin**: `admin@pizzaria.com` / `123456`
-   **Gerente**: `gerente@pizzaria.com` / `123456`
-   **Atendente**: `atendente@pizzaria.com` / `123456`
-   **Pizzaiolo**: `pizzaiolo@pizzaria.com` / `123456`
-   **Entregador**: `entregador@pizzaria.com` / `123456`

## Estrutura do Projeto

```
backend/
├── config/             # Configurações (ex: banco de dados)
├── models/             # Modelos de dados (Mongoose)
├── middleware/         # Middlewares (ex: autenticação)
├── routes/             # Definição das rotas da API
├── scripts/            # Scripts utilitários (ex: seed de dados)
├── app.js              # Arquivo principal da aplicação
├── package.json        # Dependências e scripts do projeto
└── README.md           # Este arquivo
```



## Dependências Principais

-   **Express**: Framework web para Node.js
-   **Mongoose**: ODM para MongoDB
-   **Socket.IO**: Comunicação em tempo real
-   **JWT**: Autenticação via tokens
-   **bcrypt**: Hash de senhas
-   **CORS**: Suporte a requisições cross-origin

## Scripts Disponíveis

-   `npm start`: Inicia o servidor em modo produção
-   `npm run dev`: Inicia o servidor em modo desenvolvimento (com nodemon)
-   `node scripts/seed.js`: Popula o banco com dados de exemplo

## Configuração de Ambiente

O backend está configurado para usar as seguintes variáveis de ambiente (com valores padrão):

-   `PORT`: Porta do servidor (padrão: 3000)
-   `MONGODB_URI`: URI de conexão com MongoDB (padrão: mongodb://localhost:27017/pizzaria)
-   `JWT_SECRET`: Chave secreta para JWT (padrão: pizzaria_secret_key)

## Resolução de Problemas

### MongoDB não conecta
-   Verifique se o serviço MongoDB está rodando: `sudo systemctl status mongod`
-   Verifique se a porta 27017 está disponível: `netstat -an | grep 27017`

### Erro de permissão
-   Certifique-se de que o usuário tem permissão para acessar o MongoDB
-   No Ubuntu/Debian: `sudo usermod -a -G mongodb $USER`

### Porta 3000 já em uso
-   Pare outros serviços na porta 3000: `sudo lsof -ti:3000 | xargs kill -9`
-   Ou altere a porta no arquivo de configuração

## Logs e Debugging

O servidor exibe logs detalhados no console, incluindo:
-   Status de conexão com MongoDB
-   Rotas carregadas
-   Requisições recebidas
-   Erros de validação

Para debugging mais detalhado, defina a variável de ambiente:
```bash
DEBUG=* npm start
```

