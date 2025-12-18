# Arquivo de Contexto do Projeto

## Informações Gerais do Projeto

**Nome do Projeto:** MusicCollab - Plataforma SaaS de Edição Musical Colaborativa
**Descrição:** Plataforma web que permite produção musical colaborativa em tempo real, com recursos de compartilhamento de projetos, exportação de faixas e controle de permissões de acesso
**Tecnologias:** Node.js, React.js, Socket.IO, PostgreSQL
**Versão:** 1.0.0 (Desenvolvimento)
**Objetivo Principal:** Permitir que músicos produzam faixas simultaneamente à distância através de uma interface web colaborativa

## Prompt Personalizado para IA

```
Você é um assistente de desenvolvimento especializado em plataformas SaaS de produção musical colaborativa.

Este projeto é uma aplicação web que permite edição musical colaborativa online em tempo real. O objetivo é resolver o problema de produção musical à distância, permitindo que múltiplos usuários trabalhem simultaneamente em projetos musicais.

Tecnologias principais: Node.js (backend), React.js (frontend), Socket.IO (tempo real), PostgreSQL (banco de dados)
Padrões específicos: Arquitetura SaaS, colaboração em tempo real, streaming de áudio, controle de permissões
Objetivos principais: 
- Implementar colaboração em tempo real para edição musical
- Sistema de compartilhamento de projetos com controle de acesso
- Exportação de faixas em múltiplos formatos
- Interface intuitiva para produção musical

Sempre considere:
- Latência mínima para colaboração musical
- Qualidade de áudio e sincronização
- Escalabilidade para múltiplos usuários simultâneos
- Segurança de projetos musicais
- UX otimizada para músicos e produtores
- Todos os arquivos em UTF-8
```

## Estrutura do Projeto

```
musiccollab/
??? client/                 # Frontend React.js
?   ??? src/
?   ?   ??? components/     # Componentes reutilizáveis
?   ?   ?   ??? audio/      # Componentes de áudio
?   ?   ?   ??? collaboration/ # Componentes de colaboração
?   ?   ?   ??? project/    # Componentes de projeto
?   ?   ?   ??? ui/         # Componentes de interface
?   ?   ??? pages/          # Páginas/rotas
?   ?   ??? services/       # Serviços e APIs
?   ?   ??? hooks/          # Custom hooks React
?   ?   ??? utils/          # Funções utilitárias
?   ?   ??? types/          # Definições TypeScript
?   ?   ??? styles/         # Arquivos de estilo
?   ?   ??? socket/         # Configuração Socket.IO
??? server/                 # Backend Node.js
?   ??? src/
?   ?   ??? controllers/    # Controladores de rota
?   ?   ??? models/         # Modelos de dados
?   ?   ??? services/       # Lógica de negócio
?   ?   ??? middleware/     # Middlewares
?   ?   ??? routes/         # Definição de rotas
?   ?   ??? socket/         # Handlers Socket.IO
?   ?   ??? utils/          # Utilitários
?   ?   ??? config/         # Configurações
??? database/               # Scripts PostgreSQL
?   ??? migrations/         # Migrações
?   ??? seeds/             # Dados iniciais
?   ??? schemas/           # Esquemas de banco
??? shared/                 # Código compartilhado
?   ??? types/             # Tipos compartilhados
?   ??? utils/             # Utilitários compartilhados
??? tests/                  # Testes
??? docs/                   # Documentação
??? README.md               # Documentação principal
```

## Padrões de Desenvolvimento

### Convenções de Nomenclatura
- **Arquivos:** kebab-case (ex: `user-profile.tsx`)
- **Componentes:** PascalCase (ex: `UserProfile`)
- **Funções/Variáveis:** camelCase (ex: `getUserData`)
- **Constantes:** UPPER_SNAKE_CASE (ex: `API_BASE_URL`)

### Estrutura de Componentes
```typescript
// Template para componentes de áudio colaborativo
import React, { useState, useEffect, useRef } from 'react';
import { useSocket } from '../hooks/useSocket';
import { AudioTrack, Project } from '../types';

interface AudioEditorProps {
  project: Project;
  track: AudioTrack;
  isCollaborating: boolean;
}

const AudioEditor: React.FC<AudioEditorProps> = ({ 
  project, 
  track, 
  isCollaborating 
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const { socket } = useSocket();

  // Sincronização em tempo real
  useEffect(() => {
    if (socket && isCollaborating) {
      socket.on('audioUpdate', (data) => {
        if (data.trackId === track.id) {
          // Aplicar mudanças recebidas
          setCurrentTime(data.currentTime);
        }
      });
    }
  }, [socket, track.id, isCollaborating]);

  const handlePlayPause = () => {
    const newState = !isPlaying;
    setIsPlaying(newState);
    
    // Notificar outros colaboradores
    if (isCollaborating) {
      socket?.emit('audioControl', {
        trackId: track.id,
        action: newState ? 'play' : 'pause',
        timestamp: Date.now()
      });
    }
  };

  return (
    <div className="audio-editor">
      <audio ref={audioRef} src={track.url} />
      <div className="controls">
        <button onClick={handlePlayPause}>
          {isPlaying ? 'Pause' : 'Play'}
        </button>
        <div className="timeline">
          {/* Timeline component */}
        </div>
      </div>
    </div>
  );
};

export default AudioEditor;
```

### Estrutura de Serviços/APIs
```typescript
// Serviço de colaboração musical
import io, { Socket } from 'socket.io-client';
import { Project, AudioTrack, CollaborationEvent } from '../types';

class CollaborationService {
  private socket: Socket | null = null;
  private projectId: string | null = null;

  connect(projectId: string, userId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.projectId = projectId;
      this.socket = io(process.env.REACT_APP_SOCKET_URL, {
        auth: { userId, projectId }
      });

      this.socket.on('connect', () => {
        console.log('Conectado ao projeto:', projectId);
        resolve();
      });

      this.socket.on('connect_error', (error) => {
        reject(error);
      });
    });
  }

  // Eventos de colaboração em tempo real
  onAudioUpdate(callback: (data: CollaborationEvent) => void) {
    this.socket?.on('audioUpdate', callback);
  }

  onTrackAdded(callback: (track: AudioTrack) => void) {
    this.socket?.on('trackAdded', callback);
  }

  onUserJoined(callback: (user: any) => void) {
    this.socket?.on('userJoined', callback);
  }

  // Emitir mudanças
  emitAudioControl(trackId: string, action: string, timestamp: number) {
    this.socket?.emit('audioControl', {
      trackId,
      action,
      timestamp,
      projectId: this.projectId
    });
  }

  emitTrackEdit(trackId: string, changes: Partial<AudioTrack>) {
    this.socket?.emit('trackEdit', {
      trackId,
      changes,
      projectId: this.projectId
    });
  }

  disconnect() {
    this.socket?.disconnect();
    this.socket = null;
    this.projectId = null;
  }
}

export default CollaborationService;
```

## Configurações Importantes

### Variáveis de Ambiente
```env
# Backend (.env)
NODE_ENV=development
PORT=3001
DATABASE_URL=postgresql://user:password@localhost:5432/musiccollab
JWT_SECRET=your-jwt-secret-key
SOCKET_CORS_ORIGIN=http://localhost:3000

# Frontend (.env)
REACT_APP_API_URL=http://localhost:3001/api
REACT_APP_SOCKET_URL=http://localhost:3001
REACT_APP_AUDIO_MAX_SIZE=50000000
REACT_APP_SUPPORTED_FORMATS=mp3,wav,flac,aac
```

### Scripts de Desenvolvimento
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server:dev\" \"npm run client:dev\"",
    "server:dev": "cd server && npm run dev",
    "client:dev": "cd client && npm start",
    "build": "npm run client:build && npm run server:build",
    "client:build": "cd client && npm run build",
    "server:build": "cd server && npm run build",
    "test": "npm run client:test && npm run server:test",
    "client:test": "cd client && npm test",
    "server:test": "cd server && npm test",
    "db:migrate": "cd server && npm run db:migrate",
    "db:seed": "cd server && npm run db:seed",
    "lint": "npm run client:lint && npm run server:lint",
    "format": "prettier --write \"**/*.{js,ts,tsx,json,md}\""
  }
}
```

## Diretrizes de Código

### 1. Comentários
- Use comentários para explicar o "porquê", não o "o que"
- Documente funções complexas com JSDoc
- Mantenha comentários atualizados

### 2. Tratamento de Erros
```typescript
// Sempre trate erros adequadamente
try {
  const result = await apiCall();
  return result;
} catch (error) {
  console.error('Erro na chamada da API:', error);
  throw new Error('Falha ao processar dados');
}
```

### 3. Validação de Dados
- Valide inputs do usuário
- Use TypeScript para validação de tipos
- Implemente validação no backend também

### 4. Performance
- Use lazy loading quando apropriado
- Implemente memoização para componentes pesados
- Otimize imagens e assets

## Ferramentas e Bibliotecas Comuns

### Desenvolvimento Frontend
- **React.js** - Framework principal
- **TypeScript** - Tipagem estática
- **Socket.IO Client** - Comunicação em tempo real
- **Web Audio API** - Manipulação de áudio
- **React Router** - Roteamento
- **Axios** - Requisições HTTP
- **Tailwind CSS** - Estilização
- **React Query** - Gerenciamento de estado servidor

### Desenvolvimento Backend
- **Node.js/Express** - Runtime e framework
- **Socket.IO** - WebSockets para colaboração
- **PostgreSQL** - Banco de dados
- **Prisma** - ORM
- **Multer** - Upload de arquivos de áudio
- **JWT** - Autenticação
- **Jest** - Testes
- **ESLint/Prettier** - Linting e formatação

### Áudio e Streaming
- **Web Audio API** - Processamento de áudio
- **MediaRecorder API** - Gravação de áudio
- **AudioContext** - Contexto de áudio
- **WebRTC** - Streaming de áudio (futuro)

### DevOps
- **GitHub Actions** - CI/CD
- **AWS S3** - Armazenamento de arquivos de áudio
- **Heroku/Railway** - Deploy

## Checklist de Desenvolvimento

### Antes de Começar
- [ ] Definir requisitos de colaboração musical
- [ ] Configurar ambiente de desenvolvimento (Node.js, PostgreSQL)
- [ ] Criar estrutura inicial do projeto (client/server)
- [ ] Configurar Socket.IO para comunicação em tempo real
- [ ] Definir esquema de banco de dados para projetos e usuários

### Durante o Desenvolvimento
- [ ] Implementar autenticação e autorização
- [ ] Desenvolver sistema de colaboração em tempo real
- [ ] Criar interface de edição de áudio
- [ ] Implementar upload e processamento de arquivos de áudio
- [ ] Desenvolver sistema de permissões de projeto
- [ ] Implementar exportação de faixas
- [ ] Testar sincronização entre usuários
- [ ] Otimizar latência para colaboração musical

### Antes do Deploy
- [ ] Testar colaboração com múltiplos usuários
- [ ] Verificar qualidade de áudio e sincronização
- [ ] Testar upload de arquivos grandes
- [ ] Verificar segurança de projetos musicais
- [ ] Otimizar performance de streaming
- [ ] Configurar armazenamento de arquivos (S3)
- [ ] Executar testes de carga

## Contatos e Recursos

**Desenvolvedor Principal:** Erick dos Santos Martins
**Email:** [seu-email@exemplo.com]
**Repositório:** [URL do repositório]
**TCC:** Tecnologia em Análise e Desenvolvimento de Sistemas

### Recursos Úteis para Produção Musical Colaborativa
- [Web Audio API Documentation](https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API)
- [Socket.IO Documentation](https://socket.io/docs/)
- [React Audio Components](https://react-audio-components.netlify.app/)
- [PostgreSQL Audio Storage Best Practices](https://www.postgresql.org/docs/)
- [Real-time Collaboration Patterns](https://docs.google.com/document/d/1CvAClvFfyA5R-PhYUmn5OOQtFMHv0c8fsN0v9lG7esg/)

### Considerações Específicas do Projeto
- **Latência:** Manter < 100ms para colaboração musical eficaz
- **Qualidade de Áudio:** Suportar pelo menos 44.1kHz/16-bit
- **Sincronização:** Implementar algoritmos de sincronização de tempo
- **Escalabilidade:** Suportar múltiplos projetos simultâneos
- **Segurança:** Proteger propriedade intelectual musical

---

*Este arquivo deve ser atualizado conforme o projeto evolui e novas decisões são tomadas.*
