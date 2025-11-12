# 🏗️ Arquitetura do Sistema de Colaboração

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────────────┐
│                         NAVEGADOR (Cliente)                          │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                       StudioPage.jsx                          │  │
│  │  ┌────────────────┐  ┌──────────────┐  ┌─────────────────┐  │  │
│  │  │  OnlineUsers   │  │  UserCursors │  │ Collaborators   │  │  │
│  │  │   Component    │  │   Component  │  │     Panel       │  │  │
│  │  └────────────────┘  └──────────────┘  └─────────────────┘  │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │              CollaborationContext.jsx                         │  │
│  │  • Estado global de colaboração                               │  │
│  │  • onlineUsers, lockedTracks, currentProjectId                │  │
│  │  • joinProject(), updateCursor(), requestLock()               │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                              ↕                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │            collaborationService.js                            │  │
│  │  • Socket.IO Client                                           │  │
│  │  • Gerencia conexão WebSocket                                 │  │
│  │  • API REST para colaboradores                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                       │
└───────────────────────────────────┬───────────────────────────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │ HTTP          │ WebSocket     │
                    │ (REST API)    │ (Socket.IO)   │
                    ↓               ↓               ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      SERVIDOR (Backend - Node.js)                    │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                       index.ts                                │  │
│  │  • Express Server                                             │  │
│  │  • Socket.IO Server                                           │  │
│  │  • CORS configurado                                           │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                    │                           │                     │
│       ┌────────────┴────────────┐    ┌────────┴─────────────┐      │
│       │ REST API                 │    │ WebSocket            │      │
│       ↓                          │    ↓                      │      │
│  ┌──────────────────┐            │  ┌──────────────────┐    │      │
│  │ projectController│            │  │ collaboration    │    │      │
│  │       .ts        │            │  │   Handler.ts     │    │      │
│  │                  │            │  │                  │    │      │
│  │ • getCollaborators│           │  │ • join-project   │    │      │
│  │ • addCollaborator│            │  │ • cursor-move    │    │      │
│  │ • updateCollaborator│         │  │ • request-lock   │    │      │
│  │ • removeCollaborator│         │  │ • release-lock   │    │      │
│  └──────────────────┘            │  └──────────────────┘    │      │
│                                   │                          │      │
│  ┌──────────────────────────────┐│  ┌──────────────────────┐│      │
│  │   auth.ts (Middleware)       ││  │ JWT Authentication   ││      │
│  │   • Verificar token          ││  │ • Socket middleware  ││      │
│  │   • Verificar permissões     ││  └──────────────────────┘│      │
│  └──────────────────────────────┘│                          │      │
│                    │              │            │             │      │
│                    └──────────────┴────────────┘             │      │
│                                   │                          │      │
│                                   ↓                          │      │
│  ┌──────────────────────────────────────────────────────────┐│      │
│  │              Prisma Client (ORM)                         ││      │
│  │  • User                                                  ││      │
│  │  • Project                                               ││      │
│  │  • ProjectCollaborator                                   ││      │
│  │  • Track                                                 ││      │
│  └──────────────────────────────────────────────────────────┘│      │
│                                   │                          │      │
└───────────────────────────────────┼──────────────────────────┼──────┘
                                    ↓                          │
                     ┌──────────────────────────────┐          │
                     │    PostgreSQL Database       │          │
                     │  • Tabelas:                  │          │
                     │    - users                   │          │
                     │    - projects                │          │
                     │    - project_collaborators   │          │
                     │    - tracks                  │          │
                     └──────────────────────────────┘          │
                                                                │
         ┌──────────────────────────────────────────────────────┘
         │ Memória (Em Runtime)
         ↓
    ┌────────────────────────────────┐
    │ Estruturas de Dados:           │
    │ • projectRooms: Map<string,    │
    │     ProjectRoom>               │
    │   - Salas por projeto          │
    │   - Usuários online por sala   │
    │                                │
    │ • trackLocks: Map<string,      │
    │     LockInfo>                  │
    │   - Tracks bloqueadas          │
    │   - Quem está editando         │
    └────────────────────────────────┘
```

## 🔄 Fluxo de Dados

### 1️⃣ Conexão Inicial

```
Usuário faz login
      ↓
Token JWT gerado
      ↓
Navegador armazena token
      ↓
Usuário abre projeto
      ↓
CollaborationContext conecta WebSocket
      ↓
Token enviado no handshake
      ↓
Servidor valida token
      ↓
Conexão estabelecida ✅
```

### 2️⃣ Entrar em Projeto

```
Cliente: emit('join-project', projectId)
      ↓
Servidor: Verifica permissões no banco
      ↓
Usuário tem acesso?
   │
   ├─ NÃO → emit('error', message) ❌
   │
   └─ SIM → 
         │
         ├─ Adiciona usuário à sala (room)
         │
         ├─ emit('online-users', [...]) → Cliente
         │
         └─ broadcast('user-joined', user) → Outros usuários
```

### 3️⃣ Mover Cursor

```
Usuário move cursor na timeline
      ↓
useEffect detecta mudança
      ↓
Debounce de 100ms
      ↓
updateCursor(cursorPosition)
      ↓
emit('cursor-move', { projectId, cursorPosition })
      ↓
Servidor: Atualiza posição na sala
      ↓
broadcast('cursor-updated', { userId, cursorPosition })
      ↓
Outros usuários: Componente UserCursors re-renderiza
      ↓
Cursor aparece/move na tela ✅
```

### 4️⃣ Editar Track (com bloqueio)

```
Usuário começa a editar track
      ↓
handleTrackUpdate(trackId, changes)
      ↓
Verifica: isTrackLocked(trackId)?
   │
   ├─ SIM → showToast('Track bloqueada') ❌
   │         return
   │
   └─ NÃO → 
         │
         ├─ requestLock(trackId)
         │       ↓
         │   emit('request-track-lock', { projectId, trackId })
         │       ↓
         │   Servidor: trackLocks.get(key) exists?
         │       │
         │       ├─ SIM → emit('track-lock-denied') ❌
         │       │
         │       └─ NÃO → 
         │             │
         │             ├─ trackLocks.set(key, lockInfo)
         │             │
         │             ├─ emit('track-lock-granted') → Solicitante ✅
         │             │
         │             └─ broadcast('track-locked', info) → Outros
         │
         ├─ setEditingTrackId(trackId)
         │
         ├─ Aplica mudanças localmente
         │
         └─ setTimeout(3000ms) → releaseLock(trackId)
```

### 5️⃣ Liberar Bloqueio

```
Após 3 segundos OU usuário sai do projeto
      ↓
releaseLock(trackId)
      ↓
emit('release-track-lock', { projectId, trackId })
      ↓
Servidor: trackLocks.delete(key)
      ↓
broadcast('track-unlocked', { trackId })
      ↓
Outros usuários: podem editar agora ✅
```

## 🗂️ Estrutura de Dados

### ProjectRoom (Servidor)

```typescript
interface ProjectRoom {
  projectId: string;
  users: Map<string, {
    socketId: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    cursorPosition?: number;
    isEditing: boolean;
    editingTrackId?: string;
  }>;
}
```

### TrackLock (Servidor)

```typescript
interface TrackLock {
  userId: string;
  userName: string;
  socketId: string;
}

// Map: "projectId-trackId" → TrackLock
trackLocks.set('proj123-track456', {
  userId: 'user789',
  userName: 'João Silva',
  socketId: 'socket_abc'
});
```

### Estado do CollaborationContext (Cliente)

```javascript
{
  isConnected: boolean,
  onlineUsers: [
    {
      userId: string,
      userName: string,
      userAvatar?: string,
      socketId: string,
      cursorPosition?: number,
      isEditing: boolean,
      editingTrackId?: string
    }
  ],
  lockedTracks: [
    {
      trackId: string,
      userId: string,
      userName: string
    }
  ],
  currentProjectId: string | null
}
```

## 🔐 Segurança - Camadas de Proteção

```
┌─────────────────────────────────────────────┐
│ 1. Autenticação WebSocket                   │
│    • JWT verificado no handshake            │
│    • Socket desconectado se inválido        │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 2. Verificação de Permissões (join-project) │
│    • Consulta ao banco de dados             │
│    • User é owner OU colaborador?           │
│    • Se NÃO: erro, sem acesso à sala        │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 3. Isolamento por Sala (Room)               │
│    • Cada projeto = 1 sala                  │
│    • Eventos só para usuários na sala       │
│    • Sem vazamento de dados entre projetos  │
└─────────────────────────────────────────────┘
               ↓
┌─────────────────────────────────────────────┐
│ 4. Verificação de Permissões (API REST)     │
│    • Middleware authenticateToken           │
│    • Apenas OWNER/ADMIN gerenciam colabs    │
│    • Colaboradores não podem adicionar      │
└─────────────────────────────────────────────┘
```

## 📡 Comunicação em Tempo Real

### Broadcast vs Emit

```javascript
// Servidor

// 1. Emit: Envia APENAS para quem solicitou
socket.emit('online-users', users);

// 2. Broadcast: Envia para TODOS na sala EXCETO quem solicitou
socket.to(projectId).emit('user-joined', user);

// 3. IO.to: Envia para TODOS na sala (incluindo quem solicitou)
io.to(projectId).emit('project-changed', changes);
```

### Exemplo Prático: Novo Usuário Entra

```
Estado Inicial:
  Sala "projeto-123": [Usuário A]

Usuário B entra:
  1. B conecta → join('projeto-123')
  
  2. Servidor → B: emit('online-users', [A, B])
     (Apenas B recebe a lista completa)
     
  3. Servidor → A: broadcast('user-joined', B)
     (Apenas A é notificado que B entrou)
     
Estado Final:
  Sala "projeto-123": [Usuário A, Usuário B]
```

## 🧹 Limpeza de Recursos

### Quando Usuário Desconecta

```javascript
// collaborationHandler.ts

socket.on('disconnect', () => {
  1. Para cada sala que o usuário estava:
     ├─ Remove usuário da sala
     ├─ Notifica outros: broadcast('user-left')
     └─ Se sala vazia: delete projectRooms.get(projectId)
  
  2. Para cada lock que o usuário tinha:
     ├─ Remove lock: trackLocks.delete(key)
     └─ Notifica outros: broadcast('track-unlocked')
});
```

## 🚀 Otimizações Implementadas

### 1. Debounce de Cursor (100ms)
```javascript
// StudioPage.jsx

useEffect(() => {
  if (currentProjectId && !isPlaying) {
    const debounceTimer = setTimeout(() => {
      updateCursor(currentTime);
    }, 100); // ⚡ Reduz tráfego de rede
    
    return () => clearTimeout(debounceTimer);
  }
}, [currentTime, currentProjectId, isPlaying]);
```

### 2. Liberação Automática de Lock (3s)
```javascript
// Evita locks esquecidos
setTimeout(() => {
  if (editingTrackId === trackId) {
    releaseLock(trackId);
    setEditingTrackId(null);
  }
}, 3000);
```

### 3. Reconexão Automática
```javascript
// collaborationService.js

const socket = io(SOCKET_URL, {
  reconnection: true,
  reconnectionDelay: 1000,
  reconnectionAttempts: 5
});
```

### 4. Limpeza de Salas Vazias
```javascript
// Libera memória do servidor
if (room.users.size === 0) {
  projectRooms.delete(projectId);
}
```

## 📊 Complexidade

- **Tempo de conexão:** O(1)
- **Broadcast para sala:** O(n) onde n = usuários na sala
- **Verificação de lock:** O(1) (Map lookup)
- **Adicionar/remover colaborador:** O(1) (database indexed)

## 🎯 Escalabilidade

**Atual (Single Server):**
- ✅ Perfeito para até ~100 usuários simultâneos
- ✅ Memória: ~1MB por 100 salas ativas
- ✅ CPU: Baixo uso (eventos assíncronos)

**Futuro (Múltiplos Servidores):**
- Para escalar horizontalmente, usar **Redis Adapter** para Socket.IO
- Sincronizar `projectRooms` e `trackLocks` via Redis
- Load balancer com sticky sessions

---

**Arquitetura robusta, escalável e eficiente!** 🚀

