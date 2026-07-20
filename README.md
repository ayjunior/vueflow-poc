# Vue Flow POC — Organograma

Projeto de prova de conceito (POC) usando [Vue Flow](https://vueflow.dev/)
com Vue 3 (Options API) e Bootstrap 5, montado com Vite.

## O que tem aqui

Um organograma hierárquico interativo, montado a partir de uma lista plana
de unidades (`id` / `parentId`). O componente calcula o layout em árvore e
o desenha com `<VueFlow>`.

Funcionalidades:

- **CRUD de unidades** via modal Bootstrap (adicionar unidade raiz, adicionar
  subordinada, editar, remover — com validação por campo e remoção em
  cascata dos descendentes).
- **Expandir/recolher subárvores**: por padrão só o primeiro nível fica
  visível; cada nó com filhos mostra um badge (▲/▼ + contador) sobre a
  borda inferior, que alterna a exibição dos descendentes.
- **Reatribuir unidade pai por drag-and-drop**: arraste a partir da alça
  inferior de um nó (fonte) e solte na alça superior de outro (destino)
  para tornar o primeiro o novo pai do segundo, substituindo o vínculo
  anterior. Conexões que criariam ciclo (soltar sobre um descendente do
  próprio nó) são bloqueadas.
- Tecla **Backspace/Delete** desabilitada para apagar nós/arestas
  selecionados — a remoção só acontece pelo botão dedicado, que já cuida
  de confirmação e remoção em cascata.

O componente principal está em `src/components/detalhes-flow.vue`, com o
template em `detalhes-flow.html` e os estilos em `detalhes-flow.scss`. Os
dados de exemplo e a lógica de layout/estado ficam em `detalhes-flow.vue`;
`nodes` e `edges` (no formato que o Vue Flow espera) são recalculados a
partir da lista de unidades e passados via `v-model` para `<VueFlow>`.

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
    ├── main.js                  # entrada da app, importa CSS do Bootstrap e do Vue Flow
    ├── App.vue                  # componente raiz
    └── components/
        ├── detalhes-flow.vue    # lógica: dados, layout em árvore, expandir/recolher, drag-and-drop
        ├── detalhes-flow.html   # template: <VueFlow>, nó customizado, modal de formulário
        └── detalhes-flow.scss   # estilos do nó, badge de contagem e handles de conexão
```

## Próximos passos possíveis

- Persistência do layout/dados (salvar em backend ou `localStorage`)
- Painel lateral com busca/filtro de unidades
- Exportar o organograma (imagem ou PDF)
- Desfazer/refazer (undo/redo) para edições e reatribuições de pai