<template src="./detalhes-flow.html"></template>

<script>
import { VueFlow, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'

// Dimensões usadas para espaçar os nós na árvore
const NODE_WIDTH = 200
const NODE_HEIGHT = 90
const H_GAP = 40
const V_GAP = 90

const defaultChartData = [
  {
    id: '1',
    parentId: '',
    siglaUnidade: 'PMC',
    nomeUnidade: 'Prefeitura de Curitiba',
    simboloQuantidadeCargos: 'NS-01',
  },
  {
    id: '2',
    parentId: '1',
    siglaUnidade: 'SEC1',
    nomeUnidade: 'Secretaria 1',
    simboloQuantidadeCargos: 'NS-01',
  },
  {
    id: '3',
    parentId: '1',
    siglaUnidade: 'SEC2',
    nomeUnidade: 'Secretaria 2',
    simboloQuantidadeCargos: 'NS-01',
  },
  {
    id: '4',
    parentId: '2',
    siglaUnidade: 'DEP1',
    nomeUnidade: 'Departamento 1',
    simboloQuantidadeCargos: 'NS-01',
  },
  {
    id: '5',
    parentId: '2',
    siglaUnidade: 'DEP2',
    nomeUnidade: 'Departamento 2',
    simboloQuantidadeCargos: 'NS-01',
  },
  {
    id: '6',
    parentId: '3',
    siglaUnidade: 'DEP3',
    nomeUnidade: 'Departamento 3',
    simboloQuantidadeCargos: 'NS-01',
  },
]

function groupByParent(items) {
  const childrenByParent = new Map()
  items.forEach((item) => {
    const key = item.parentId || ''
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key).push(item)
  })
  return childrenByParent
}

// Quantidade de níveis visíveis no carregamento inicial (raiz = nível 0).
// Ex.: 2 mostra raízes + filhos diretos; níveis abaixo disso nascem recolhidos.
const INITIAL_VISIBLE_LEVELS = 3

// Profundidade de cada item na árvore, calculada a partir das raízes.
function computeDepths(items) {
  const childrenByParent = groupByParent(items)
  const depths = new Map()

  function walk(parentKey, depth) {
    const kids = childrenByParent.get(parentKey) || []
    kids.forEach((kid) => {
      depths.set(kid.id, depth)
      walk(kid.id, depth + 1)
    })
  }

  walk('', 0)
  return depths
}

// Estado inicial de recolhimento: unidades a partir de INITIAL_VISIBLE_LEVELS
// já nascem recolhidas, escondendo os níveis seguintes.
function defaultCollapsedIds(items, visibleLevels = INITIAL_VISIBLE_LEVELS) {
  const childrenByParent = groupByParent(items)
  const depths = computeDepths(items)
  return new Set(
    items
      .filter((item) => childrenByParent.has(item.id) && depths.get(item.id) >= visibleLevels - 1)
      .map((item) => item.id)
  )
}

// Layout simples de árvore: folhas são posicionadas da esquerda para a
// direita, e cada nó pai fica centralizado sobre seus filhos.
function buildTreePositions(items) {
  const childrenByParent = groupByParent(items)

  const positions = new Map()
  let cursor = 0

  function place(item, depth) {
    const children = childrenByParent.get(item.id) || []
    let x
    if (children.length === 0) {
      x = cursor * (NODE_WIDTH + H_GAP)
      cursor++
    } else {
      const childCenters = children.map((child) => place(child, depth + 1))
      x = (childCenters[0] + childCenters[childCenters.length - 1]) / 2
    }
    positions.set(item.id, { x, y: depth * (NODE_HEIGHT + V_GAP) })
    return x
  }

  const roots = childrenByParent.get('') || []
  roots.forEach((root) => place(root, 0))

  return positions
}

export default {
  name: 'OrgChart',
  components: { VueFlow, Background, Controls, MiniMap },
  setup() {
    const { updateNodeInternals } = useVueFlow('org-chart-flow')
    return { updateNodeInternals }
  },
  data() {
    return {
      items: defaultChartData.map((item) => ({ ...item })),
      nodes: [],
      edges: [],
      // Ids de unidades cujos filhos estão ocultos.
      collapsedIds: defaultCollapsedIds(defaultChartData),
      selectedId: null,
    }
  },
  created() {
    this.rebuild()
  },
  mounted() {
    // No carregamento inicial o Vue Flow pode medir os nós antes do child
    // estar totalmente pronto; força uma remedição após montar.
    this.$nextTick(() => this.updateNodeInternals())
  },
  methods: {
    // Unidades visíveis: percorre a árvore a partir das raízes e só desce
    // para os filhos de um nó se ele não estiver recolhido.
    visibleItems() {
      const childrenByParent = groupByParent(this.items)
      const result = []
      const walk = (parentKey) => {
        const kids = childrenByParent.get(parentKey) || []
        kids.forEach((kid) => {
          result.push(kid)
          if (!this.collapsedIds.has(kid.id)) walk(kid.id)
        })
      }
      walk('')
      return result
    },

    childCount(id) {
      return this.items.filter((item) => item.parentId === id).length
    },

    toggleCollapse(id) {
      if (this.collapsedIds.has(id)) {
        this.collapsedIds.delete(id)
      } else {
        this.collapsedIds.add(id)
      }
      this.rebuild()
    },

    rebuild() {
      const visible = this.visibleItems()
      const positions = buildTreePositions(visible)
      this.nodes = visible.map((item) => ({
        id: item.id,
        type: 'org',
        position: positions.get(item.id) || { x: 0, y: 0 },
        data: {
          sigla: item.siglaUnidade,
          nome: item.nomeUnidade,
          simbolo: item.simboloQuantidadeCargos,
          childCount: this.childCount(item.id),
          collapsed: this.collapsedIds.has(item.id),
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      }))

      this.edges = visible
        .filter((item) => item.parentId)
        .map((item) => ({
          id: `e${item.parentId}-${item.id}`,
          source: item.parentId,
          target: item.id,
          type: 'smoothstep',
        }))

      // Novos nós entram com dimensões ainda não medidas pelo Vue Flow
      // (visibility:hidden até lá); força a remedição após o próximo tick.
      this.$nextTick(() => this.updateNodeInternals())
    },

    onNodeClick({ node }) {
      this.selectedId = node.id
    },
  },
}
</script>

<style scoped src="./detalhes-flow.scss" lang="scss"></style>
