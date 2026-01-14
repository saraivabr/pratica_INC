
import plotly.graph_objects as go
import pandas as pd

# Timeline data
timeline_data = [
    {'year': 1998, 'event': 'Fundação (dez)', 'category': 'milestone'},
    {'year': 2001, 'event': 'Registro CNPJ', 'category': 'milestone'},
    {'year': 2015, 'event': 'Foco em sobrados', 'category': 'phase'},
    {'year': 2019, 'event': 'Transição vertical', 'category': 'phase'},
    {'year': 2021, 'event': 'Station Garden', 'category': 'project'},
    {'year': 2023, 'event': 'Aura & Giardino', 'category': 'project'},
    {'year': 2024, 'event': 'Entrega Station', 'category': 'delivery'},
    {'year': 2025, 'event': 'Alta Floresta', 'category': 'project'},
    {'year': 2026, 'event': 'Entrega Aura/Giardino', 'category': 'future'},
    {'year': 2027, 'event': 'Entrega Colatinna 56', 'category': 'future'}
]

df = pd.DataFrame(timeline_data)

# Create figure
fig = go.Figure()

# Color mapping for different categories
color_map = {
    'milestone': '#1FB8CD',  # Strong cyan
    'phase': '#2E8B57',      # Sea green
    'project': '#D2BA4C',    # Moderate yellow
    'delivery': '#5D878F',   # Cyan
    'future': '#DB4545'      # Bright red
}

# Add timeline line
fig.add_trace(go.Scatter(
    x=[df['year'].min(), df['year'].max()],
    y=[0, 0],
    mode='lines',
    line=dict(color='#9FA8B0', width=3),
    showlegend=False,
    hoverinfo='skip'
))

# Add markers for each event
for idx, row in df.iterrows():
    # Alternate positioning above and below the line
    y_pos = 0.3 if idx % 2 == 0 else -0.3
    
    fig.add_trace(go.Scatter(
        x=[row['year']],
        y=[0],
        mode='markers',
        marker=dict(
            size=16,
            color=color_map[row['category']],
            line=dict(width=2, color='white')
        ),
        showlegend=False,
        hovertemplate=f"<b>{row['year']}</b><br>{row['event']}<extra></extra>"
    ))
    
    # Add text annotations
    fig.add_annotation(
        x=row['year'],
        y=y_pos,
        text=f"<b>{row['year']}</b><br>{row['event']}",
        showarrow=True,
        arrowhead=2,
        arrowsize=1,
        arrowwidth=2,
        arrowcolor=color_map[row['category']],
        ax=0,
        ay=-60 if y_pos > 0 else 60,
        font=dict(size=11, color='#13343B'),
        align='center',
        bgcolor='rgba(255,255,255,0.9)',
        borderpad=4
    )

# Add summary annotations
fig.add_annotation(
    x=2000,
    y=-0.7,
    text="<b>25+ anos de história</b><br>3000+ famílias",
    showarrow=False,
    font=dict(size=14, color='#1FB8CD'),
    align='center',
    bgcolor='rgba(255,255,255,0.95)',
    bordercolor='#1FB8CD',
    borderwidth=2,
    borderpad=8
)

# Update layout
fig.update_layout(
    title={
        'text': "Evolução da Prática Construtora (1998-2027)<br><span style='font-size: 18px; font-weight: normal;'>De sobrados privativos a empreendimentos verticais</span>"
    },
    xaxis=dict(
        title="Ano",
        showgrid=True,
        gridcolor='rgba(200,200,200,0.3)',
        range=[1997, 2028],
        dtick=2
    ),
    yaxis=dict(
        showticklabels=False,
        showgrid=False,
        zeroline=False,
        range=[-1, 0.8]
    ),
    plot_bgcolor='white',
    hovermode='closest'
)

fig.update_traces(cliponaxis=False)

# Save the figure
fig.write_image('timeline.png')
fig.write_image('timeline.svg', format='svg')
