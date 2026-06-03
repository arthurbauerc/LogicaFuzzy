# 🚁 Controle Fuzzy de Drone — Demonstração Interativa

Aplicação web **acadêmica** que mostra, em tempo real e de forma visual, como a
**lógica fuzzy** controla a **altitude** e o **movimento horizontal** de um drone.
Tudo roda no navegador, sem backend: a física é simulada com integração de Euler
e a inteligência do controle é um **controlador fuzzy Mamdani escrito do zero em
JavaScript** (sem nenhuma biblioteca de fuzzy).

O drone aparece num ambiente **3D** (Three.js) e, ao lado, seis painéis mostram
o "pensamento" do controlador passo a passo.

---

## 📑 Sumário

1. [Pré-requisitos](#-pré-requisitos)
2. [Instalação passo a passo](#-instalação-passo-a-passo)
3. [Como usar](#-como-usar)
4. [O que é lógica fuzzy?](#-o-que-é-lógica-fuzzy)
5. [Onde a lógica fuzzy está no código](#-onde-a-lógica-fuzzy-está-no-código)
6. [Os dois controladores](#-os-dois-controladores)
7. [A física da simulação](#-a-física-da-simulação)
8. [Todos os dados gerados (glossário)](#-todos-os-dados-gerados-glossário)
9. [Estrutura de pastas](#-estrutura-de-pastas)

---

## ✅ Pré-requisitos

- **Node.js 18+** (testado com Node 22) e **npm 9+**.
- Um navegador moderno com WebGL (Chrome, Firefox ou Edge atuais).

Confira a instalação:

```bash
node --version
npm --version
```

---

## 🛠️ Instalação passo a passo

```bash
# 1) Entre na pasta do projeto
cd drone-fuzzy-react

# 2) Instale as dependências (React, Vite, Three.js, react-three-fiber, drei)
npm install

# 3) Rode em modo desenvolvimento (abre o navegador sozinho em http://localhost:5173)
npm run dev
```

Para gerar a versão otimizada de produção:

```bash
npm run build      # gera a pasta dist/
npm run preview    # serve a pasta dist/ localmente para conferência
```

> 💡 No Windows (PowerShell), os mesmos comandos funcionam. Se a pasta tiver
> espaços ou acentos no caminho, mantenha-os entre aspas ao usar `cd`.

---

## 🎮 Como usar

| Ação | Como fazer |
|------|------------|
| Mover o alvo 🎯 | **Clique** em qualquer ponto do plano 3D, use os **sliders** Alvo X / Alvo Y, ou os **cenários prontos** |
| Girar a câmera | **Arraste** com o mouse sobre a cena 3D (scroll para zoom) |
| Adicionar perturbação | Slider **Vento** (força senoidal sobre o eixo horizontal) |
| Acelerar/desacelerar | Slider **Velocidade da simulação** (0,2× a 2×) |
| Pausar / Reiniciar | Botões no painel de controles |
| Focar um controlador | Botões **↕ Altitude** / **↔ Horizontal** — os painéis didáticos seguem o eixo escolhido |

---

## 🧠 O que é lógica fuzzy?

Na **lógica booleana** clássica, algo é **0 ou 1** (verdadeiro ou falso). Na
**lógica fuzzy**, a verdade é um **grau entre 0 e 1**. Isso permite trabalhar com
conceitos vagos da linguagem humana — "um pouco abaixo", "muito rápido",
"quase no alvo" — em vez de limiares rígidos.

Um **controlador fuzzy** transforma medições numéricas em decisões suaves
através de quatro etapas:

```
   valores crus            CONHECIMENTO            decisão final
   (erro, taxa)            (regras SE-ENTÃO)        (ação suave)
        │                        │                       │
        ▼                        ▼                       ▼
 ┌──────────────┐   ┌────────────────────────┐   ┌────────────────┐
 │1 FUZZIFICAÇÃO│ → │2 INFERÊNCIA (avaliação)│ → │4 DEFUZZIFICAÇÃO│
 │ nº → graus   │   │3 AGREGAÇÃO das regras  │   │ graus → nº     │
 └──────────────┘   └────────────────────────┘   └────────────────┘
```

1. **Fuzzificação** — cada número vira graus de pertinência a conjuntos
   linguísticos. Ex.: um erro de −30 m pertence "70% a NB (muito abaixo)" e
   "30% a NS (pouco abaixo)".
2. **Inferência** — cada regra SE-ENTÃO recebe uma **força de ativação**. Como o
   antecedente usa "E", a força é o **mínimo** (t-norma) entre os graus das
   condições.
3. **Agregação** — todas as regras ativas são combinadas.
4. **Defuzzificação** — o resultado agregado vira um número único de controle.
   Aqui usamos o **centroide ponderado** dos valores de saída (singletons).

Este é o método **Mamdani**, o mais usado em ensino e em controladores clássicos
(ar-condicionado, câmbio automático, estabilização de câmeras, etc.).

### Por que fuzzy para um drone?

Em vez de uma fórmula PID com ganhos difíceis de ajustar, expressamos o
conhecimento em **regras que um humano entende**:

> *"SE estou **muito abaixo** do alvo E **não estou subindo**, ENTÃO **suba com
> força total**."*

O controlador interpola suavemente entre todas essas regras, gerando um comando
contínuo e estável.

---

## 🔍 Onde a lógica fuzzy está no código

Toda a inteligência fuzzy vive em **`src/fuzzy/`**. Nenhuma biblioteca externa de
fuzzy é usada — apenas matemática em JavaScript puro.

### `src/fuzzy/membership.js` — as formas dos conjuntos

```js
trimf(x, a, b, c)        // triangular  ╱╲   → conjuntos NS, ZE, PS
trapmf(x, a, b, c, d)    // trapezoidal ╱▔╲  → conjuntos NB, PB (ombros)
```

Essas funções respondem **"o quanto o valor x pertence a este conjunto?"**,
retornando um número entre 0 e 1.

> ⚠️ **Detalhe importante (e bug corrigido):** os conjuntos extremos **NB** e
> **PB** são **ombros** — usam `trapmf` com a borda externa no "infinito"
> (`INF = 1e4`) para **saturarem em 1** quando o erro passa do limite do
> universo. Sem isso, um erro muito grande cairia para 0 em todos os conjuntos e
> o drone não reagiria (era exatamente o motivo de ele não atravessar a tela
> horizontalmente).

### `src/fuzzy/controllers.js` — conjuntos, regras e inferência

| Elemento | O que é |
|----------|---------|
| `SET_INFO` | Tradução das siglas (NB, NS, ZE, PS, PB) em texto e cores |
| `ERR_Y_MFS`, `ERR_X_MFS` | 5 conjuntos do **erro** de cada eixo |
| `RATE_Y_MFS`, `RATE_X_MFS` | 3 conjuntos da **taxa** (velocidade) de cada eixo |
| `RULE_OUT` | A **base de 15 regras** (tabela SE-ENTÃO) por controlador |
| `inferController()` | Executa as 4 etapas Mamdani e devolve a decisão + dados |

O coração é `inferController(error, rate, errMFs, rateMFs)`:

```js
// 1) Fuzzificação
errDeg[m.name]  = clamp01(m.fn(error))   // grau do erro em cada conjunto
rateDeg[rn]     = clamp01(m.fn(rate))    // grau da taxa em cada conjunto

// 2) Avaliação + 3) Agregação (sobre as 15 regras)
strength = Math.min(errDeg[em], rateDeg[rn])   // E lógico = mínimo (Mamdani)
out      = RULE_OUT[em][rn]                     // ação da regra (singleton)
num     += strength * out
den     += strength

// 4) Defuzzificação (centroide ponderado)
output = den > 0 ? num / den : 0   // número final entre -1 e +1
```

### A base de regras (igual para os dois controladores)

`RULE_OUT[erro][taxa]` — 5 conjuntos de erro × 3 de taxa = **15 regras**:

| Erro ＼ Taxa | **N** (afastando) | **Z** (parado) | **P** (aproximando) |
|--------------|:-----------------:|:--------------:|:-------------------:|
| **NB** (muito abaixo) | −1.0 | −0.9 | −0.5 |
| **NS** (pouco abaixo) | −0.7 | −0.5 | −0.1 |
| **ZE** (no alvo)      | −0.2 |  0.0 | +0.2 |
| **PS** (pouco acima)  | +0.1 | +0.5 | +0.7 |
| **PB** (muito acima)  | +0.5 | +0.9 | +1.0 |

> Para a **altitude (Y)**: saída positiva = subir, negativa = descer.
> Para o **horizontal (X)**: saída positiva = ir para a direita, negativa = para a esquerda.

A inferência é chamada **duas vezes por subpasso** (um controlador por eixo) em
`src/physics/simulation.js`:

```js
const fY = inferController(errY, rateY, ERR_Y_MFS, RATE_Y_MFS) // altitude
const fX = inferController(errX, rateX, ERR_X_MFS, RATE_X_MFS) // horizontal
```

---

## 🎚️ Os dois controladores

A aplicação roda **dois controladores fuzzy independentes** em paralelo:

| | Controlador **Y** (altitude) | Controlador **X** (horizontal) |
|---|---|---|
| Entrada 1 | Erro de altitude `targetY − y` | Erro horizontal `targetX − x` |
| Entrada 2 | Taxa vertical `−vy` | Taxa horizontal `−vx` |
| Universo do erro | [−60, +60] m | [−100, +100] m |
| Universo da taxa | [−8, +8] m/s | [−12, +12] m/s |
| Saída | Ajuste de empuxo (−1 a +1) | Ângulo de inclinação (−1 a +1 → ±30°) |

> A segunda entrada (a **taxa**) funciona como um "freio": quando o drone se
> aproxima rápido do alvo, ela reduz a ação antes de ultrapassar, evitando
> oscilação. É o que dá o comportamento suave de chegada.

---

## ⚙️ A física da simulação

Em `src/physics/simulation.js`, **integração de Euler** com `DT = 0,05 s`,
executada `SUBSTEPS = 2` vezes por ciclo:

```js
// Vertical
vy += thrustY * MAX_ACCEL_Y * DT;  y += vy * DT;  vy *= 0.995   // atrito
// Horizontal
vx += (thrustX * MAX_ACCEL_X + vento) * DT;  x += vx * DT;  vx *= 0.985
// Vento (perturbação senoidal)
vento = windAmplitude * sin(simTime * 0.9) * 1.6
```

- **Limites:** altitude `[0, 100] m`, posição X `[0, 200] m`; ao colidir com a
  borda, a velocidade é zerada.
- **Início:** drone no chão em `(x=100, y=0)`; alvo padrão em `(x=100, y=50)`.
- A inclinação visual do drone é `saídaX × 30°`.

---

## 📊 Todos os dados gerados (glossário)

A cada ciclo de simulação, o sistema produz e exibe os seguintes dados:

### Estado físico (painel **Controles → Telemetria**)

| Dado | Símbolo | Unidade | Significado |
|------|---------|---------|-------------|
| Posição horizontal | `x` | m | Onde o drone está no eixo X (0–200) |
| Altitude | `y` | m | Altura do drone (0–100) |
| Velocidade horizontal | `vx` | m/s | Quão rápido se move na horizontal |
| Velocidade vertical | `vy` | m/s | Quão rápido sobe/desce |
| Erro de altitude | `errY = targetY − y` | m | Quanto falta verticalmente |
| Erro horizontal | `errX = targetX − x` | m | Quanto falta horizontalmente |
| Inclinação | — | graus | `saídaX × 30°` (banking do drone) |
| Saída fuzzy ↕ | `thrustY` | −1 a +1 | Decisão do controlador de altitude |
| Saída fuzzy ↔ | `thrustX` | −1 a +1 | Decisão do controlador horizontal |

### Dados fuzzy (objeto retornado por `inferController`)

| Campo | Tipo | Significado | Onde aparece na tela |
|-------|------|-------------|----------------------|
| `errDeg` | `{NB,NS,ZE,PS,PB}` | Grau (0–1) do **erro** em cada conjunto | Painel **Graus de ativação** (barras) e gráfico de MFs |
| `rateDeg` | `{N,Z,P}` | Grau (0–1) da **taxa** em cada conjunto | Usado nas regras |
| `rules` | lista de 15 itens | Cada regra com `errName`, `rateName`, `strength` (força) e `out` (ação) | Painel **Regras ativas** (top 5) |
| `output` | número (−1 a +1) | Resultado **defuzzificado** (decisão final) | Ponteiro de defuzzificação e telemetria |
| `error`, `rate` | números | Entradas cruas daquele ciclo | Pipeline didático e linha vertical do gráfico de MFs |

### Séries históricas (janela de 120 pontos)

| Vetor | Conteúdo |
|-------|----------|
| `histY` / `histYt` | Altitude **real** / **alvo** ao longo do tempo |
| `histX` / `histXt` | Posição X **real** / **alvo** ao longo do tempo |
| `trail` | Últimas 120 posições `(x, y)` para desenhar o rastro do drone |

### Onde cada dado é mostrado (os 6 painéis)

1. **Drone 3D** — posição, inclinação, hélices animadas, rastro, alvo e sombra.
2. **Controles** — sliders, cenários e a tabela de telemetria acima.
3. **Conjuntos fuzzy do erro** — as 5 curvas de pertinência + linha do valor atual.
4. **Graus de ativação** — barras dos `errDeg` + ponteiro do `output`.
5. **Regras ativas** — as 5 regras mais fortes do ciclo (força, antecedente, ação).
6. **Histórico** — real (linha sólida) vs. alvo (tracejada).

Além disso, o painel **"Como o controlador fuzzy está pensando"** narra, em
português, as 4 etapas para o eixo em foco (erro → conjunto dominante → regra
mais forte → ação final).

---

## 🗂️ Estrutura de pastas

```
drone-fuzzy-react/
├─ index.html                 # ponto de entrada HTML
├─ package.json               # dependências e scripts
├─ vite.config.js             # configuração do Vite
└─ src/
   ├─ main.jsx                # bootstrap do React
   ├─ App.jsx                 # orquestra estado e monta os 6 painéis
   ├─ App.css / index.css     # estilos e layout em grade
   ├─ fuzzy/                  # ❤️ TODA a lógica fuzzy
   │   ├─ membership.js       #   funções de pertinência (trimf, trapmf)
   │   └─ controllers.js      #   conjuntos, regras e inferência Mamdani
   ├─ physics/
   │   └─ simulation.js       # integração de Euler + chamada dos controladores
   ├─ hooks/
   │   └─ useSimulation.js    # loop de simulação + snapshot para o React
   ├─ utils/
   │   └─ canvas.js           # helpers de desenho 2D (MFs e histórico)
   └─ components/
       ├─ Drone3D.jsx         # Painel 1 — cena 3D (Three.js)
       ├─ ControlsPanel.jsx   # Painel 2 — controles + telemetria
       ├─ FuzzyPipeline.jsx   # Painel didático — explicação em 4 passos
       ├─ MembershipChart.jsx # Painel 3 — gráfico das MFs
       ├─ DegreeBars.jsx      # Painel 4 — barras + defuzzificação
       ├─ RulesTable.jsx      # Painel 5 — regras ativas
       └─ HistoryChart.jsx    # Painel 6 — histórico real vs. alvo
```

---

## 🧾 Resumo técnico

- **Inferência:** Mamdani com t-norma mínima (`Math.min`).
- **Defuzzificação:** centroide ponderado de singletons.
- **Regras:** 15 por controlador (5 conjuntos de erro × 3 de taxa).
- **Conjuntos:** NB/PB trapezoidais (ombros), NS/ZE/PS triangulares.
- **Sem bibliotecas de fuzzy nem de gráficos** — apenas React, Vite e Three.js.

> Projeto de uso **acadêmico/educacional**. Sinta-se livre para ajustar as
> regras (`RULE_OUT`), os universos ou os ganhos da física e observar o efeito
> no comportamento do drone.
