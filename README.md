# Vue Flow POC

Projeto de prova de conceito (POC) usando [Vue Flow](https://vueflow.dev/)
com Vue 3 (Options API) e Bootstrap 5, montado com Vite.

## O que tem aqui

Um diagrama básico de nós e arestas:

- **Início** → **Processo A** → **Fim**
- **Início** → **Processo B** → **Fim**

O componente principal está em `src/components/FlowDiagram.vue`. Os nós e
arestas são definidos em `data()`, no formato que o Vue Flow espera
(`nodes` e `edges`), e passados via `v-model` para o componente `<VueFlow>`.

## Como rodar

Pré-requisito: Node.js 18+ instalado.

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento
npm run dev
```

O terminal vai mostrar um endereço local (algo como `http://localhost:5173`).
Abra no navegador.

## Build de produção

```bash
npm run build
```

Os arquivos finais ficam na pasta `dist/`.

## Estrutura

```
vueflow-poc/
├── index.html
├── package.json
├── vite.config.js
└── src/
    ├── main.js              # entrada da app, importa CSS do Bootstrap e do Vue Flow
    ├── App.vue               # componente raiz
    └── components/
        └── FlowDiagram.vue   # o diagrama Vue Flow em si
```

## Próximos passos possíveis

- Nós customizados (com `#node-<tipo>` slots ou componentes de nó próprios)
- Painel lateral para adicionar/remover nós dinamicamente (drag-and-drop)
- Persistência do layout (salvar posições em backend/localStorage)
- Validação de conexões (`connectable`, `isValidConnection`)
