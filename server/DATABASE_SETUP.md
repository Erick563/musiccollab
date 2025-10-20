# 🗄️ Configuração do Banco de Dados PostgreSQL

Este guia te ajudará a configurar o banco de dados PostgreSQL para o projeto MusicCollab.

## 📋 Pré-requisitos

### 1. Instalar PostgreSQL

#### Windows:
1. Baixe o PostgreSQL em: https://www.postgresql.org/download/windows/
2. Execute o instalador e siga as instruções
3. Anote a senha do usuário `postgres` que você definir
4. Certifique-se de que o PostgreSQL está rodando na porta 5432

#### macOS:
```bash
# Usando Homebrew
brew install postgresql
brew services start postgresql

# Ou usando Postgres.app
# Baixe em: https://postgresapp.com/
```

#### Linux (Ubuntu/Debian):
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
sudo systemctl enable postgresql
```

### 2. Criar o Banco de Dados

Abra o terminal/prompt e execute:

```bash
# Conectar ao PostgreSQL
psql -U postgres

# Criar o banco de dados
CREATE DATABASE musiccollab;

# Sair do psql
\q
```

## 🚀 Configuração Rápida

### Opção 1: Script Automático (Recomendado)

```bash
cd server
node setup-database.js
```

Este script irá:
- ✅ Criar o arquivo `.env` se não existir
- ✅ Gerar o cliente Prisma
- ✅ Executar as migrations
- ✅ Popular o banco com dados iniciais

### Opção 2: Configuração Manual

1. **Criar arquivo .env:**
```bash
cd server
cp config.example.env .env
```

2. **Editar as configurações no .env:**
```env
DATABASE_URL="postgresql://postgres:SUA_SENHA@localhost:5432/musiccollab?schema=public"
```

3. **Executar comandos do Prisma:**
```bash
npm run db:generate    # Gerar cliente Prisma
npm run db:migrate     # Criar tabelas
npm run db:seed        # Popular com dados iniciais
```

## 🔧 Comandos Úteis

```bash
# Visualizar banco de dados
npm run db:studio

# Resetar banco (CUIDADO: apaga todos os dados)
npm run db:reset

# Criar nova migration
npm run db:migrate

# Aplicar migrations em produção
npm run db:deploy
```

## 📊 Estrutura do Banco

O banco possui as seguintes tabelas principais:

- **users** - Usuários da plataforma
- **projects** - Projetos musicais
- **project_collaborators** - Colaboradores dos projetos
- **tracks** - Faixas de áudio
- **messages** - Mensagens dos projetos
- **notifications** - Notificações dos usuários

## 🔐 Dados de Teste

Após executar o seed, você terá os seguintes usuários de teste:

| Email | Username | Senha |
|-------|----------|-------|
| admin@musiccollab.com | admin | 123456 |
| musician@musiccollab.com | musician | 123456 |
| producer@musiccollab.com | producer | 123456 |

## ❌ Solução de Problemas

### Erro de Conexão
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**Solução:** Verifique se o PostgreSQL está rodando:
```bash
# Windows
services.msc (procure por PostgreSQL)

# macOS
brew services list | grep postgresql

# Linux
sudo systemctl status postgresql
```

### Erro de Autenticação
```
Error: password authentication failed
```
**Solução:** Verifique a senha no arquivo `.env`

### Banco não existe
```
Error: database "musiccollab" does not exist
```
**Solução:** Crie o banco manualmente:
```sql
CREATE DATABASE musiccollab;
```

### Porta em uso
```
Error: listen EADDRINUSE :::5432
```
**Solução:** Verifique se outro processo está usando a porta 5432

## 🔄 Backup e Restore

### Fazer Backup
```bash
pg_dump -U postgres musiccollab > backup.sql
```

### Restaurar Backup
```bash
psql -U postgres musiccollab < backup.sql
```

## 📚 Recursos Adicionais

- [Documentação do Prisma](https://www.prisma.io/docs/)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Prisma Studio](https://www.prisma.io/studio)

---

💡 **Dica:** Use `npm run db:studio` para uma interface visual do seu banco de dados!
