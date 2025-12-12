# 🎵 MusicCollab - Plataforma de Edição Musical Colaborativa

Uma plataforma SaaS que permite produção musical colaborativa em tempo real, com recursos de compartilhamento de projetos, exportação de faixas e controle de permissões de acesso.

## 🚀 Tecnologias

- **Backend**: Node.js + TypeScript + Express + Socket.IO
- **Frontend**: React.js + TypeScript
- **Banco de Dados**: PostgreSQL + Prisma ORM
- **Comunicação em Tempo Real**: Socket.IO
- **Autenticação**: JWT

## 📁 Estrutura do Projeto

```
TCC/
├── server/                 # Backend Node.js + TypeScript
│   ├── src/
│   │   ├── config/         # Configurações
│   │   ├── controllers/    # Controladores de rota
│   │   ├── middleware/    # Middlewares
│   │   ├── models/        # Modelos de dados
│   │   ├── routes/        # Definição de rotas
│   │   ├── services/      # Lógica de negócio
│   │   ├── socket/        # Handlers Socket.IO
│   │   ├── types/         # Definições TypeScript
│   │   ├── utils/         # Utilitários
│   │   └── index.ts       # Arquivo principal
│   ├── prisma/            # Schema e migrações do banco
│   ├── uploads/           # Arquivos de áudio
│   ├── logs/              # Logs da aplicação
│   └── package.json
├── client/                # Frontend React.js
│   ├── src/
│   │   ├── components/    # Componentes reutilizáveis
│   │   ├── pages/         # Páginas/rotas
│   │   ├── services/      # Serviços e APIs
│   │   ├── hooks/         # Custom hooks React
│   │   ├── utils/         # Funções utilitárias
│   │   ├── types/         # Definições TypeScript
│   │   └── styles/        # Arquivos de estilo
│   └── package.json
├── shared/                # Código compartilhado
├── tests/                 # Testes
├── docs/                  # Documentação
└── README.md              # Este arquivo
```

## 🛠️ Pré-requisitos

- **Node.js** >= 18.0.0
- **npm** >= 8.0.0
- **PostgreSQL** >= 13.0
- **Git**

## 📦 Instalação

### 1. Clone o repositório
```bash
git clone <url-do-repositorio>
cd TCC
```

### 2. Instale as dependências do servidor
```bash
cd server
npm install
```

### 3. Instale as dependências do cliente
```bash
cd ../client
npm install
```

### 4. Configure as variáveis de ambiente

Copie o arquivo de exemplo e configure suas variáveis:
```bash
cd ../server
copy config.example.env .env
```

Edite o arquivo `.env` com suas configurações:
```env
# Environment
NODE_ENV=development
PORT=3001

# Database
DATABASE_URL="postgresql://username:password@localhost:5432/musiccollab?schema=public"

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# Socket.IO
SOCKET_CORS_ORIGIN=http://localhost:3000

# File Upload
UPLOAD_PATH=./uploads
MAX_FILE_SIZE=50000000
ALLOWED_AUDIO_TYPES=mp3,wav,flac,aac,m4a
```

### 5. Configure o banco de dados PostgreSQL

1. Instale o PostgreSQL
2. Crie um banco de dados:
```sql
CREATE DATABASE musiccollab;
```

3. Execute as migrações do Prisma:
```bash
cd server
npm run db:migrate
```

4. (Opcional) Execute os seeds:
```bash
npm run db:seed
```

## 🚀 Como Executar

### Desenvolvimento

#### Opção 1: Executar separadamente

**Terminal 1 - Servidor (Backend):**
```bash
cd server
npm run dev
```
O servidor estará rodando em: http://localhost:3001

**Terminal 2 - Cliente (Frontend):**
```bash
cd client
npm start
```
O frontend estará rodando em: http://localhost:3000

#### Opção 2: Executar com scripts do projeto raiz

Se você tiver um `package.json` na raiz com scripts configurados:
```bash
# Instalar dependências de ambos
npm install

# Executar ambos simultaneamente
npm run dev
```

### Produção

#### Build do projeto
```bash
# Build do servidor
cd server
npm run build

# Build do cliente
cd ../client
npm run build
```

#### Executar em produção
```bash
cd server
npm start
```

## 🔗 Endpoints da API

### Rotas Principais
- `GET /` - Informações da API
- `GET /health` - Health check

### Autenticação
- `GET /api/auth/test` - Teste das rotas de auth
- `POST /api/auth/login` - Login (em desenvolvimento)
- `POST /api/auth/register` - Registro (em desenvolvimento)
- `GET /api/auth/profile` - Perfil do usuário (em desenvolvimento)

### Projetos
- `GET /api/projects/test` - Teste das rotas de projetos
- `GET /api/projects` - Listar projetos (em desenvolvimento)
- `POST /api/projects` - Criar projeto (em desenvolvimento)
- `GET /api/projects/:id` - Obter projeto (em desenvolvimento)
- `PUT /api/projects/:id` - Atualizar projeto (em desenvolvimento)
- `DELETE /api/projects/:id` - Deletar projeto (em desenvolvimento)

### Áudio
- `GET /api/audio/test` - Teste das rotas de áudio
- `POST /api/audio/upload` - Upload de arquivo (em desenvolvimento)
- `GET /api/audio/tracks` - Listar faixas (em desenvolvimento)
- `GET /api/audio/tracks/:id` - Obter faixa (em desenvolvimento)
- `DELETE /api/audio/tracks/:id` - Deletar faixa (em desenvolvimento)

## 🔌 Socket.IO Events

### Eventos do Cliente para Servidor
- `joinProject` - Entrar em um projeto
- `leaveProject` - Sair de um projeto
- `audioControl` - Controle de áudio (play/pause/seek)
- `trackEdit` - Editar uma faixa

### Eventos do Servidor para Cliente
- `welcome` - Mensagem de boas-vindas
- `userJoined` - Usuário entrou no projeto
- `userLeft` - Usuário saiu do projeto
- `audioUpdate` - Atualização de áudio
- `trackUpdated` - Faixa foi atualizada

## 🧪 Testes

O projeto possui uma suíte completa de testes unitários para backend e frontend. Consulte [TESTES.md](./TESTES.md) para documentação detalhada.

### Scripts Rápidos

**Windows:**
```bash
# Executar todos os testes
run-tests.bat all

# Apenas backend
run-tests.bat backend

# Apenas frontend
run-tests.bat frontend

# Com cobertura de código
run-tests.bat coverage
```

**Linux/Mac:**
```bash
# Executar todos os testes
./run-tests.sh all

# Apenas backend
./run-tests.sh backend

# Apenas frontend
./run-tests.sh frontend

# Com cobertura de código
./run-tests.sh coverage
```

### Comandos Diretos

**Backend:**
```bash
cd server
npm test                    # Executar testes
npm run test:watch          # Modo watch
npm run test:coverage       # Com cobertura
```

**Frontend:**
```bash
cd client
npm test                    # Executar testes (modo interativo)
npm test -- --watchAll=false # Executar uma vez
npm test -- --coverage      # Com cobertura
```

### Cobertura de Testes

Os testes cobrem:
- ✅ **Backend Controllers**: authController, projectController, trackController
- ✅ **Frontend Services**: authService
- ✅ **React Components**: LoginForm, Toast, AudioPlayer
- ✅ **Validações**: inputs, permissões, autenticação

Relatórios de cobertura:
- Backend: `server/coverage/index.html`
- Frontend: `client/coverage/lcov-report/index.html`

## 📊 Scripts Disponíveis

### Servidor (server/)
```bash
npm run dev          # Desenvolvimento com nodemon
npm run build        # Build para produção
npm run start        # Executar em produção
npm test             # Executar testes
npm run test:watch   # Testes em modo watch
npm run lint         # Linting
npm run db:migrate   # Executar migrações
npm run db:seed      # Executar seeds
npm run db:studio    # Abrir Prisma Studio
```

### Cliente (client/)
```bash
npm start            # Desenvolvimento
npm run build        # Build para produção
npm test             # Executar testes
npm run eject        # Ejetar configuração (não recomendado)
```

## 🐛 Troubleshooting

### Problemas Comuns

1. **Erro de conexão com banco de dados**
   - Verifique se o PostgreSQL está rodando
   - Confirme as credenciais no arquivo `.env`
   - Execute `npm run db:migrate` para criar as tabelas

2. **Erro de CORS**
   - Verifique se `SOCKET_CORS_ORIGIN` está configurado corretamente
   - Confirme se o frontend está rodando na porta 3000

3. **Erro de dependências**
   - Execute `npm install` em ambos os diretórios
   - Limpe o cache: `npm cache clean --force`

4. **Porta já em uso**
   - Mude a porta no arquivo `.env`
   - Ou mate o processo que está usando a porta

### Logs

Os logs são salvos em:
- `server/logs/error.log` - Erros
- `server/logs/combined.log` - Todos os logs

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📝 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 👨‍💻 Desenvolvedor

**Erick dos Santos Martin**
- TCC: Tecnologia em Análise e Desenvolvimento de Sistemas

## 📚 Recursos Úteis

- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Documentation](https://reactjs.org/docs/)
- [Prisma Documentation](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)

---

**Status do Projeto**: 🚧 Em Desenvolvimento

Para dúvidas ou suporte, abra uma issue no repositório.
