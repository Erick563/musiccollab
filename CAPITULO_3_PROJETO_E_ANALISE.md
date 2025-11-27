# CAPÍTULO 3 - PROJETO E ANÁLISE

## 3.1 Arquitetura do Sistema

### 3.1.1 Visão Geral da Arquitetura

O MusicCollab foi desenvolvido seguindo uma arquitetura cliente-servidor moderna, utilizando tecnologias web contemporâneas para garantir escalabilidade, manutenibilidade e performance. A arquitetura é composta por três camadas principais: frontend (cliente), backend (servidor) e banco de dados, com comunicação em tempo real através de WebSockets.

A arquitetura adota o padrão de separação de responsabilidades, onde o frontend é responsável pela apresentação e interação com o usuário, o backend gerencia a lógica de negócio e a persistência de dados, e o banco de dados armazena as informações de forma estruturada e relacional.

### 3.1.2 Arquitetura em Camadas

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CAMADA DE APRESENTAÇÃO                        │
│                         (Frontend - React.js)                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Páginas (Pages)                           │  │
│  │  • HomePage - Página inicial                                 │  │
│  │  • AuthPage - Autenticação (login/registro)                  │  │
│  │  • DashboardPage - Lista de projetos                         │  │
│  │  • StudioPage - Editor de áudio principal                    │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                 Componentes (Components)                       │  │
│  │  • AudioPlayer - Controle de reprodução                       │  │
│  │  • WaveformDisplay - Visualização de forma de onda           │  │
│  │  • TimelineTrack - Faixa na timeline                         │  │
│  │  • TrackList - Lista de faixas                               │  │
│  │  • OnlineUsers - Usuários online                             │  │
│  │  • UserCursors - Cursores dos colaboradores                  │  │
│  │  • CollaboratorsPanel - Painel de colaboradores              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Contextos (Contexts)                              │  │
│  │  • AuthContext - Estado de autenticação                       │  │
│  │  • CollaborationContext - Estado de colaboração              │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Serviços (Services)                              │  │
│  │  • authService - Autenticação REST                            │  │
│  │  • projectService - Gerenciamento de projetos                │  │
│  │  • trackService - Gerenciamento de faixas                     │  │
│  │  • collaborationService - WebSocket e colaboração             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │ HTTP/REST     │ WebSocket     │
                    │ (JSON)        │ (Socket.IO)   │
                    ↓               ↓               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      CAMADA DE APLICAÇÃO                             │
│                    (Backend - Node.js/Express)                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                      Rotas (Routes)                           │  │
│  │  • /api/auth - Autenticação                                  │  │
│  │  • /api/projects - Projetos                                  │  │
│  │  • /api/tracks - Faixas de áudio                             │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Controladores (Controllers)                  │  │
│  │  • authController - Lógica de autenticação                   │  │
│  │  • projectController - Lógica de projetos                    │  │
│  │  • trackController - Lógica de faixas                        │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                  Middlewares                                  │  │
│  │  • auth - Autenticação JWT                                   │  │
│  │  • errorHandler - Tratamento de erros                        │  │
│  │  • notFound - Rotas não encontradas                         │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              Handlers WebSocket                               │  │
│  │  • collaborationHandler - Colaboração em tempo real          │  │
│  │    - join-project, cursor-move, track-lock, etc.            │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    Modelos (Models)                           │  │
│  │  • User - Modelo de usuário                                  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                                    ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CAMADA DE DADOS                                   │
│                  (PostgreSQL + Prisma ORM)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐               │
│  │    users    │  │  projects    │  │   tracks     │               │
│  └─────────────┘  └──────────────┘  └──────────────┘               │
│                                                                       │
│  ┌──────────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │project_collabora-│  │  messages    │  │notifications │         │
│  │     tors         │  │              │  │              │         │
│  └──────────────────┘  └──────────────┘  └──────────────┘         │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

### 3.1.3 Fluxo de Comunicação

O sistema utiliza dois protocolos principais de comunicação:

1. **HTTP/REST**: Utilizado para operações CRUD tradicionais, autenticação e gerenciamento de recursos. As requisições seguem o padrão RESTful, utilizando verbos HTTP apropriados (GET, POST, PUT, DELETE) e códigos de status padronizados.

2. **WebSocket (Socket.IO)**: Utilizado para comunicação em tempo real entre clientes e servidor, permitindo sincronização bidirecional de eventos como movimentação de cursores, bloqueio de tracks e notificações de usuários online.

### 3.1.4 Gerenciamento de Estado

O estado da aplicação é gerenciado em múltiplos níveis:

- **Estado Global (Context API)**: Utilizado para dados compartilhados entre componentes, como informações do usuário autenticado e estado de colaboração.

- **Estado Local (useState)**: Utilizado para dados específicos de cada componente, como estado de reprodução de áudio e configurações de UI.

- **Estado do Servidor**: O estado completo do projeto (tracks, configurações, etc.) é armazenado no banco de dados PostgreSQL em formato JSON, permitindo persistência e recuperação.

- **Estado em Tempo Real (WebSocket)**: Informações sobre usuários online, cursores e bloqueios são mantidas em memória no servidor e sincronizadas via WebSocket.

## 3.2 Casos de Uso

### 3.2.1 Diagrama de Casos de Uso Geral

```
                    ┌─────────────────────────────────────┐
                    │         MusicCollab System          │
                    └─────────────────────────────────────┘
                                    │
        ┌──────────────────────────┼──────────────────────────┐
        │                          │                          │
        │                          │                          │
┌───────▼────────┐      ┌──────────▼──────────┐    ┌─────────▼────────┐
│   Autenticar   │      │  Gerenciar Projeto  │    │  Editar Áudio    │
│    Usuário     │      │                     │    │                  │
└────────────────┘      └────────────────────┘    └──────────────────┘
        │                          │                          │
        │                          │                          │
┌───────▼────────┐      ┌──────────▼──────────┐    ┌─────────▼────────┐
│   Registrar    │      │  Adicionar          │    │  Colaborar em    │
│    Usuário     │      │  Colaborador        │    │  Tempo Real      │
└────────────────┘      └────────────────────┘    └──────────────────┘
        │                          │                          │
        │                          │                          │
┌───────▼────────┐      ┌──────────▼──────────┐    ┌─────────▼────────┐
│   Gerenciar   │      │  Upload de          │    │  Exportar        │
│    Perfil     │      │  Faixa de Áudio     │    │  Projeto         │
└────────────────┘      └────────────────────┘    └──────────────────┘
```

### 3.2.2 Casos de Uso Detalhados

#### CU01 - Autenticar Usuário

**Ator Principal**: Usuário

**Pré-condições**: Usuário possui conta cadastrada no sistema

**Fluxo Principal**:
1. Usuário acessa a página de login
2. Sistema exibe formulário de login
3. Usuário informa email e senha
4. Sistema valida credenciais
5. Sistema gera token JWT
6. Sistema redireciona para dashboard
7. Sistema armazena token no localStorage

**Fluxos Alternativos**:
- 4a. Credenciais inválidas: Sistema exibe mensagem de erro
- 4b. Usuário não encontrado: Sistema exibe mensagem de erro

**Pós-condições**: Usuário autenticado e com acesso ao sistema

#### CU02 - Registrar Usuário

**Ator Principal**: Usuário

**Pré-condições**: Usuário não possui conta no sistema

**Fluxo Principal**:
1. Usuário acessa página de registro
2. Sistema exibe formulário de registro
3. Usuário informa nome, email, username e senha
4. Sistema valida dados (formato de email, senha mínima, etc.)
5. Sistema verifica se email/username já existe
6. Sistema cria novo usuário no banco de dados
7. Sistema criptografa senha com bcrypt
8. Sistema gera token JWT
9. Sistema redireciona para dashboard

**Fluxos Alternativos**:
- 5a. Email já existe: Sistema exibe mensagem de erro
- 5b. Username já existe: Sistema exibe mensagem de erro
- 4a. Dados inválidos: Sistema exibe mensagens de validação

**Pós-condições**: Novo usuário cadastrado e autenticado

#### CU03 - Criar Projeto

**Ator Principal**: Usuário Autenticado

**Pré-condições**: Usuário está autenticado

**Fluxo Principal**:
1. Usuário acessa dashboard
2. Usuário clica em "Novo Projeto"
3. Sistema exibe formulário de criação
4. Usuário informa título, descrição e gênero (opcional)
5. Sistema cria projeto no banco de dados
6. Sistema adiciona criador como colaborador OWNER
7. Sistema redireciona para o editor do projeto

**Fluxos Alternativos**:
- 4a. Título vazio: Sistema exibe mensagem de erro
- 4b. Usuário cancela: Sistema retorna ao dashboard

**Pós-condições**: Novo projeto criado e usuário é o proprietário

#### CU04 - Adicionar Colaborador

**Ator Principal**: Proprietário/Admin do Projeto

**Pré-condições**: 
- Usuário está autenticado
- Usuário é proprietário ou admin do projeto
- Projeto existe

**Fluxo Principal**:
1. Usuário acessa o editor do projeto
2. Usuário abre painel de colaboradores
3. Usuário informa email do colaborador
4. Usuário seleciona nível de permissão (ADMIN, COLLABORATOR, VIEWER)
5. Sistema busca usuário pelo email
6. Sistema verifica se usuário já é colaborador
7. Sistema adiciona colaborador ao projeto
8. Sistema notifica colaborador (se implementado)
9. Sistema atualiza lista de colaboradores

**Fluxos Alternativos**:
- 5a. Usuário não encontrado: Sistema exibe mensagem de erro
- 6a. Usuário já é colaborador: Sistema exibe mensagem informativa
- 5b. Email é do proprietário: Sistema exibe mensagem informativa

**Pós-condições**: Novo colaborador adicionado ao projeto

#### CU05 - Upload de Faixa de Áudio

**Ator Principal**: Usuário Autenticado com permissão de edição

**Pré-condições**:
- Usuário está autenticado
- Usuário tem acesso ao projeto
- Usuário tem permissão para adicionar tracks

**Fluxo Principal**:
1. Usuário acessa o editor do projeto
2. Usuário clica em "Adicionar Faixa" ou arrasta arquivo
3. Sistema exibe seletor de arquivo
4. Usuário seleciona arquivo de áudio (MP3, WAV, FLAC, etc.)
5. Sistema valida formato e tamanho do arquivo
6. Sistema exibe barra de progresso
7. Sistema envia arquivo para servidor
8. Servidor processa arquivo e extrai metadados
9. Servidor armazena arquivo no banco de dados (BYTEA)
10. Sistema cria registro de Track no banco
11. Sistema atualiza lista de tracks no editor
12. Sistema gera visualização de waveform

**Fluxos Alternativos**:
- 5a. Formato inválido: Sistema exibe mensagem de erro
- 5b. Arquivo muito grande: Sistema exibe mensagem de erro
- 7a. Erro no upload: Sistema exibe mensagem de erro e permite retry

**Pós-condições**: Nova faixa de áudio adicionada ao projeto

#### CU06 - Editar Faixa de Áudio

**Ator Principal**: Usuário Autenticado com permissão de edição

**Pré-condições**:
- Usuário está autenticado
- Usuário tem acesso ao projeto
- Faixa existe no projeto
- Faixa não está bloqueada por outro usuário

**Fluxo Principal**:
1. Usuário acessa o editor do projeto
2. Usuário clica em uma faixa para editar
3. Sistema solicita bloqueio da faixa via WebSocket
4. Sistema verifica se faixa está disponível
5. Sistema concede bloqueio ao usuário
6. Sistema notifica outros colaboradores sobre o bloqueio
7. Usuário realiza edições (volume, pan, posição, etc.)
8. Sistema atualiza estado localmente
9. Sistema salva alterações no estado do projeto (JSON)
10. Sistema libera bloqueio automaticamente após 3 segundos de inatividade

**Fluxos Alternativos**:
- 4a. Faixa bloqueada: Sistema exibe mensagem informando quem está editando
- 4b. Usuário não tem permissão: Sistema exibe mensagem de erro
- 9a. Erro ao salvar: Sistema exibe mensagem de erro

**Pós-condições**: Alterações na faixa salvas no projeto

#### CU07 - Colaborar em Tempo Real

**Ator Principal**: Colaborador

**Pré-condições**:
- Múltiplos usuários autenticados
- Usuários têm acesso ao mesmo projeto
- Conexão WebSocket estabelecida

**Fluxo Principal**:
1. Usuário A abre o projeto no editor
2. Sistema conecta via WebSocket
3. Sistema verifica permissões de acesso
4. Sistema adiciona usuário à sala do projeto
5. Sistema notifica outros colaboradores sobre novo usuário online
6. Usuário A move cursor na timeline
7. Sistema envia evento cursor-move via WebSocket
8. Sistema atualiza posição do cursor do Usuário A
9. Sistema transmite evento para outros colaboradores
10. Outros colaboradores visualizam cursor do Usuário A em tempo real

**Fluxos Alternativos**:
- 3a. Sem permissão: Sistema nega acesso e desconecta
- 6a. Usuário desconecta: Sistema remove da sala e notifica outros

**Pós-condições**: Colaboradores visualizam ações uns dos outros em tempo real

#### CU08 - Visualizar Usuários Online

**Ator Principal**: Colaborador

**Pré-condições**:
- Usuário está autenticado
- Usuário está no editor de um projeto
- Conexão WebSocket estabelecida

**Fluxo Principal**:
1. Usuário acessa o editor do projeto
2. Sistema conecta via WebSocket
3. Sistema recebe lista de usuários online
4. Sistema exibe lista na interface
5. Sistema atualiza lista quando usuário entra/sai
6. Sistema exibe indicadores visuais (cores, avatares)
7. Sistema mostra status de edição de cada usuário

**Pós-condições**: Usuário visualiza quem está online no projeto

#### CU09 - Exportar Projeto

**Ator Principal**: Usuário Autenticado com permissão de exportação

**Pré-condições**:
- Usuário está autenticado
- Projeto existe e possui pelo menos uma faixa
- Usuário tem permissão para exportar

**Fluxo Principal**:
1. Usuário acessa o editor do projeto
2. Usuário clica em "Exportar"
3. Sistema exibe modal de exportação
4. Usuário seleciona formato (MP3, WAV, etc.)
5. Usuário configura opções de exportação
6. Sistema processa projeto e mixa faixas
7. Sistema gera arquivo de áudio
8. Sistema disponibiliza download
9. Usuário baixa arquivo

**Fluxos Alternativos**:
- 6a. Erro no processamento: Sistema exibe mensagem de erro
- 4a. Usuário cancela: Sistema fecha modal

**Pós-condições**: Arquivo de áudio exportado e baixado

## 3.3 Diagrama de Classes

### 3.3.1 Classes do Backend

```
┌─────────────────────────────────────────────────────────────────┐
│                         User (Model)                             │
├─────────────────────────────────────────────────────────────────┤
│ - id: string                                                     │
│ - email: string                                                   │
│ - username: string                                                │
│ - password: string (hashed)                                       │
│ - name: string                                                    │
│ - bio: string?                                                    │
│ - avatar: string?                                                 │
│ - isActive: boolean                                               │
│ - createdAt: DateTime                                             │
│ - updatedAt: DateTime                                             │
├─────────────────────────────────────────────────────────────────┤
│ + create(data): Promise<User>                                    │
│ + findByEmail(email): Promise<User | null>                      │
│ + findById(id): Promise<User | null>                             │
│ + validatePassword(user, password): Promise<boolean>           │
│ + updateProfile(id, data): Promise<User>                         │
│ + toPublic(user): PublicUser                                     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AuthController                                │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ + register(req, res): Promise<void>                            │
│ + login(req, res): Promise<void>                                │
│ + getProfile(req, res): Promise<void>                            │
│ + updateProfile(req, res): Promise<void>                        │
│ + changePassword(req, res): Promise<void>                       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      ProjectController                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ + getProjects(req, res): Promise<void>                          │
│ + getProject(req, res): Promise<void>                            │
│ + createProject(req, res): Promise<void>                         │
│ + updateProject(req, res): Promise<void>                         │
│ + deleteProject(req, res): Promise<void>                        │
│ + getCollaborators(req, res): Promise<void>                      │
│ + addCollaborator(req, res): Promise<void>                       │
│ + updateCollaborator(req, res): Promise<void>                   │
│ + removeCollaborator(req, res): Promise<void>                   │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      TrackController                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│ + uploadTrack(req, res): Promise<void>                           │
│ + getTracks(req, res): Promise<void>                             │
│ + getTrack(req, res): Promise<void>                              │
│ + deleteTrack(req, res): Promise<void>                           │
│ + streamTrack(req, res): Promise<void>                           │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 CollaborationHandler                             │
├─────────────────────────────────────────────────────────────────┤
│ - projectRooms: Map<string, ProjectRoom>                        │
│ - trackLocks: Map<string, LockInfo>                             │
├─────────────────────────────────────────────────────────────────┤
│ + setupCollaborationHandlers(io): void                          │
│ - authenticateSocket(socket, next): Promise<void>               │
│ - handleJoinProject(socket, projectId): Promise<void>           │
│ - handleCursorMove(socket, data): void                          │
│ - handleRequestTrackLock(socket, data): void                     │
│ - handleReleaseTrackLock(socket, data): void                    │
│ - releaseLock(socket, projectId, trackId): void                 │
│ - handleLeaveProject(socket, projectId): void                   │
│ - handleDisconnect(socket): void                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      ProjectRoom                                 │
├─────────────────────────────────────────────────────────────────┤
│ - projectId: string                                              │
│ - users: Map<string, UserInfo>                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      LockInfo                                    │
├─────────────────────────────────────────────────────────────────┤
│ - userId: string                                                 │
│ - userName: string                                               │
│ - socketId: string                                               │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3.2 Classes do Frontend

```
┌─────────────────────────────────────────────────────────────────┐
│                      AuthContext                                 │
├─────────────────────────────────────────────────────────────────┤
│ - user: User | null                                              │
│ - token: string | null                                           │
│ - loading: boolean                                               │
├─────────────────────────────────────────────────────────────────┤
│ + login(email, password): Promise<void>                         │
│ + register(data): Promise<void>                                  │
│ + logout(): void                                                 │
│ + updateUser(data): Promise<void>                                │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                 CollaborationContext                             │
├─────────────────────────────────────────────────────────────────┤
│ - socket: Socket | null                                          │
│ - isConnected: boolean                                           │
│ - onlineUsers: OnlineUser[]                                      │
│ - lockedTracks: LockedTrack[]                                     │
│ - currentProjectId: string | null                                │
├─────────────────────────────────────────────────────────────────┤
│ + connect(token): void                                           │
│ + disconnect(): void                                             │
│ + joinProject(projectId): Promise<void>                          │
│ + leaveProject(projectId): void                                 │
│ + updateCursor(position): void                                   │
│ + requestLock(trackId): Promise<boolean>                         │
│ + releaseLock(trackId): void                                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      StudioPage                                  │
├─────────────────────────────────────────────────────────────────┤
│ - currentProject: Project | null                                 │
│ - tracks: Track[]                                                │
│ - currentTime: number                                            │
│ - isPlaying: boolean                                             │
│ - masterVolume: number                                           │
│ - zoom: number                                                   │
├─────────────────────────────────────────────────────────────────┤
│ + loadProject(id): Promise<void>                                 │
│ + handlePlayPause(): void                                        │
│ + handleSeek(position): void                                    │
│ + handleTrackUpdate(trackId, changes): void                      │
│ + handleAddTrack(file): Promise<void>                            │
│ + handleDeleteTrack(trackId): Promise<void>                      │
│ + handleExport(format): Promise<void>                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ uses
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      AudioPlayer                                 │
├─────────────────────────────────────────────────────────────────┤
│ - audioContext: AudioContext                                     │
│ - audioBuffer: AudioBuffer | null                                │
│ - sourceNode: AudioBufferSourceNode | null                       │
│ - gainNode: GainNode                                             │
│ - currentTime: number                                            │
│ - duration: number                                               │
│ - isPlaying: boolean                                             │
├─────────────────────────────────────────────────────────────────┤
│ + loadAudio(url): Promise<void>                                  │
│ + play(): void                                                   │
│ + pause(): void                                                  │
│ + seek(position): void                                           │
│ + setVolume(volume): void                                        │
│ + setPan(pan): void                                              │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    WaveformDisplay                               │
├─────────────────────────────────────────────────────────────────┤
│ - waveformData: Float32Array | null                             │
│ - canvasRef: RefObject<HTMLCanvasElement>                        │
│ - width: number                                                  │
│ - height: number                                                 │
├─────────────────────────────────────────────────────────────────┤
│ + generateWaveform(audioBuffer): Promise<void>                  │
│ + renderWaveform(): void                                         │
│ + handleCanvasClick(event): void                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      TrackList                                   │
├─────────────────────────────────────────────────────────────────┤
│ - tracks: Track[]                                                │
│ - selectedTrackId: string | null                                 │
├─────────────────────────────────────────────────────────────────┤
│ + handleTrackSelect(trackId): void                               │
│ + handleTrackDelete(trackId): void                               │
│ + handleTrackUpdate(trackId, changes): void                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      OnlineUsers                                 │
├─────────────────────────────────────────────────────────────────┤
│ - onlineUsers: OnlineUser[]                                      │
├─────────────────────────────────────────────────────────────────┤
│ + renderUserList(): JSX.Element                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                      UserCursors                                │
├─────────────────────────────────────────────────────────────────┤
│ - onlineUsers: OnlineUser[]                                      │
│ - currentTime: number                                            │
│ - zoom: number                                                   │
├─────────────────────────────────────────────────────────────────┤
│ + renderCursors(): JSX.Element[]                               │
│ + calculateCursorPosition(user): number                          │
└─────────────────────────────────────────────────────────────────┘
```

### 3.3.3 Relacionamentos entre Classes

```
┌─────────────┐
│    User     │
└──────┬──────┘
       │
       │ 1
       │
       │ owns
       │
       ▼
┌─────────────┐        ┌──────────────────┐
│  Project    │◄───────│ProjectCollaborator│
└──────┬──────┘   N:1  └──────────────────┘
       │
       │ 1
       │
       │ has
       │
       ▼
┌─────────────┐
│    Track    │
└─────────────┘

AuthController ──uses──► User
ProjectController ──uses──► Project
TrackController ──uses──► Track
CollaborationHandler ──manages──► ProjectRoom
CollaborationHandler ──manages──► LockInfo

StudioPage ──uses──► AudioPlayer
StudioPage ──uses──► WaveformDisplay
StudioPage ──uses──► TrackList
StudioPage ──uses──► OnlineUsers
StudioPage ──uses──► UserCursors
StudioPage ──uses──► CollaborationContext
StudioPage ──uses──► AuthContext
```

## 3.4 Modelo Relacional

### 3.4.1 Diagrama Entidade-Relacionamento (DER)

```
┌─────────────────────────────────────────────────────────────────┐
│                           USERS                                  │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id              │ String (CUID)                             │
│    │ email           │ String (UNIQUE)                            │
│    │ username        │ String (UNIQUE)                           │
│    │ password        │ String (Hashed)                           │
│    │ name            │ String                                    │
│    │ bio             │ String? (NULL)                            │
│    │ avatar          │ String? (NULL)                            │
│    │ isActive        │ Boolean (DEFAULT: true)                   │
│    │ createdAt       │ DateTime                                  │
│    │ updatedAt       │ DateTime                                  │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ 1
                              │
                              │ owns
                              │
                              │ N
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                          PROJECTS                                │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id              │ String (CUID)                             │
│ FK │ ownerId         │ String → users.id                         │
│    │ title           │ String                                    │
│    │ description     │ String? (NULL)                            │
│    │ genre           │ String? (NULL)                            │
│    │ isPublic        │ Boolean (DEFAULT: false)                  │
│    │ status          │ Enum (DRAFT, IN_PROGRESS, COMPLETED,     │
│    │                 │      ARCHIVED)                            │
│    │ state           │ JSON? (NULL) - Estado completo do projeto│
│    │ createdAt       │ DateTime                                  │
│    │ updatedAt       │ DateTime                                  │
└─────────────────────────────────────────────────────────────────┘
        │                                    │
        │ 1                                  │ 1
        │                                    │
        │ has                               │ has
        │                                   │
        │ N                                 │ N
        ▼                                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                           TRACKS                                 │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id              │ String (CUID)                             │
│ FK │ projectId      │ String → projects.id                      │
│    │ name            │ String                                    │
│    │ description     │ String? (NULL)                            │
│    │ filePath        │ String? (NULL)                           │
│    │ fileSize        │ Integer? (NULL)                          │
│    │ duration        │ Integer? (NULL) - em segundos             │
│    │ mimeType        │ String? (NULL)                           │
│    │ audioData       │ Bytes? (NULL) - BYTEA no PostgreSQL       │
│    │ isActive        │ Boolean (DEFAULT: true)                  │
│    │ createdAt       │ DateTime                                  │
│    │ updatedAt       │ DateTime                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    PROJECT_COLLABORATORS                         │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id              │ String (CUID)                             │
│ FK │ userId          │ String → users.id                         │
│ FK │ projectId       │ String → projects.id                      │
│ UK │ (userId, projectId) - Unique constraint                    │
│    │ role            │ Enum (OWNER, ADMIN, COLLABORATOR, VIEWER) │
│    │ joinedAt       │ DateTime                                  │
└─────────────────────────────────────────────────────────────────┘
        │                                    │
        │ N                                  │ N
        │                                    │
        │ belongs to                         │ belongs to
        │                                    │
        ▼                                    ▼
┌─────────────────────────────────────────────────────────────────┐
│                           USERS                                  │
│                      (mesma tabela acima)                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                          MESSAGES                                │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id              │ String (CUID)                             │
│ FK │ authorId        │ String → users.id                         │
│ FK │ projectId       │ String → projects.id                      │
│    │ content         │ String                                    │
│    │ createdAt       │ DateTime                                  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                       NOTIFICATIONS                              │
├─────────────────────────────────────────────────────────────────┤
│ PK │ id              │ String (CUID)                             │
│ FK │ userId          │ String → users.id                         │
│    │ title           │ String                                    │
│    │ message         │ String                                    │
│    │ type            │ Enum (INFO, SUCCESS, WARNING, ERROR,      │
│    │                 │      INVITATION)                          │
│    │ isRead          │ Boolean (DEFAULT: false)                  │
│    │ createdAt       │ DateTime                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 3.4.2 Esquema Relacional Detalhado

#### Tabela: users
```sql
CREATE TABLE users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    bio TEXT,
    avatar VARCHAR(500),
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
```

#### Tabela: projects
```sql
CREATE TABLE projects (
    id VARCHAR(255) PRIMARY KEY,
    ownerId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    genre VARCHAR(100),
    isPublic BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'DRAFT',
    state JSONB,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (ownerId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_projects_ownerId ON projects(ownerId);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_isPublic ON projects(isPublic);
```

#### Tabela: project_collaborators
```sql
CREATE TABLE project_collaborators (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    projectId VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'COLLABORATOR',
    joinedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE,
    UNIQUE(userId, projectId)
);

CREATE INDEX idx_collaborators_userId ON project_collaborators(userId);
CREATE INDEX idx_collaborators_projectId ON project_collaborators(projectId);
CREATE INDEX idx_collaborators_role ON project_collaborators(role);
```

#### Tabela: tracks
```sql
CREATE TABLE tracks (
    id VARCHAR(255) PRIMARY KEY,
    projectId VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filePath VARCHAR(500),
    fileSize INTEGER,
    duration INTEGER,
    mimeType VARCHAR(100),
    audioData BYTEA,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_tracks_projectId ON tracks(projectId);
CREATE INDEX idx_tracks_isActive ON tracks(isActive);
```

#### Tabela: messages
```sql
CREATE TABLE messages (
    id VARCHAR(255) PRIMARY KEY,
    authorId VARCHAR(255) NOT NULL,
    projectId VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (authorId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (projectId) REFERENCES projects(id) ON DELETE CASCADE
);

CREATE INDEX idx_messages_projectId ON messages(projectId);
CREATE INDEX idx_messages_authorId ON messages(authorId);
CREATE INDEX idx_messages_createdAt ON messages(createdAt);
```

#### Tabela: notifications
```sql
CREATE TABLE notifications (
    id VARCHAR(255) PRIMARY KEY,
    userId VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(20) DEFAULT 'INFO',
    isRead BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_notifications_userId ON notifications(userId);
CREATE INDEX idx_notifications_isRead ON notifications(isRead);
CREATE INDEX idx_notifications_createdAt ON notifications(createdAt);
```

### 3.4.3 Integridade Referencial

O modelo relacional implementa as seguintes regras de integridade:

1. **Cascata de Exclusão**: Quando um usuário é deletado, todos os seus projetos são deletados (CASCADE). Quando um projeto é deletado, todas as suas tracks, colaboradores e mensagens são deletados.

2. **Restrições de Unicidade**: 
   - Email e username são únicos na tabela `users`
   - A combinação `(userId, projectId)` é única na tabela `project_collaborators`, garantindo que um usuário não pode ser colaborador do mesmo projeto mais de uma vez

3. **Chaves Estrangeiras**: Todas as relações são garantidas através de chaves estrangeiras com validação no nível do banco de dados

4. **Índices**: Índices são criados em campos frequentemente consultados para otimizar performance de queries

## 3.5 Tecnologias Utilizadas

### 3.5.1 Frontend

#### React.js (v19.1.1)
- **Descrição**: Biblioteca JavaScript para construção de interfaces de usuário baseada em componentes
- **Justificativa**: React é amplamente utilizado na indústria, possui grande comunidade, excelente performance com Virtual DOM e permite desenvolvimento modular e reutilizável
- **Uso no Projeto**: 
  - Componentes de UI (AudioPlayer, WaveformDisplay, TimelineTrack)
  - Gerenciamento de estado com Context API
  - Roteamento com React Router DOM

#### React Router DOM (v7.9.2)
- **Descrição**: Biblioteca de roteamento para aplicações React
- **Justificativa**: Permite navegação entre páginas sem recarregar a aplicação (SPA), suporte a rotas protegidas e histórico de navegação
- **Uso no Projeto**: 
  - Rotas: `/`, `/auth`, `/dashboard`, `/studio/:id`
  - Proteção de rotas com componente `ProtectedRoute`

#### Socket.IO Client (v4.8.1)
- **Descrição**: Cliente JavaScript para comunicação WebSocket
- **Justificativa**: Facilita comunicação em tempo real com reconexão automática e fallback para polling
- **Uso no Projeto**: 
  - Conexão com servidor para colaboração em tempo real
  - Eventos: `join-project`, `cursor-move`, `request-track-lock`

#### Axios (v1.12.2)
- **Descrição**: Cliente HTTP baseado em Promises
- **Justificativa**: Facilita requisições HTTP com interceptors, transformação automática de JSON e tratamento de erros
- **Uso no Projeto**: 
  - Comunicação com API REST
  - Serviços: `authService`, `projectService`, `trackService`

#### Web Audio API (Nativo do Navegador)
- **Descrição**: API nativa do navegador para processamento de áudio
- **Justificativa**: Permite manipulação de áudio diretamente no navegador sem plugins, suporte a análise de frequências e efeitos de áudio
- **Uso no Projeto**: 
  - Reprodução de áudio
  - Análise de waveform
  - Controles de volume e pan

### 3.5.2 Backend

#### Node.js (v18.0.0+)
- **Descrição**: Runtime JavaScript baseado no V8 engine do Chrome
- **Justificativa**: Permite desenvolvimento full-stack com JavaScript, excelente para I/O assíncrono e grande ecossistema de pacotes
- **Uso no Projeto**: 
  - Servidor HTTP/WebSocket
  - Processamento assíncrono de requisições

#### Express.js (v4.18.2)
- **Descrição**: Framework web minimalista para Node.js
- **Justificativa**: Framework mais popular para Node.js, flexível, com middleware extensível e suporte a rotas
- **Uso no Projeto**: 
  - Servidor HTTP
  - Definição de rotas REST
  - Middlewares de autenticação e tratamento de erros

#### TypeScript (v5.3.2)
- **Descrição**: Superset tipado do JavaScript que compila para JavaScript
- **Justificativa**: Tipagem estática reduz erros em tempo de desenvolvimento, melhora autocompletar e facilita manutenção de código grande
- **Uso no Projeto**: 
  - Todo o código do backend
  - Interfaces e tipos para validação

#### Socket.IO (v4.7.4)
- **Descrição**: Biblioteca para comunicação em tempo real baseada em WebSocket
- **Justificativa**: Abstrai complexidade do WebSocket, oferece reconexão automática, rooms e namespaces, e fallback para polling
- **Uso no Projeto**: 
  - Servidor WebSocket
  - Gerenciamento de salas por projeto
  - Sincronização de eventos em tempo real

#### Prisma (v5.7.1)
- **Descrição**: ORM (Object-Relational Mapping) moderno para TypeScript e Node.js
- **Justificativa**: Type-safe queries, migrations automáticas, excelente suporte a TypeScript e geração automática de tipos
- **Uso no Projeto**: 
  - Modelagem do banco de dados
  - Queries type-safe
  - Migrations

#### PostgreSQL (v13+)
- **Descrição**: Sistema de gerenciamento de banco de dados relacional open-source
- **Justificativa**: Robusto, ACID-compliant, suporte a JSON/JSONB, tipos de dados avançados (BYTEA para áudio) e excelente performance
- **Uso no Projeto**: 
  - Armazenamento persistente de dados
  - Tabelas relacionais
  - Armazenamento de arquivos de áudio (BYTEA)

#### JSON Web Token (JWT) (v9.0.2)
- **Descrição**: Padrão para tokens de autenticação baseado em JSON
- **Justificativa**: Stateless, escalável, seguro com assinatura e amplamente adotado
- **Uso no Projeto**: 
  - Autenticação de usuários
  - Autorização de requisições REST e WebSocket

#### Bcrypt.js (v2.4.3)
- **Descrição**: Biblioteca para hashing de senhas
- **Justificativa**: Algoritmo de hashing seguro, resistente a rainbow tables e amplamente utilizado
- **Uso no Projeto**: 
  - Criptografia de senhas no registro
  - Validação de senhas no login

#### Multer (v1.4.5-lts.1)
- **Descrição**: Middleware para manipulação de multipart/form-data (upload de arquivos)
- **Justificativa**: Facilita upload de arquivos, suporte a múltiplos arquivos e validação de tipos
- **Uso no Projeto**: 
  - Upload de arquivos de áudio

#### Winston (v3.11.0)
- **Descrição**: Biblioteca de logging para Node.js
- **Justificativa**: Múltiplos transportes, níveis de log configuráveis e formatação customizável
- **Uso no Projeto**: 
  - Logging de erros e informações do servidor

#### Helmet (v7.1.0)
- **Descrição**: Middleware de segurança para Express
- **Justificativa**: Configura headers HTTP de segurança automaticamente, protegendo contra vulnerabilidades comuns
- **Uso no Projeto**: 
  - Segurança HTTP headers

#### CORS (v2.8.5)
- **Descrição**: Middleware para Cross-Origin Resource Sharing
- **Justificativa**: Permite requisições de diferentes origens de forma controlada e segura
- **Uso no Projeto**: 
  - Permitir requisições do frontend (localhost:3000) para backend (localhost:3001)

#### Express Rate Limit (v7.1.5)
- **Descrição**: Middleware para limitar taxa de requisições
- **Justificativa**: Protege contra ataques de força bruta e abuso da API
- **Uso no Projeto**: 
  - Limitação de 100 requisições por 15 minutos por IP

### 3.5.3 Ferramentas de Desenvolvimento

#### Nodemon (v3.0.2)
- **Descrição**: Utilitário que monitora mudanças em arquivos e reinicia o servidor automaticamente
- **Justificativa**: Aumenta produtividade no desenvolvimento, evitando reinicialização manual
- **Uso no Projeto**: 
  - Script `dev` do servidor

#### ESLint (v8.54.0)
- **Descrição**: Ferramenta de linting para JavaScript/TypeScript
- **Justificativa**: Mantém código consistente, identifica erros e aplica boas práticas
- **Uso no Projeto**: 
  - Validação de código TypeScript no backend

#### Jest (v29.7.0)
- **Descrição**: Framework de testes para JavaScript
- **Justificativa**: Testes unitários e de integração, cobertura de código e mocks
- **Uso no Projeto**: 
  - Testes do backend (configurado, não implementado neste TCC)

### 3.5.4 Tabela Comparativa de Tecnologias

| Categoria | Tecnologia | Versão | Tipo | Justificativa Principal |
|-----------|------------|--------|------|------------------------|
| Frontend | React | 19.1.1 | Biblioteca | Componentização e Virtual DOM |
| Frontend | React Router | 7.9.2 | Biblioteca | Roteamento SPA |
| Frontend | Socket.IO Client | 4.8.1 | Biblioteca | WebSocket simplificado |
| Frontend | Axios | 1.12.2 | Biblioteca | Cliente HTTP |
| Frontend | Web Audio API | Nativo | API | Processamento de áudio |
| Backend | Node.js | 18+ | Runtime | JavaScript no servidor |
| Backend | Express | 4.18.2 | Framework | Servidor HTTP |
| Backend | TypeScript | 5.3.2 | Linguagem | Tipagem estática |
| Backend | Socket.IO | 4.7.4 | Biblioteca | WebSocket servidor |
| Backend | Prisma | 5.7.1 | ORM | Type-safe database access |
| Banco | PostgreSQL | 13+ | SGBD | Banco relacional robusto |
| Segurança | JWT | 9.0.2 | Biblioteca | Autenticação stateless |
| Segurança | Bcrypt | 2.4.3 | Biblioteca | Hash de senhas |
| Utilitário | Multer | 1.4.5 | Middleware | Upload de arquivos |
| Utilitário | Winston | 3.11.0 | Biblioteca | Logging |
| Segurança | Helmet | 7.1.0 | Middleware | Headers de segurança |
| Segurança | CORS | 2.8.5 | Middleware | Cross-origin requests |
| Segurança | Rate Limit | 7.1.5 | Middleware | Proteção contra abuso |

### 3.5.5 Decisões Arquiteturais

#### Por que React em vez de Vue ou Angular?
- **React**: Maior ecossistema, mais flexível, melhor para projetos de médio porte, comunidade ativa
- **Vue**: Mais simples, mas menor ecossistema
- **Angular**: Mais complexo, overkill para este projeto

#### Por que Node.js em vez de Python (Django/Flask) ou Java (Spring)?
- **Node.js**: Mesma linguagem frontend/backend, excelente para I/O assíncrono, WebSocket nativo
- **Python**: Mais lento para I/O, menos adequado para tempo real
- **Java**: Mais verboso, configuração complexa

#### Por que PostgreSQL em vez de MongoDB ou MySQL?
- **PostgreSQL**: Suporte a JSON/JSONB (para estado do projeto), BYTEA para arquivos, ACID completo, open-source robusto
- **MongoDB**: Não relacional, menos adequado para dados estruturados
- **MySQL**: Menos recursos avançados, pior suporte a JSON

#### Por que Socket.IO em vez de WebSocket puro?
- **Socket.IO**: Reconexão automática, fallback para polling, rooms/namespaces, melhor DX
- **WebSocket puro**: Mais controle, mas mais código boilerplate

#### Por que Prisma em vez de TypeORM ou Sequelize?
- **Prisma**: Type-safe queries, melhor suporte TypeScript, migrations automáticas, melhor DX
- **TypeORM**: Mais complexo, decorators verbosos
- **Sequelize**: Menos type-safe, sintaxe mais antiga

---

**Este capítulo apresenta a arquitetura completa do sistema MusicCollab, incluindo diagramas de casos de uso, classes e modelo relacional, além de uma análise detalhada das tecnologias utilizadas e justificativas para cada escolha técnica.**

