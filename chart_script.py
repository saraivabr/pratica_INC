
# Create a comprehensive flowchart for the SDR system architecture
diagram_code = """
flowchart TB
    %% Input Section (Blue)
    FB[Facebook Ads]:::inputStyle
    LEAD[Lead Ads Form<br/>t=0s]:::inputStyle
    
    %% Processing Section (Green)
    SERVER[Seu Servidor<br/>Baileys/WhatsmeOW/Go<br/>t=1-2s]:::processStyle
    BOT[WhatsApp Bot<br/>Resposta Automática<br/>t=3-5s]:::processStyle
    
    %% Management (Green)
    CRM[CRM Dashboard<br/>Monitoramento<br/>t=tempo real]:::processStyle
    
    %% Decision Point (Orange)
    DECISION{Necessita<br/>Intervenção?<br/>t=30s-3min}:::decisionStyle
    
    %% Human Operation (Orange)
    SDR[SDR Humano<br/>Takeover<br/>t menor 5min]:::operationStyle
    
    %% Result (Red)
    RESULT[Agendamento<br/>de Visita<br/>Confirmado]:::resultStyle
    
    %% Documentation Files
    DOC1[📄 setup.md]:::docStyle
    DOC2[📄 api-docs.md]:::docStyle
    DOC3[📄 bot-config.md]:::docStyle
    DOC4[📄 crm-guide.md]:::docStyle
    DOC5[📄 sdr-manual.md]:::docStyle
    DOC6[📄 analytics.md]:::docStyle
    
    %% Main Flow
    FB --> LEAD
    LEAD --> SERVER
    SERVER --> BOT
    SERVER -.-> CRM
    BOT --> DECISION
    CRM -.-> DECISION
    
    DECISION -->|Sim| SDR
    DECISION -->|Não| BOT
    SDR --> RESULT
    BOT -.-> SDR
    
    %% Documentation connections
    DOC1 -.-> FB
    DOC2 -.-> SERVER
    DOC3 -.-> BOT
    DOC4 -.-> CRM
    DOC5 -.-> SDR
    DOC6 -.-> RESULT
    
    %% Styles
    classDef inputStyle fill:#4A90E2,stroke:#2E5C8A,stroke-width:2px,color:#fff
    classDef processStyle fill:#2E8B57,stroke:#1D5B3A,stroke-width:2px,color:#fff
    classDef decisionStyle fill:#FF8C42,stroke:#C76A2F,stroke-width:2px,color:#fff
    classDef operationStyle fill:#FFA726,stroke:#D87E1E,stroke-width:2px,color:#fff
    classDef resultStyle fill:#DB4545,stroke:#A63333,stroke-width:2px,color:#fff
    classDef docStyle fill:#E8E8E8,stroke:#999,stroke-width:1px,color:#333,stroke-dasharray: 5 5
"""

# Create the diagram and save as PNG and SVG
png_path, svg_path = create_mermaid_diagram(
    diagram_code, 
    'sdr_system_architecture.png',
    'sdr_system_architecture.svg',
    width=1400,
    height=1000
)

print(f"Diagram saved to: {png_path} and {svg_path}")
