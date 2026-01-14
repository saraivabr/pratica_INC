
# Create a mermaid flowchart for the conversational AI flow
diagram_code = """
flowchart TD
    Start([Cliente chega ao WhatsApp]) --> Bot[Bot saúda e pergunta interesse]
    
    Bot --> Op1[Entrada Acessível]
    Bot --> Op2[Próximo Metrô]
    Bot --> Op3[Lazer Premium]
    Bot --> Op4[Alto Padrão]
    Bot --> Op5[Outras opções]
    
    Op1 --> Prod1[Colatinna/Aura]
    Op2 --> Prod2[Aura/Colatinna]
    Op3 --> Prod3[Giardino]
    Op4 --> Prod4[Alta Floresta]
    Op5 --> Bot
    
    Prod1 --> Det1[Detalhes do imóvel]
    Prod2 --> Det2[Detalhes do imóvel]
    Prod3 --> Det3[Detalhes do imóvel]
    Prod4 --> Det4[Detalhes do imóvel]
    
    Det1 --> Fin1[Financiamento]
    Det2 --> Fin2[Financiamento]
    Det3 --> Fin3[Financiamento]
    Det4 --> Fin4[Financiamento]
    
    Fin1 --> Agend[Agendamento]
    Fin2 --> Agend
    Fin3 --> Agend
    Fin4 --> Agend
    
    Agend --> Coleta[Coleta dados e confirma]
    
    Coleta --> Decision{Necessário<br/>escalar?}
    Decision -->|Sim| Vendedor[Vendedor humano]
    Decision -->|Não| Fim([Processo concluído])
    
    Vendedor --> Followup[Follow-up]
    Followup --> Fim
"""

# Create and save the mermaid diagram
create_mermaid_diagram(diagram_code, 'ai_flow.png', 'ai_flow.svg', width=1400, height=1000)
