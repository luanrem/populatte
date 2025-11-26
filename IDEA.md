# ☕ Project: Populatte
> **Slogan:** "Do Excel para a Web, num gole de café."

---

## 1. O Conceito & Storytelling

### O Problema (A "Maneira Antiga")
Atualmente, escritórios e empresas enfrentam períodos de alta demanda onde formulários governamentais ou corporativos precisam ser preenchidos manualmente em janelas de tempo curtas.
Isso resulta em:
* **Custo Elevado:** Contratação de força de trabalho temporária apenas para digitação.
* **Estresse:** Equipes virando a noite à base de cafeína para cumprir prazos.
* **Erros Humanos:** Cansaço gera falhas na digitação de dados críticos.

### A Solução Populatte (A "Nova Maneira")
O **Populatte** nasce da fusão entre **Populate** (Preencher) e **Latte** (Café).
A proposta é inverter a lógica do café no escritório:
* **Antes:** O café era o combustível para ficar acordado na madrugada digitando dados.
* **Agora:** O café é para ser apreciado com calma enquanto o **Populatte** faz o trabalho pesado.

Nós transformamos o caos de milhares de linhas de Excel em preenchimento automático, seguro e validado direto no navegador.

---

## 2. Identidade Visual (Brand Identity)

### O Nome
**Populatte** (Populate + Latte).
* **Pronúncia:** /Pop-u-la-te/
* **Conceito:** Tecnologia (Populate) + Conforto/Lifestyle (Latte).

### Logo Concepts
* **Opção A:** Uma xícara de café vista de cima, onde a "espuma" ou a "fumaça" formam linhas de dados ou um "Check" (✓).
* **Opção B:** Um grão de café estilizado com pixels digitais saindo dele.
* **Opção C:** Um cursor de mouse "mergulhando" em uma xícara de café.

### Paleta de Cores Sugerida
Uma mistura de "Coffee Shop Moderno" com "SaaS High-Tech":
* **Primary:** `Espresso Brown` ou `Deep Slate` (Fundo/Texto Principal).
* **Accent 1:** `Latte Cream` ou `Soft Beige` (Fundos secundários/UI Elements).
* **Accent 2:** `Success Green` ou `Teal` (Botões de ação/Confirmação - transmite "dinheiro/sucesso").
* **Status:** Cores vibrantes para indicar sucesso no preenchimento dos campos.

---

## 3. Visão do Produto (MVP)

**O Que É:** Um SaaS B2B composto por um Web Dashboard (Gestão) e uma Extensão do Chrome (Execução).

### O Fluxo de Uso (The User Journey)

#### **Phase 1: Setup & Ingestão (Web Dashboard)**
* O usuário cria um "Projeto" (ex: *Imposto Renda 2025*).
* Faz upload da planilha (Excel/CSV) com os dados brutos dos clientes.
* O sistema sanitiza e organiza esses dados em uma tabela visual no dashboard.

#### **Phase 2: O "Ensino" (Extension Overlay)**
* O usuário acessa o site de destino (ex: Portal do Governo).
* Ativa a extensão **Populatte**.
* **Mapeamento Assistido:** A extensão exibe uma barra lateral com as colunas do Excel. O usuário clica na coluna e depois no campo do site para criar o vínculo (*Binding*).
* **Smart Mapping (IA):** O sistema sugere vínculos óbvios (ex: Coluna "CNPJ" -> Campo `#txtCnpj`).

#### **Phase 3: Tratamento de Dados (Data Handling)**
* Resolução de conflitos de tipos de dados (ex: Excel diz "Sim", Site pede checkbox marcado).
* Mapeamento de Dropdowns (De-Para de valores textuais para IDs do site).

#### **Phase 4: Execução & Validação**
* O usuário seleciona um cliente na lista da extensão.
* Clica em **"Populate"**.
* Os campos são preenchidos instantaneamente.
* O usuário valida visualmente e submete o formulário.
* O sistema marca aquele registro como `Concluído`.

---

## 4. Arquitetura Técnica

* **Frontend (Dashboard & Extensão):** React, TypeScript, Vite, TailwindCSS.
* **Backend:** Node.js (Express ou NestJS).
* **Database:** PostgreSQL (para dados estruturados e relacionais de clientes e projetos).
* **Automação Local:** Chrome Extension API (Manifest V3) + Scripts de injeção de DOM.
* **Segurança:** Criptografia ponta-a-ponta para dados sensíveis (LGPD Compliance).

---

## 5. Próximos Passos (Action Plan)

1.  **Validação Técnica:** Criar um "Hello World" da extensão que lê um JSON fixo e preenche um formulário HTML simples (Google Forms).
2.  **Discovery:** Pedir para a usuária (amiga) um modelo do Excel e o link do site para analisar a complexidade do DOM.
3.  **Prototipagem:** Desenhar a tela de "Mapeamento" (Sidebar da extensão), pois é o core da UX.