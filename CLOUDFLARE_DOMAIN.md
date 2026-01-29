# Domínio Cloudflare - corretorparceria.com.br

## ⚠️ Status Atual

**Erro:** `Application error: a client-side exception has occurred`

## 🔍 Causa

O domínio `corretorparceria.com.br` está hospedado no **Cloudflare** com código **desatualizado** (antes das mudanças 100/100).

Typo no código antigo:
```typescript
// ❌ Errado (código antigo no Cloudflare)
return () => cancelFrameRequest(animationFrame)

// ✅ Correto (servidor próprio - já corrigido)
return () => cancelAnimationFrame(animationFrame)
```

## ✅ Servidor Próprio Funcionando

**URL principal:** `http://185.182.184.122:3000/`  
**Status:** ✅ Online e funcionando perfeitamente

Landing page premium ativa com:
- Framer Motion
- Parallax smooth
- Counter animations
- Glassmorphism
- Scroll reveal
- Responsivo total

## 🚀 Solução

### Opção 1: Fazer Deploy no Cloudflare (Recomendado)
Para atualizar `corretorparceria.com.br`:

1. **Acesso ao Cloudflare Pages/Workers necessário**
2. Deploy do código atual (`main` branch)
3. Build commands:
   ```bash
   pnpm install
   pnpm build
   ```
4. Environment variables necessárias:
   - `NEXT_PUBLIC_API_URL`
   - `DATABASE_URL`
   - `EVOLUTION_WEBHOOK_SECRET`
   - Etc. (ver `.env.production`)

### Opção 2: Redirecionar Domínio
Configurar DNS do `corretorparceria.com.br` para apontar pro servidor próprio:
```
A record: 185.182.184.122
```

### Opção 3: Desativar Domínio
Se não for mais usado, desativar `corretorparceria.com.br` e usar apenas servidor próprio.

## 📝 Commit da Correção

**Hash:** `3505af8c9`  
**Mensagem:** `fix: corrige typo cancelFrameRequest → cancelAnimationFrame`  
**Data:** 29/01/2026

## 🎯 Próximos Passos

1. Decidir qual opção seguir (deploy, redirect ou desativar)
2. Se deploy: Configurar CI/CD Cloudflare → GitHub
3. Se redirect: Atualizar DNS
4. Se desativar: Comunicar usuários sobre nova URL

---

**Nota:** Servidor próprio (185.182.184.122:3000) está 100% funcional e com código atualizado.
