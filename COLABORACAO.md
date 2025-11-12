# 🎵 Sistema de Colaboração em Tempo Real - MusicCollab

## 📋 Visão Geral

O MusicCollab agora possui um **sistema completo de colaboração em tempo real** que permite que múltiplos usuários trabalhem simultaneamente no mesmo projeto musical, com sincronização de cursores, bloqueio de edição e gerenciamento de permissões.

## ✨ Funcionalidades Implementadas

### 1. **Acesso Compartilhado a Projetos**
- ✅ Criador do projeto é **automaticamente adicionado como OWNER** (Administrador)
- ✅ Proprietários podem adicionar colaboradores por email
- ✅ Diferentes níveis de permissão (OWNER, ADMIN, COLLABORATOR, VIEWER)
- ✅ Verificação de permissões no backend (API e WebSocket)
- ✅ Projetos compartilhados aparecem no Dashboard de todos os colaboradores

### 2. **Colaboração em Tempo Real via WebSocket**
- ✅ Conexão automática ao entrar em um projeto
- ✅ Visualização de usuários online no projeto
- ✅ Sincronização de posição do cursor entre usuários
- ✅ Reconexão automática em caso de perda de conexão

### 3. **Visualização de Cursores de Outros Usuários**
- ✅ Cada usuário tem uma cor única e identificável
- ✅ Labels com nome do usuário aparecem sobre o cursor
- ✅ Cursores se movem suavemente pela timeline
- ✅ Seu próprio cursor não é exibido

### 4. **Sistema de Bloqueio de Edição**
- ✅ Quando um usuário começa a editar uma track, ela é bloqueada automaticamente
- ✅ Outros usuários recebem notificação de que a track está bloqueada
- ✅ Liberação automática do bloqueio após 3 segundos de inatividade
- ✅ Liberação do bloqueio ao sair do projeto
- ✅ Indicador visual de quem está editando

## 🎯 Como Usar

### Para Proprietários do Projeto

#### 1. Adicionar Colaboradores

**Nota:** Quando você cria um projeto, você é **automaticamente adicionado como OWNER** (Proprietário/Administrador).

1. Abra seu projeto no Studio
2. Na barra lateral esquerda, clique no botão **"👥 Colaboradores"**
3. No painel que abrir, você verá sua conta listada como **OWNER**
4. Para adicionar outros colaboradores:
   - Insira o **email** do usuário que deseja adicionar
   - Selecione o **nível de permissão**:
     - **Colaborador**: Pode editar o projeto
     - **Administrador**: Pode editar e gerenciar outros colaboradores
     - **Visualizador**: Apenas visualização, sem edição
   - Clique em **"Adicionar"**

#### 2. Gerenciar Permissões

- Para **alterar a permissão** de um colaborador: use o dropdown ao lado do nome
- Para **remover** um colaborador: clique no ícone 🗑️

### Para Colaboradores

#### 1. Acessar Projeto Compartilhado

1. Faça login na sua conta
2. No **Dashboard**, você verá todos os projetos aos quais tem acesso
3. Clique no projeto desejado para abrir o Studio

#### 2. Trabalhar em Tempo Real

1. Ao entrar no projeto, você será **automaticamente conectado** ao WebSocket
2. Na barra lateral, veja a seção **"Online"** mostrando todos os usuários conectados
3. Os **cursores dos outros usuários** aparecerão na timeline com suas cores e nomes
4. Você pode ver em tempo real onde cada usuário está trabalhando

#### 3. Editar Tracks

1. Selecione uma track e comece a editar (volume, pan, etc.)
2. O sistema **bloqueará automaticamente** a track para você
3. Outros usuários verão uma notificação: *"Esta track está sendo editada por [seu nome]"*
4. Após 3 segundos sem editar, o bloqueio é **liberado automaticamente**

## 🔧 Arquitetura Técnica

### Frontend (React)

#### Componentes Principais

1. **`CollaborationContext.jsx`**
   - Gerencia estado global de colaboração
   - Conecta ao WebSocket
   - Gerencia eventos em tempo real

2. **`OnlineUsers.jsx`**
   - Lista de usuários conectados
   - Indicador de quem está editando

3. **`UserCursors.jsx`**
   - Renderiza cursores de outros usuários na timeline
   - Calcula posições baseadas em duração e zoom

4. **`CollaboratorsPanel.jsx`**
   - Interface para gerenciar permissões
   - Adicionar/remover colaboradores

#### Serviços

**`collaborationService.js`**
- Gerencia conexão WebSocket
- API REST para CRUD de colaboradores
- Eventos: `join-project`, `cursor-move`, `request-track-lock`, `release-track-lock`

### Backend (Node.js + TypeScript)

#### Componentes Principais

1. **`collaborationHandler.ts`**
   - Gerencia conexões WebSocket
   - Autenticação via JWT
   - Salas por projeto (rooms)
   - Sistema de bloqueio de tracks

2. **`projectController.ts`**
   - CRUD de colaboradores via API REST
   - Verificação de permissões
   - Endpoints: `GET/POST/PUT/DELETE /api/projects/:id/collaborators`

#### Banco de Dados (Prisma + PostgreSQL)

**Modelo `ProjectCollaborator`**
```prisma
model ProjectCollaborator {
  id        String   @id @default(cuid())
  role      CollaboratorRole @default(COLLABORATOR)
  joinedAt  DateTime @default(now())
  user      User     @relation(...)
  userId    String
  project   Project  @relation(...)
  projectId String
  @@unique([userId, projectId])
}

enum CollaboratorRole {
  OWNER
  ADMIN
  COLLABORATOR
  VIEWER
}
```

## 🌐 Eventos WebSocket

### Do Cliente → Servidor

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `join-project` | `projectId` | Entrar em um projeto |
| `leave-project` | `projectId` | Sair de um projeto |
| `cursor-move` | `{ projectId, cursorPosition }` | Atualizar posição do cursor |
| `request-track-lock` | `{ projectId, trackId }` | Solicitar bloqueio de track |
| `release-track-lock` | `{ projectId, trackId }` | Liberar bloqueio de track |
| `project-update` | `{ projectId, changes }` | Sincronizar mudanças |

### Do Servidor → Cliente

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `online-users` | `[{ userId, userName, socketId, ... }]` | Lista de usuários online |
| `user-joined` | `{ userId, userName, ... }` | Novo usuário entrou |
| `user-left` | `{ userId, socketId }` | Usuário saiu |
| `cursor-updated` | `{ userId, socketId, cursorPosition }` | Cursor de usuário moveu |
| `locked-tracks` | `[{ trackId, userId, userName }]` | Tracks bloqueadas |
| `track-locked` | `{ trackId, userId, userName }` | Track foi bloqueada |
| `track-unlocked` | `{ trackId }` | Track foi desbloqueada |
| `track-lock-granted` | `{ trackId }` | Seu bloqueio foi aceito |
| `track-lock-denied` | `{ trackId, lockedBy }` | Seu bloqueio foi negado |

## 🔒 Segurança

### Autenticação WebSocket
- ✅ JWT verificado em cada conexão
- ✅ Usuário não autenticado é desconectado

### Verificação de Permissões
- ✅ Ao entrar em projeto: verifica se usuário é owner ou colaborador
- ✅ API REST: verifica permissões em CRUD de colaboradores
- ✅ Apenas OWNER/ADMIN podem adicionar/remover colaboradores

### Isolamento de Dados
- ✅ Salas (rooms) separadas por projeto
- ✅ Usuários só recebem eventos do projeto em que estão
- ✅ Limpeza automática ao desconectar

## 🧪 Testando a Colaboração

### Cenário de Teste

1. **Usuário A (Proprietário)**:
   - Cria um projeto
   - Adiciona Usuário B como colaborador
   - Faz upload de algumas tracks

2. **Usuário B (Colaborador)**:
   - Faz login
   - Abre o projeto compartilhado no Dashboard
   - Entra no Studio

3. **Teste de Cursores**:
   - Usuário A move o cursor na timeline
   - Usuário B vê o cursor de A se mover em tempo real

4. **Teste de Bloqueio**:
   - Usuário A começa a editar uma track (ajusta volume)
   - Usuário B tenta editar a mesma track
   - Usuário B vê notificação: *"Esta track está sendo editada por [Usuário A]"*

5. **Teste de Usuários Online**:
   - Ambos veem na barra lateral: "2 Online"
   - Lista mostra: Usuário A e Usuário B
   - Quando A está editando, aparece ícone ✏️ ao lado do nome

## 🚀 Próximos Passos (Melhorias Futuras)

- [ ] Sincronização de estado completo do projeto em tempo real
- [ ] Chat em tempo real entre colaboradores
- [ ] Histórico de versões com rollback
- [ ] Notificações de mudanças importantes
- [ ] Presença: indicar quando usuário está AFK
- [ ] Sincronização de reprodução (todos tocam junto)
- [ ] Comentários/anotações na timeline

## 📚 Referências

- [Socket.IO Documentation](https://socket.io/docs/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [React Context API](https://react.dev/reference/react/useContext)

---

## 🎉 Conclusão

O sistema de colaboração está **totalmente funcional** e pronto para uso! Agora múltiplos músicos podem trabalhar simultaneamente no mesmo projeto, vendo os cursores uns dos outros e evitando conflitos de edição graças ao sistema de bloqueio inteligente.

**Desenvolvido com ❤️ para o MusicCollab**

