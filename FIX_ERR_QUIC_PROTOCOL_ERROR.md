# Fix ERR_QUIC_PROTOCOL_ERROR

## Problema
Site mostrava erro "ERR_QUIC_PROTOCOL_ERROR" ao tentar acessar https://corretorparceria.com.br

## Causa
Navegador tentando forçar HTTPS mas servidor só tinha HTTP configurado (porta 443 fechada).

## Solução Aplicada (Backend)

### 1. Desativou "Always Use HTTPS" no Cloudflare
```bash
curl -X PATCH ".../settings/always_use_https"
  --data '{"value":"off"}'
```

### 2. Desativou SSL no Cloudflare
```bash
curl -X PATCH ".../settings/ssl"
  --data '{"value":"off"}'
```

### 3. Limpou cache do Cloudflare
```bash
curl -X POST ".../purge_cache"
  --data '{"purge_everything":true}'
```

## Solução no Navegador (Cliente)

### Opção 1: Limpar Cache do Navegador
**Chrome/Edge:**
1. Pressione `Ctrl + Shift + Delete`
2. Marque "Cookies e outros dados do site"
3. Marque "Imagens e arquivos armazenados em cache"
4. Clique em "Limpar dados"

### Opção 2: Limpar HSTS (Mais Efetivo)
**Chrome:**
1. Abra: `chrome://net-internals/#hsts`
2. Em "Delete domain security policies"
3. Digite: `corretorparceria.com.br`
4. Clique em "Delete"

**Edge:**
1. Abra: `edge://net-internals/#hsts`
2. Mesmos passos do Chrome

### Opção 3: Modo Anônimo
1. Abra janela anônima/privativa
2. Acesse: http://corretorparceria.com.br
3. (não use https:// na URL)

### Opção 4: Forçar HTTP na URL
Digite EXATAMENTE:
```
http://corretorparceria.com.br
```
(sem "s" no http)

## Teste Rápido
```bash
curl -I http://corretorparceria.com.br/
# Deve retornar: HTTP/1.1 200 OK
```

## Próximos Passos (Opcional)
Para habilitar HTTPS corretamente:
1. Instalar Certbot no servidor
2. Gerar certificado Let's Encrypt
3. Configurar nginx com SSL
4. Reativar SSL no Cloudflare (modo "Full")

