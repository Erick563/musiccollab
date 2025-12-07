# 🚀 Guia de Deploy - MusicCollab

Este guia explica como fazer deploy do MusicCollab no Render.com gratuitamente.

## 📋 Pré-requisitos

1. Conta no GitHub
2. Conta no Render.com (gratuita)
3. Repositório Git do projeto no GitHub

## 🔧 Preparação do Projeto

### 1. Fazer commit das alterações

Certifique-se de que todas as alterações foram commitadas:

```bash
git add .
git commit -m "Preparar projeto para deploy no Render"
git push origin main
```

### 2. Verificar arquivos necessários

Certifique-se de que os seguintes arquivos existem:
- ✅ `render.yaml` (na raiz do projeto)
- ✅ `server/package.json` (com tipos em dependencies)
- ✅ `client/package.json`
- ✅ `server/prisma/schema.prisma`

## 🌐 Deploy no Render.com

### Opção 1: Deploy Automático (Recomendado)

1. **Acesse o Render:**
   - Vá para [render.com](https://render.com)
   - Faça login com sua conta GitHub

2. **Crie um novo Blueprint:**
   - Dashboard → "New" → "Blueprint"
   - Conecte seu repositório GitHub
   - O Render detectará automaticamente o `render.yaml`

3. **Configure as variáveis de ambiente:**
   O Render criará automaticamente:
   - ✅ Banco PostgreSQL (`musiccollab-db`)
   - ✅ Backend (`musiccollab-backend`)
   - ✅ Frontend (`musiccollab-frontend`)

4. **Aguarde o deploy:**
   - Backend: ~5-10 minutos
   - Frontend: ~3-5 minutos
   - Database: ~1-2 minutos

5. **Acesse sua aplicação:**
   - Frontend: `https://musiccollab-frontend.onrender.com`
   - Backend API: `https://musiccollab-backend.onrender.com`

### Opção 2: Deploy Manual

#### Passo 1: Criar o Banco de Dados

1. Dashboard → "New" → "PostgreSQL"
2. Configure:
   - **Name:** `musiccollab-db`
   - **Database:** `musiccollab`
   - **User:** `musiccollab`
   - **Region:** Oregon (Free)
   - **Plan:** Free
3. Clique em "Create Database"
4. **Copie a "External Database URL"** - você vai precisar dela

#### Passo 2: Deploy do Backend

1. Dashboard → "New" → "Web Service"
2. Conecte seu repositório GitHub
3. Configure:
   - **Name:** `musiccollab-backend`
   - **Region:** Oregon (Free)
   - **Branch:** main
   - **Root Directory:** (deixe vazio)
   - **Environment:** Node
   - **Build Command:**
     ```bash
     cd server && npm ci && npm run build && npx prisma generate && npx prisma migrate deploy
     ```
   - **Start Command:**
     ```bash
     cd server && npm start
     ```
   - **Plan:** Free

4. **Adicione as variáveis de ambiente:**
   - `NODE_ENV` = `production`
   - `PORT` = `3001`
   - `DATABASE_URL` = [cole a URL do banco que você copiou]
   - `JWT_SECRET` = [gere uma chave aleatória segura]
   - `JWT_EXPIRES_IN` = `7d`
   - `SOCKET_CORS_ORIGIN` = `https://musiccollab-frontend.onrender.com` (você vai criar isso a seguir)
   - `UPLOAD_PATH` = `./uploads`
   - `MAX_FILE_SIZE` = `50000000`
   - `ALLOWED_AUDIO_TYPES` = `mp3,wav,flac,aac,m4a`

5. Clique em "Create Web Service"

6. **Copie a URL do backend** (algo como `https://musiccollab-backend.onrender.com`)

#### Passo 3: Deploy do Frontend

1. Dashboard → "New" → "Static Site"
2. Conecte seu repositório GitHub
3. Configure:
   - **Name:** `musiccollab-frontend`
   - **Region:** Oregon (Free)
   - **Branch:** main
   - **Root Directory:** (deixe vazio)
   - **Build Command:**
     ```bash
     cd client && npm ci && npm run build
     ```
   - **Publish Directory:**
     ```
     client/build
     ```

4. **Adicione as variáveis de ambiente:**
   - `REACT_APP_API_URL` = [cole a URL do backend que você copiou]
   - `REACT_APP_WS_URL` = [cole a URL do backend que você copiou]

5. Clique em "Create Static Site"

#### Passo 4: Atualizar CORS do Backend

1. Volte para o serviço do backend
2. Vá em "Environment"
3. Edite a variável `SOCKET_CORS_ORIGIN`
4. Cole a URL do frontend (algo como `https://musiccollab-frontend.onrender.com`)
5. Salve e aguarde o redeploy automático

## 🔑 Gerar JWT_SECRET Seguro

Use um destes métodos:

**Node.js:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**PowerShell:**
```powershell
-join ((65..90) + (97..122) + (48..57) | Get-Random -Count 64 | % {[char]$_})
```

**Online:**
- [randomkeygen.com](https://randomkeygen.com/)
- Use "CodeIgniter Encryption Keys" ou similar

## ✅ Verificar Deploy

1. **Verificar Backend:**
   ```
   GET https://musiccollab-backend.onrender.com/api/auth/health
   ```
   Deve retornar:
   ```json
   {
     "status": "OK",
     "timestamp": "...",
     "uptime": 123,
     "memory": { ... }
   }
   ```

2. **Verificar Frontend:**
   - Acesse `https://musiccollab-frontend.onrender.com`
   - A página inicial deve carregar
   - Tente fazer login/registro

3. **Verificar WebSocket:**
   - Abra o console do navegador (F12)
   - Verifique se há conexão Socket.IO
   - Procure por mensagens como: `Socket.IO connected`

## 🐛 Troubleshooting

### Erro: "Could not find a declaration file for module"

✅ **Resolvido:** Os tipos foram movidos para `dependencies` no `package.json`

### Erro: "Build failed - TypeScript errors"

1. Limpe o cache do Render:
   - Vá em Settings → "Clear build cache"
2. Force um novo deploy:
   - Settings → "Manual Deploy" → "Deploy latest commit"

### Erro: "Cannot connect to database"

1. Verifique a `DATABASE_URL`:
   - Deve começar com `postgresql://`
   - Deve conter usuário, senha, host, porta e database
2. Verifique se o banco está rodando:
   - Dashboard → PostgreSQL → Status deve ser "Available"

### Erro: "CORS blocked"

1. Verifique `SOCKET_CORS_ORIGIN` no backend
2. Deve conter a URL completa do frontend (com https://)
3. Sem barra no final: ❌ `https://app.com/` ✅ `https://app.com`

### Erro: "Service Unavailable" ou "503"

- Contas gratuitas hibernam após 15 min de inatividade
- O primeiro acesso após hibernação pode demorar 30-60 segundos
- Aguarde e recarregue a página

### Frontend não carrega imagens/assets

1. Verifique o `Publish Directory`: deve ser `client/build`
2. Verifique o build do React: `cd client && npm run build`
3. Certifique-se de que não há erros no build

## 📊 Monitoramento

### Logs do Backend
```
Dashboard → musiccollab-backend → Logs
```

### Logs do Build
```
Dashboard → musiccollab-backend → Events → Build Logs
```

### Métricas
```
Dashboard → Service → Metrics
```

## 🔄 Atualizar Deploy

### Automático (recomendado)
O Render faz deploy automático quando você faz push:
```bash
git add .
git commit -m "Atualização"
git push origin main
```

### Manual
1. Dashboard → Service
2. "Manual Deploy" → "Deploy latest commit"

## 💡 Dicas

1. **Use branches para testar:**
   ```bash
   git checkout -b test-deploy
   # faça mudanças
   git push origin test-deploy
   ```
   Configure um serviço separado no Render apontando para esta branch

2. **Configure notificações:**
   - Settings → Notifications
   - Adicione email ou Slack para alertas de deploy

3. **Monitore uso:**
   - Dashboard mostra horas usadas
   - Conta gratuita: 750 horas/mês
   - Suficiente para 1 serviço 24/7

4. **Logs em tempo real:**
   ```bash
   # Instale render CLI (opcional)
   npm install -g render
   render logs -f
   ```

## 🚫 Limitações da Conta Gratuita

- ⏰ **Sleep após 15 min** de inatividade
- 💾 **Database:** 1GB de armazenamento
- 📦 **Sem armazenamento persistente** de arquivos
  - Uploads de áudio serão perdidos no redeploy
  - **Solução:** Use Cloudinary ou AWS S3 para uploads
- 🌐 **750 horas/mês** por serviço
- 🔄 **Redeploys limitados** por dia

## 📈 Próximos Passos

1. **Configurar domínio personalizado** (opcional)
2. **Adicionar Cloudinary** para uploads de áudio persistentes
3. **Configurar CI/CD** com testes automáticos
4. **Adicionar monitoramento** (Sentry, LogRocket)
5. **Upgrade para plano pago** quando necessário

## 📞 Suporte

- **Render Docs:** https://render.com/docs
- **Render Community:** https://community.render.com
- **Issues do Projeto:** [GitHub Issues]

---

**Desenvolvido com ❤️ para o TCC de Erick dos Santos Martin**
