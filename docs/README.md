# Corretor de Imóveis App

*Automatically synced with your [v0.app](https://v0.app) deployments*

[![Deployed on Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-black?style=for-the-badge&logo=vercel)](https://vercel.com/saraivas-projects-d1af0944/v0-corretor-de-imoveis-app)
[![Built with v0](https://img.shields.io/badge/Built%20with-v0.app-black?style=for-the-badge)](https://v0.app/chat/p1v3mjVZ0VF)

## Overview

Sistema completo de gestão imobiliária com IA conversacional para WhatsApp, incluindo:
- 🤖 **Bot Conversacional Inteligente** - Qualificação automática de leads via WhatsApp
- 📊 **Dashboard de Vendas** - Acompanhamento em tempo real
- 💬 **CRM Integrado** - Gestão completa de leads e oportunidades
- 📱 **WhatsApp Business Integration** - Comunicação direta com clientes

This repository will stay in sync with your deployed chats on [v0.app](https://v0.app).
Any changes you make to your deployed app will be automatically pushed to this repository from [v0.app](https://v0.app).

## Deployment

Your project is live at:

**[https://vercel.com/saraivas-projects-d1af0944/v0-corretor-de-imoveis-app](https://vercel.com/saraivas-projects-d1af0944/v0-corretor-de-imoveis-app)**

## Build your app

Continue building your app on:

**[https://v0.app/chat/p1v3mjVZ0VF](https://v0.app/chat/p1v3mjVZ0VF)**

## 🤖 AI Conversacional para WhatsApp

Sistema inteligente de qualificação e nutrição de leads via WhatsApp Business.

### Recursos Principais

- ✅ **Qualificação Automática** - IA identifica leads quentes, mornos e frios
- ✅ **Conversação Natural** - Bot conversa como humano, nunca parece robótico
- ✅ **Handoff Inteligente** - Transfere para corretor no momento certo
- ✅ **Score de Lead** - Classificação automática 0-100 pontos
- ✅ **Alertas em Tempo Real** - Corretores recebem notificações de leads quentes
- ✅ **Nutrição Automatizada** - Follow-ups programados sem intervenção manual

### Documentação

- 📖 [Guia Completo da IA Conversacional](docs/AI_CONVERSACIONAL_WHATSAPP.md) - Documentação detalhada
- 🚀 [Guia Rápido](docs/GUIA_RAPIDO_IA.md) - Referência rápida para equipe
- 💻 [Exemplos de Código](lib/whatsapp-bot-example.ts) - Como integrar e usar

### Quick Start

```typescript
import { WhatsAppBot } from '@/lib/whatsapp-bot-logic';

// Processar mensagem do lead
const response = WhatsAppBot.generateBotResponse(state, message);

// Verificar se deve passar pro corretor
const { should, reason } = WhatsAppBot.shouldHandoffToCorretor(state, message);

// Calcular score do lead
const score = WhatsAppBot.calculateLeadScore(context);
// { total: 95, temperature: 'hot', factors: {...} }
```

### Classificação de Leads

| Temperatura | Score | Ação |
|-------------|-------|------|
| 🔥 Quente | 86-100 | Passar IMEDIATO para corretor |
| 🟡 Morno | 61-85 | Nutrir 2-3 dias → Passar |
| 🔵 Frio | 31-60 | Nutrir até 7 dias |
| ❄️ Congelado | 0-30 | Pausar contato |

## How It Works

1. Create and modify your project using [v0.app](https://v0.app)
2. Deploy your chats from the v0 interface
3. Changes are automatically pushed to this repository
4. Vercel deploys the latest version from this repository

## 📚 Additional Documentation

- [WhatsApp Complete Guide](WHATSAPP_COMPLETE_GUIDE.md)
- [Evolution WhatsApp Integration](EVOLUTION_WHATSAPP_GUIDE.md)
- [Multi-Tenant Guide](MULTI_TENANT_GUIDE.md)
