# Fix Cloudflare 404 - DEPLOYMENT_NOT_FOUND

## Problema
Site mostrava erro 404 com código `DEPLOYMENT_NOT_FOUND` ao acessar corretorparceria.com.br

## Causa
DNS estava com proxy Cloudflare ativado (proxied: true), fazendo o tráfego passar pelo cache do Cloudflare que tentava servir um deployment antigo do Pages que não existe mais.

## Solução Aplicada

### 1. Desativou Proxy do Cloudflare
```bash
# Registro principal
proxied: true → false para corretorparceria.com.br

# Registro www
proxied: true → false para www.corretorparceria.com.br
```

### 2. Limpou Cache do Cloudflare
```bash
curl -X POST "https://api.cloudflare.com/client/v4/zones/{ZONE_ID}/purge_cache"
  --data '{"purge_everything":true}'
```

### 3. Confirmou Configuração Nginx
O nginx já estava configurado corretamente em `/etc/nginx/sites-enabled/pratica`:
- server_name: corretorparceria.com.br www.corretorparceria.com.br
- proxy_pass: http://127.0.0.1:3000 (Next.js)

### 4. Recarregou Nginx
```bash
systemctl reload nginx
```

## Resultado
✅ http://corretorparceria.com.br → Funcionando (200 OK)
✅ http://www.corretorparceria.com.br → Funcionando (200 OK)
✅ Sem mais erros DEPLOYMENT_NOT_FOUND
✅ Landing page carregando corretamente
✅ Login/cadastro funcionando

## Configuração Atual
- **DNS**: Cloudflare (DNS Only, sem proxy)
- **Servidor**: 185.182.184.122
- **Nginx**: Proxy reverso na porta 80 → Next.js porta 3000
- **SSL**: Desativado (pode ser configurado depois com Certbot)

## Próximos Passos (Opcional)
1. Configurar SSL/HTTPS com Let's Encrypt (certbot)
2. Reativar proxy do Cloudflare (após SSL configurado)
3. Configurar HTTPS obrigatório

