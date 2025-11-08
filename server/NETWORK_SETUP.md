# 🌐 Configuração para Acesso na Rede Local

Este guia explica como configurar o servidor para ser acessível de outras máquinas na mesma rede local.

## 📋 Pré-requisitos

- O servidor deve estar rodando na máquina servidor
- As máquinas cliente devem estar na mesma rede local conectadas ao mesmo modem/roteador
- **Importante:** Não importa se uma máquina está conectada por cabo (Ethernet) e outra por Wi-Fi - ambas podem se comunicar desde que estejam na mesma rede local (mesmo roteador/modem)
- Firewall configurado para permitir conexões na porta do servidor

## 🔧 Configuração do Servidor

### 1. Configurar Variáveis de Ambiente

Crie um arquivo `.env` na pasta `server/` baseado no `env.example`:

```env
NODE_ENV=development
PORT=3001
HOST=0.0.0.0  # Importante: permite acesso de todas as interfaces de rede

# ... outras configurações
```

### 2. Descobrir o IP da Máquina Servidor

**Windows:**
```powershell
ipconfig
```
Procure por "IPv4 Address" na interface de rede ativa (geralmente algo como `192.168.1.100`)

**Linux/Mac:**
```bash
ip addr show
# ou
ifconfig
```

### 3. Preparar o Frontend

Antes de iniciar o servidor, faça o build do React:

```bash
# Na raiz do projeto
cd client
npm run build
```

**Importante:** Configure o `.env` do cliente com o IP do servidor antes do build:
```env
REACT_APP_API_URL=http://192.168.1.100:3001/api
REACT_APP_SOCKET_URL=http://192.168.1.100:3001
```

### 4. Iniciar o Servidor

**Modo Produção (Recomendado para acesso na rede):**
```bash
cd server
# Configure NODE_ENV=production no .env
npm run build
npm start
```

**Modo Desenvolvimento:**
```bash
cd server
npm run dev
```

O servidor irá exibir no console todos os IPs onde está acessível, por exemplo:
```
🚀 Servidor rodando na porta 3001
🌐 Acessível em:
   - http://localhost:3001
   - http://127.0.0.1:3001
   - http://192.168.1.100:3001
📡 Socket.IO configurado
```

**Em modo produção, acesse `http://IP_DO_SERVIDOR:3001` de qualquer máquina na rede para ver a aplicação completa!**

## 💻 Configuração do Frontend (Recomendado: Servir pelo Próprio Servidor)

**✅ Você NÃO precisa ter o código do cliente em outro computador!**

A melhor abordagem é fazer o build do React e servir os arquivos estáticos através do próprio servidor Express. Assim, qualquer máquina na rede pode acessar a aplicação completa apenas digitando o IP do servidor no navegador.

### Passo a Passo:

1. **Fazer o build do React:**
```bash
cd client
npm run build
```

2. **Configurar o cliente para usar o IP do servidor:**

Crie um arquivo `.env` na pasta `client/` antes de fazer o build:

```env
REACT_APP_API_URL=http://192.168.1.100:3001/api
REACT_APP_SOCKET_URL=http://192.168.1.100:3001
```

**Substitua `192.168.1.100` pelo IP da máquina servidor!**

3. **Iniciar o servidor em modo produção:**

```bash
cd server
# Configure NODE_ENV=production no .env
npm run build
npm start
```

4. **Acessar de qualquer máquina na rede:**

Abra o navegador em qualquer máquina da rede e acesse:
```
http://192.168.1.100:3001
```

A aplicação completa (frontend + backend) estará disponível!

### ⚠️ Modo Desenvolvimento (Alternativa)

Se você quiser rodar o cliente separadamente durante desenvolvimento (não recomendado para acesso remoto):

1. Crie um arquivo `.env` na pasta `client/`:
```env
REACT_APP_API_URL=http://192.168.1.100:3001/api
REACT_APP_SOCKET_URL=http://192.168.1.100:3001
```

2. Inicie o servidor de desenvolvimento:
```bash
cd client
npm start
```

**Nota:** O React em modo desenvolvimento roda na porta 3000 por padrão e só é acessível localmente. Para acesso remoto, você precisaria configurar `HOST=0.0.0.0` no `.env` do cliente, mas isso não é recomendado. Use a abordagem de build + servidor Express.

## 🔥 Configuração do Firewall

### 📍 Passo 1: Verificar se a Porta Está Escutando

Antes de configurar o firewall, verifique se o servidor está realmente escutando na porta:

**Windows (PowerShell):**
```powershell
# Verificar se a porta 3001 está em uso
netstat -an | findstr :3001

# Ou verificar processos usando a porta
Get-NetTCPConnection -LocalPort 3001

# Ver todas as portas em uso
netstat -ano | findstr LISTENING
```

**Linux/Mac:**
```bash
# Verificar se a porta 3001 está em uso
lsof -i :3001
# ou
netstat -tuln | grep :3001
# ou
ss -tuln | grep :3001
```

Se o servidor estiver rodando, você verá algo como:
```
TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
```

### 🔓 Passo 2: Abrir a Porta no Firewall

#### Windows

**Método 1: Interface Gráfica (Recomendado para iniciantes)**

1. Abra o "Firewall do Windows Defender"
   - Pressione `Win + R`, digite `wf.msc` e pressione Enter
   - Ou procure por "Firewall do Windows Defender" no menu Iniciar
2. Clique em "Configurações Avançadas" (no painel esquerdo)
3. Clique em "Regras de Entrada" → "Nova Regra" (no painel direito)
4. Selecione "Porta" → Próximo
5. Selecione "TCP" e digite a porta (ex: `3001`) → Próximo
6. Selecione "Permitir a conexão" → Próximo
7. Marque todos os perfis (Domínio, Privado, Público) → Próximo
8. Dê um nome (ex: "MusicCollab Server") → Concluir

**Método 2: PowerShell (Rápido - Execute como Administrador)**

Abra o PowerShell como Administrador (clique com botão direito → "Executar como administrador"):

```powershell
# Criar regra para permitir porta 3001
New-NetFirewallRule -DisplayName "MusicCollab Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Verificar se a regra foi criada
Get-NetFirewallRule -DisplayName "MusicCollab Server"
```

**Método 3: Verificar Regras Existentes**

```powershell
# Listar todas as regras de entrada
Get-NetFirewallRule -Direction Inbound | Where-Object {$_.Enabled -eq $true} | Format-Table DisplayName, Direction, Action

# Verificar regras específicas da porta 3001
Get-NetFirewallPortFilter | Where-Object {$_.LocalPort -eq 3001}
```

#### Linux (UFW)

```bash
# Permitir porta 3001
sudo ufw allow 3001/tcp

# Verificar status
sudo ufw status

# Recarregar regras
sudo ufw reload
```

#### Mac

1. Abra "Preferências do Sistema" → "Segurança e Privacidade" → "Firewall"
2. Clique no cadeado e digite sua senha
3. Clique em "Opções do Firewall"
4. Clique no "+" e adicione o Node.js ou permita conexões de entrada na porta 3001

## ✅ Testando a Conexão

### 🔍 Passo 3: Verificar se a Porta Está Acessível

#### Teste Local (Na Máquina do Servidor)

**Windows (PowerShell):**
```powershell
# Testar se o servidor responde localmente
Invoke-WebRequest -Uri http://localhost:3001/api/auth/test

# Ou testar com o IP da rede local
Invoke-WebRequest -Uri http://192.168.1.100:3001/api/auth/test
```

**Linux/Mac:**
```bash
# Testar localmente
curl http://localhost:3001/api/auth/test

# Ou testar com o IP da rede local
curl http://192.168.1.100:3001/api/auth/test
```

#### Teste Remoto (De Outra Máquina na Rede)

**Do Navegador:**
1. Abra um navegador em outra máquina da rede
2. Acesse: `http://IP_DO_SERVIDOR:3001/api/auth/test`
   - Exemplo: `http://192.168.1.100:3001/api/auth/test`
3. Se retornar uma resposta JSON, a conexão está funcionando!

**Do Terminal/PowerShell:**

**Windows (PowerShell):**
```powershell
# Testar conexão remota
Invoke-WebRequest -Uri http://192.168.1.100:3001/api/auth/test

# Ou testar apenas se a porta está aberta (sem fazer requisição HTTP)
Test-NetConnection -ComputerName 192.168.1.100 -Port 3001
```

**Linux/Mac:**
```bash
# Testar conexão HTTP
curl http://192.168.1.100:3001/api/auth/test

# Ou testar apenas se a porta está aberta
telnet 192.168.1.100 3001
# ou
nc -zv 192.168.1.100 3001
```

### ✅ Checklist: Porta Está Aberta?

Use este checklist para garantir que tudo está configurado:

- [ ] Servidor está rodando (verifique o console)
- [ ] Porta está escutando (comando `netstat` ou `lsof`)
- [ ] Regra do firewall foi criada
- [ ] Teste local funciona (`localhost:3001`)
- [ ] Teste remoto funciona (`IP_DO_SERVIDOR:3001`)

## 🐛 Solução de Problemas

### ❓ Pergunta Frequente: Cabo vs Wi-Fi

**Pergunta:** Se meu servidor está conectado por cabo e o cliente por Wi-Fi (ou vice-versa), funciona?

**Resposta:** ✅ **SIM, funciona perfeitamente!** 

Desde que ambos os dispositivos estejam conectados ao mesmo modem/roteador, não importa se:
- Um está por cabo (Ethernet) e outro por Wi-Fi
- Ambos estão por cabo
- Ambos estão por Wi-Fi

O importante é que estejam na **mesma rede local** (mesma sub-rede IP, geralmente `192.168.x.x` ou `10.x.x.x`). O roteador/modem gerencia a comunicação entre todos os dispositivos conectados a ele, independentemente do tipo de conexão.

### 🔴 Erro: TcpTestSucceeded = False (Conexão TCP Falhou)

Se o `Test-NetConnection` mostra `TcpTestSucceeded: False`, siga estes passos **na máquina servidor** (`192.168.0.102`):

#### ✅ Passo 1: Verificar se o Servidor Está Rodando

**Na máquina servidor (`192.168.0.102`), execute:**
```powershell
# Verificar se a porta 3001 está escutando
netstat -an | findstr :3001

# Ou ver processos usando a porta
Get-NetTCPConnection -LocalPort 3001
```

**O que procurar:**
- Se aparecer algo como `TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING` → ✅ Servidor está rodando corretamente
- Se aparecer `TCP    127.0.0.1:3001` ou `TCP    [::1]:3001` → ❌ Servidor só está escutando em localhost
- Se não aparecer nada → ❌ Servidor não está rodando

#### ✅ Passo 2: Verificar Configuração do HOST

**Na máquina servidor, verifique o arquivo `.env` em `server/.env`:**
```env
HOST=0.0.0.0  # ✅ CORRETO - aceita conexões de qualquer interface
PORT=3001
```

**Se estiver assim, está ERRADO:**
```env
HOST=localhost  # ❌ ERRADO - só aceita conexões locais
# ou
HOST=127.0.0.1  # ❌ ERRADO - só aceita conexões locais
```

**Se estiver errado, corrija e reinicie o servidor!**

#### ✅ Passo 3: Verificar e Configurar Firewall na Máquina Servidor

**Na máquina servidor (`192.168.0.102`), execute como Administrador:**

**Opção A: Verificar e Criar Regra (se não existir)**
```powershell
# Verificar se existe regra para a porta 3001
Get-NetFirewallPortFilter | Where-Object {$_.LocalPort -eq 3001}

# Se não aparecer nada, criar a regra:
New-NetFirewallRule -DisplayName "MusicCollab Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# Verificar se foi criada
Get-NetFirewallRule -DisplayName "MusicCollab Server"
```

**Opção B: Remover Regras Existentes e Criar Nova (Limpar e Recriar)**
```powershell
# 1. Listar todas as regras relacionadas à porta 3001
Get-NetFirewallRule | Where-Object {
    $portFilter = $_ | Get-NetFirewallPortFilter
    $portFilter.LocalPort -eq 3001
}

# 2. Remover TODAS as regras existentes da porta 3001 (método mais confiável)
Get-NetFirewallRule | Where-Object {
    $portFilter = $_ | Get-NetFirewallPortFilter
    $portFilter.LocalPort -eq 3001
} | Remove-NetFirewallRule

# 3. Verificar se foram removidas (não deve aparecer nada)
Get-NetFirewallRule | Where-Object {
    $portFilter = $_ | Get-NetFirewallPortFilter
    $portFilter.LocalPort -eq 3001
}

# 4. Criar nova regra limpa
New-NetFirewallRule -DisplayName "MusicCollab Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow

# 5. Verificar se foi criada corretamente
Get-NetFirewallRule -DisplayName "MusicCollab Server"
```

**Alternativa Simples (se a Opção B der erro):**
```powershell
# Remover regra específica por nome (se você criou antes)
Remove-NetFirewallRule -DisplayName "MusicCollab Server" -ErrorAction SilentlyContinue

# Remover outras possíveis regras da porta 3001 manualmente
# Primeiro, liste para ver os nomes:
Get-NetFirewallRule | Where-Object {
    $portFilter = $_ | Get-NetFirewallPortFilter
    $portFilter.LocalPort -eq 3001
} | Select-Object DisplayName, Name

# Depois remova pelos nomes que apareceram acima (substitua "NomeDaRegra"):
# Remove-NetFirewallRule -Name "NomeDaRegra" -ErrorAction SilentlyContinue

# Criar nova regra limpa
New-NetFirewallRule -DisplayName "MusicCollab Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

**Opção C: Remover Regra Específica por Nome**
```powershell
# Remover regra específica (se você souber o nome exato)
Remove-NetFirewallRule -DisplayName "MusicCollab Server" -ErrorAction SilentlyContinue

# Criar nova regra
New-NetFirewallRule -DisplayName "MusicCollab Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
```

#### ✅ Passo 4: Teste Local na Máquina Servidor

**Na máquina servidor (`192.168.0.102`), teste localmente:**
```powershell
# Teste com localhost
Invoke-WebRequest -Uri http://localhost:3001/api/auth/test

# Teste com o IP da rede local
Invoke-WebRequest -Uri http://192.168.0.102:3001/api/auth/test
```

**Se funcionar localmente mas não remotamente:**
- Problema é no firewall → volte ao Passo 3
- Problema é no HOST → volte ao Passo 2

#### ✅ Passo 5: Verificar se o Servidor Está Escutando em 0.0.0.0

**Na máquina servidor, execute:**
```powershell
netstat -an | findstr :3001
```

**Deve mostrar:**
```
TCP    0.0.0.0:3001    0.0.0.0:0    LISTENING
```

**Se mostrar `127.0.0.1:3001` ou `[::1]:3001`:**
- O servidor está escutando apenas em localhost
- Verifique o `.env` e certifique-se de que `HOST=0.0.0.0`
- Reinicie o servidor após alterar

### Erro: "Network Error" ou "Connection Refused"

1. **Verifique se o servidor está rodando** na máquina servidor
   ```powershell
   # Windows
   netstat -an | findstr :3001
   
   # Linux/Mac
   lsof -i :3001
   ```

2. **Verifique o IP** - use o IP mostrado no console do servidor
   ```powershell
   # Windows
   ipconfig
   
   # Linux/Mac
   ip addr show
   ```

3. **Verifique o firewall** - certifique-se de que a porta está aberta
   ```powershell
   # Windows - Verificar regras do firewall
   Get-NetFirewallRule -DisplayName "MusicCollab Server"
   Get-NetFirewallPortFilter | Where-Object {$_.LocalPort -eq 3001}
   
   # Se não existir, crie a regra:
   New-NetFirewallRule -DisplayName "MusicCollab Server" -Direction Inbound -LocalPort 3001 -Protocol TCP -Action Allow
   ```

4. **Teste a conectividade da porta**
   ```powershell
   # Windows - De outra máquina
   Test-NetConnection -ComputerName 192.168.1.100 -Port 3001
   
   # Linux/Mac - De outra máquina
   nc -zv 192.168.1.100 3001
   ```

5. **Verifique a rede** - ambas as máquinas devem estar na mesma rede (mesmo roteador/modem)
   - Ambos devem ter IPs na mesma faixa (ex: `192.168.0.x` - note que ambos estão em `192.168.0.x`)
   - Ambos devem estar conectados ao mesmo roteador/modem

6. **Verifique o tipo de conexão** - cabo e Wi-Fi funcionam juntos, desde que conectados ao mesmo roteador

7. **Verifique se o servidor está escutando em 0.0.0.0**
   - No arquivo `.env` do servidor, certifique-se de que `HOST=0.0.0.0`
   - Se estiver como `localhost` ou `127.0.0.1`, não aceitará conexões externas

### Erro CORS no Navegador

O servidor já está configurado para aceitar requisições da rede local automaticamente. Se ainda assim houver erro:

1. Verifique se está usando o IP correto (não `localhost`)
2. Verifique se a variável `SOCKET_CORS_ORIGIN` no `.env` do servidor inclui o IP do cliente

### Socket.IO não conecta

Certifique-se de que a variável `REACT_APP_SOCKET_URL` no cliente aponta para o IP correto do servidor.

## 📝 Notas Importantes

- O IP pode mudar se a máquina se reconectar à rede (DHCP)
- Para IP fixo, configure um IP estático na máquina servidor
- Em produção, considere usar um domínio e HTTPS
- O servidor aceita automaticamente conexões de IPs da rede local (192.168.x.x, 10.x.x.x, 172.16-31.x.x)

## 🔒 Segurança

⚠️ **Atenção**: Esta configuração permite acesso na rede local. Para produção:

- Use HTTPS
- Configure autenticação adequada
- Considere usar um proxy reverso (nginx, Apache)
- Limite o acesso por IP se necessário
- Use variáveis de ambiente para configurações sensíveis

