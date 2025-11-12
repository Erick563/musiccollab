# 🧪 Guia Rápido de Teste - Colaboração em Tempo Real

## Pré-requisitos

1. ✅ Servidor rodando: `npm run dev` (na raiz do projeto)
2. ✅ Banco de dados PostgreSQL ativo
3. ✅ Pelo menos 2 usuários cadastrados no sistema

## 🎯 Teste Rápido (5 minutos)

### Preparação

1. **Abra 2 navegadores diferentes** (ou janelas anônimas):
   - Navegador 1: Chrome
   - Navegador 2: Firefox/Edge

2. **Faça login com usuários diferentes**:
   - Navegador 1: `usuario1@example.com`
   - Navegador 2: `usuario2@example.com`

### Teste 1: Adicionar Colaborador ✅

**No Navegador 1 (Usuário 1 - Proprietário):**

1. Crie um novo projeto ou abra um existente
2. Faça upload de pelo menos 1 track de áudio
3. Clique no botão **"👥 Colaboradores"** na barra lateral
4. No painel que abrir:
   - Digite o email do Usuário 2: `usuario2@example.com`
   - Selecione "Colaborador"
   - Clique em "Adicionar"
5. ✅ Você deve ver uma mensagem de sucesso
6. ✅ O Usuário 2 deve aparecer na lista de colaboradores

### Teste 2: Acessar Projeto Compartilhado ✅

**No Navegador 2 (Usuário 2 - Colaborador):**

1. Vá para o Dashboard (`/dashboard`)
2. ✅ O projeto compartilhado pelo Usuário 1 deve aparecer na lista
3. Clique no projeto para abrir o Studio
4. ✅ Você deve ver as tracks que o Usuário 1 adicionou

### Teste 3: Usuários Online ✅

**Em ambos os navegadores:**

1. ✅ Na barra lateral, você deve ver: **"🟢 2 Online"**
2. ✅ Abaixo, uma lista mostrando:
   - Usuário 1
   - Usuário 2

### Teste 4: Cursores em Tempo Real ✅

**No Navegador 1:**
1. Mova o cursor na timeline clicando em diferentes posições

**No Navegador 2:**
1. ✅ Você deve ver o cursor do Usuário 1 se movendo na timeline
2. ✅ O cursor tem uma cor única e um label com o nome "Usuário 1"
3. ✅ O movimento é suave e em tempo real

**Agora inverta:**
- Mova o cursor no Navegador 2
- Verifique se aparece no Navegador 1

### Teste 5: Bloqueio de Edição ✅

**No Navegador 1:**
1. Clique em uma track para selecioná-la
2. Ajuste o **Volume** ou **Pan** (arraste o slider)
3. ✅ Você deve ver uma notificação: *"Você está editando esta track"*

**No Navegador 2 (simultaneamente):**
1. Tente editar a **mesma track**
2. ✅ Você deve ver uma notificação de ERRO: *"Esta track está sendo editada por Usuário 1"*
3. ✅ A track NÃO será editada

**Aguarde 3 segundos e tente novamente no Navegador 2:**
1. ✅ Agora você conseguirá editar (o bloqueio foi liberado)

### Teste 6: Indicador de Edição ✅

**No Navegador 1:**
1. Comece a editar uma track

**No Navegador 2:**
1. ✅ Na lista de "Usuários Online", ao lado do nome do Usuário 1, deve aparecer o ícone: **✏️**
2. ✅ Isso indica que o Usuário 1 está editando algo

### Teste 7: Desconexão e Reconexão ✅

**No Navegador 1:**
1. Feche a aba do Studio
2. Abra novamente o mesmo projeto

**No Navegador 2:**
1. ✅ Você deve ver o Usuário 1 sair (contador muda para "1 Online")
2. ✅ Quando o Usuário 1 voltar, contador volta para "2 Online"

## 🐛 Problemas Comuns

### Cursores não aparecem
- ✅ Verifique se ambos os usuários estão no **mesmo projeto**
- ✅ Verifique o console do navegador para erros de WebSocket
- ✅ Certifique-se que o servidor Socket.IO está rodando (porta 3001)

### Bloqueio não funciona
- ✅ Verifique se as tracks têm IDs válidos
- ✅ Certifique-se de que está editando (ajustando sliders, não apenas clicando)

### Usuário não aparece como online
- ✅ Verifique se o token JWT está válido
- ✅ Faça logout e login novamente
- ✅ Verifique logs do servidor

## 🔍 Verificação no Console

### Console do Navegador (F12)

**Conexão bem-sucedida:**
```
Conectado ao servidor de colaboração
```

**Entrou no projeto:**
```
Usuário [Nome] entrou no projeto [ID]
```

### Console do Servidor

**Conexão de usuário:**
```
Usuário conectado: [Nome] ([Socket ID])
```

**Entrada em projeto:**
```
Usuário [Nome] entrou no projeto [Project ID]
```

**Bloqueio de track:**
```
Track [ID] bloqueada por [Nome]
```

## ✅ Checklist Final

- [ ] 2 usuários logados em navegadores diferentes
- [ ] Colaborador adicionado com sucesso
- [ ] Ambos conseguem ver o projeto
- [ ] Contador "X Online" mostra ambos os usuários
- [ ] Cursores aparecem e se movem em tempo real
- [ ] Bloqueio de edição funciona corretamente
- [ ] Ícone de edição (✏️) aparece quando alguém está editando
- [ ] Desconexão/reconexão funciona

## 🎉 Sucesso!

Se todos os testes passaram, o sistema de colaboração está **funcionando perfeitamente**! 🚀

## 📞 Suporte

Se encontrar problemas:
1. Verifique os logs do servidor
2. Verifique o console do navegador (F12)
3. Certifique-se que o WebSocket está conectado
4. Verifique se o PostgreSQL está rodando
5. Reinicie o servidor se necessário

---

**Tempo estimado de teste:** 5-10 minutos  
**Dificuldade:** Fácil 😊

