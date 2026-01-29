# Integração Serasa Score

## Status Atual
⚠️ **OPCIONAL** - Sem créditos disponíveis na API

## Descrição
Consulta score de crédito via API Brasil (gateway.apibrasil.io)

## Endpoint
```
POST /api/cpf-score
Body: { "cpf": "12345678900" }
```

## Resposta (quando com créditos)
```json
{
  "cpf": "12345678900",
  "nome": "João Silva",
  "score": 650,
  "risco": "Bom",
  "probabilidade": "12%",
  "dataConsulta": "2025-01-29T..."
}
```

## Status HTTP
- **200**: Consulta realizada com sucesso
- **402**: Sem créditos disponíveis (Payment Required)
- **400**: CPF inválido
- **500**: Erro na API externa

## Comportamento Atual
1. Endpoint implementado e funcional
2. Retorna **402** quando não há créditos
3. Frontend deve tratar 402 como "recurso indisponível"
4. Não impacta outras funcionalidades do sistema

## Como Ativar
1. Adicionar créditos na API Brasil (gateway.apibrasil.io)
2. Verificar token no código: `app/api/cpf-score/route.ts`
3. Testar: `curl -X POST http://localhost:3000/api/cpf-score -H "Content-Type: application/json" -d '{"cpf":"12345678900"}'`

## Uso Recomendado
- **Opcional**: Não obrigatório para fluxo de leads
- **Nice-to-have**: Enriquece qualificação de leads
- **Alternativa**: Usar validação manual ou outro provedor

## Custos
- Verificar planos em: https://apibrasil.io
- Consulta unitária: ~R$ 0,50 - R$ 2,00
- Pacotes: podem reduzir custo unitário

## Implementação Frontend
```typescript
try {
  const res = await fetch('/api/cpf-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpf })
  });

  if (res.status === 402) {
    // Serviço indisponível - continuar sem score
    console.warn('Serasa: sem créditos disponíveis');
    return null;
  }

  if (res.ok) {
    const data = await res.json();
    return data.score;
  }
} catch (error) {
  // Falha silenciosa - não bloqueia o fluxo
  console.error('Serasa error:', error);
  return null;
}
```

## Configuração
Token configurado em: `app/api/cpf-score/route.ts` (linha ~15)
```typescript
const APIBRASIL_TOKEN = 'seu-token-aqui';
```

## Monitoramento
- Endpoint testado em: `test-integracoes.mjs`
- Status atual registrado em logs
- Não gera alerta crítico (é opcional)

## Próximos Passos (se ativar)
1. [ ] Adicionar créditos na API Brasil
2. [ ] Testar com CPF real
3. [ ] Atualizar frontend para exibir score
4. [ ] Implementar cache de consultas (evitar duplicatas)
5. [ ] Adicionar rate limiting (evitar estouro de créditos)

---

**Última atualização**: 2025-01-29  
**Responsável**: Sistema de Integrações
