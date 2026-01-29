# 📁 Estrutura do Projeto - AppNovo Prática

## Organização de Diretórios

```
appnovo_pratica/
├── 📱 app/                          # Aplicação Next.js principal
├── 🎨 components/                   # Componentes React reutilizáveis
├── 📚 docs/                         # Documentação e PDFs
├── 📊 data/                         # Dados extraídos (JSON, CSV, etc)
│   ├── screenshots/                 # Imagens de debug
│   └── temp/                        # Arquivos temporários
├── ⚙️  config/                      # Configurações (Docker, Procfile, etc)
├── 🔧 scripts/                      # Scripts de extração/scraping
├── 🔽 downloads/                    # Arquivos baixados
├── 📦 node_modules/                 # Dependências
├── 🌐 dados_sistema_orulo/          # Dados do sistema Oríulo
├── 🏢 dados_empreendimentos/        # Dados de empreendimentos
├── 📱 flutter_app/                  # Aplicação Flutter
├── 🚀 supabase/                     # Configurações Supabase
├── 🧪 __tests__/                    # Testes
├── 📋 package.json                  # Dependências do projeto
└── 📖 README.md                     # Documentação principal

```

## 📂 Detalhes por Pasta

### 📱 `/app`
Código-fonte da aplicação Next.js com estrutura de roteamento

### 📚 `/docs`
Toda a documentação do projeto em Markdown e PDFs
- Guias de onboarding
- Relatórios de implementação
- Documentação técnica

### 📊 `/data`
Dados extraídos e processados
- `*.json` - Dados estruturados
- `screenshots/` - Imagens para debug
- `temp/` - Arquivos temporários

### ⚙️ `/config`
Configurações do projeto
- `capacitor.config.ts`
- `next.config.mjs`
- `playwright.config.ts`
- `Dockerfile`
- `Procfile`

### 🔧 `/scripts`
Scripts Node.js para automação
- `scrape_*.mjs` - Scripts de web scraping
- `extract_*.mjs` - Extração de dados
- `debug_*.mjs` - Debug e inspeção

### 🌐 `/dados_sistema_orulo`
Dados estruturados do sistema Oríulo
- Informações de empreendimentos
- Detalhes de unidades

### 🏢 `/dados_empreendimentos`
Base de dados de empreendimentos imobiliários

---

**Última atualização:** 27 de janeiro de 2026
