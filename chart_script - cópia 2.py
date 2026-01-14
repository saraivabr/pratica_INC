
import plotly.graph_objects as go

# Data for the developments
empreendimentos = [
    "Aura by Pratica",
    "Colatinna 56",
    "Giardino Verticale",
    "Alta Floresta",
    "Station Garden"
]

localizacao = [
    "Vila Guilhermina",
    "Cidade Patriarca",
    "Mooca",
    "Tatuapé",
    "Vila Ré/Patriarca"
]

status = [
    "Em construção",
    "Em construção",
    "Em construção",
    "Lançamento",
    "Entregue"
]

entrega = [
    "Out/2026",
    "Out/2027",
    "Out/2026",
    "-",
    "2024"
]

torres = [
    "1",
    "1",
    "1",
    "1",
    "1"
]

pavimentos = [
    "22",
    "21",
    "15",
    "30",
    "-"
]

unidades = [
    "148-175",
    "132",
    "60",
    "-",
    "-"
]

metragem = [
    "40-88m²",
    "33-88m²",
    "43-103m²",
    "100-140m²",
    "42-86m²"
]

preco = [
    "R$ 389.940",
    "R$ 339.000",
    "R$ 563.000",
    "R$ 2.113.150",
    "-"
]

metro = [
    "260m",
    "Ao lado",
    "1,4km",
    "-",
    "Próximo"
]

# Create the table
fig = go.Figure(data=[go.Table(
    columnwidth=[120, 100, 80, 70, 50, 70, 70, 80, 90, 80],
    header=dict(
        values=['<b>Empreend.</b>', '<b>Localização</b>', '<b>Status</b>', 
                '<b>Entrega</b>', '<b>Torres</b>', '<b>Pavimentos</b>', 
                '<b>Unidades</b>', '<b>Metragem</b>', '<b>Preço Inicial</b>', 
                '<b>Prox. Metrô</b>'],
        fill_color='#1FB8CD',
        align='left',
        font=dict(color='white', size=12),
        height=40
    ),
    cells=dict(
        values=[empreendimentos, localizacao, status, entrega, torres, 
                pavimentos, unidades, metragem, preco, metro],
        fill_color=[['#f9f9f9', 'white']*3],
        align='left',
        font=dict(color='#13343B', size=11),
        height=35
    )
)])

fig.update_layout(
    title={
        "text": "Comparação de Empreendimentos da Prática Construtora<br><span style='font-size: 18px; font-weight: normal;'>Portfólio completo com projetos em diferentes estágios</span>"
    }
)

# Save as PNG and SVG
fig.write_image("table_chart.png")
fig.write_image("table_chart.svg", format="svg")
