<template src="./OrgChart.html"></template>

<script>
import { VueFlow, Position, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { defaultChartData } from '../data/orgChartData'

// Dimensões usadas para espaçar os nós na árvore
const NODE_WIDTH = 200
const NODE_HEIGHT = 90
const H_GAP = 40
const V_GAP = 90

// Layout simples de árvore: folhas são posicionadas da esquerda para a
// direita, e cada nó pai fica centralizado sobre seus filhos.
function buildTreePositions(items) {
  const childrenByParent = new Map()
  items.forEach((item) => {
    const key = item.parentId || ''
    if (!childrenByParent.has(key)) childrenByParent.set(key, [])
    childrenByParent.get(key).push(item)
  })

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

function emptyForm() {
  return { id: '', parentId: '', siglaUnidade: '', nomeUnidade: '', simboloQuantidadeCargos: '' }
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
      selectedId: null,
      showForm: false,
      formMode: 'add',
      form: emptyForm(),
      formError: '',
    }
  },
  computed: {
    // Opções válidas de unidade pai: exclui o próprio nó (em edição) e seus
    // descendentes, para não permitir ciclos na árvore.
    parentOptions() {
      const excluded = new Set(
        this.formMode === 'edit' ? [this.form.id, ...this.descendantIds(this.form.id)] : []
      )
      return this.items.filter((item) => !excluded.has(item.id))
    },
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
    rebuild() {
      const positions = buildTreePositions(this.items)
      this.nodes = this.items.map((item) => ({
        id: item.id,
        type: 'org',
        position: positions.get(item.id) || { x: 0, y: 0 },
        data: {
          sigla: item.siglaUnidade,
          nome: item.nomeUnidade,
          simbolo: item.simboloQuantidadeCargos,
        },
        sourcePosition: Position.Bottom,
        targetPosition: Position.Top,
      }))

      this.edges = this.items
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

    descendantIds(id) {
      const result = []
      const stack = [id]
      while (stack.length) {
        const current = stack.pop()
        this.items.forEach((item) => {
          if (item.parentId === current) {
            result.push(item.id)
            stack.push(item.id)
          }
        })
      }
      return result
    },

    nextId() {
      const numericIds = this.items.map((item) => Number(item.id)).filter((n) => !Number.isNaN(n))
      const max = numericIds.length ? Math.max(...numericIds) : 0
      return String(max + 1)
    },

    openAddForm(parentId) {
      this.formMode = 'add'
      this.formError = ''
      this.form = { ...emptyForm(), id: this.nextId(), parentId: parentId || '' }
      this.showForm = true
    },

    openEditForm(id) {
      const item = this.items.find((i) => i.id === id)
      if (!item) return
      this.formMode = 'edit'
      this.formError = ''
      this.form = { ...item }
      this.showForm = true
    },

    cancelForm() {
      this.showForm = false
    },

    saveForm() {
      const sigla = this.form.siglaUnidade.trim()
      const nome = this.form.nomeUnidade.trim()
      if (!sigla || !nome) {
        this.formError = 'Sigla e nome são obrigatórios.'
        return
      }

      const payload = {
        id: this.form.id,
        parentId: this.form.parentId,
        siglaUnidade: sigla,
        nomeUnidade: nome,
        simboloQuantidadeCargos: this.form.simboloQuantidadeCargos.trim(),
      }

      if (this.formMode === 'add') {
        this.items.push(payload)
      } else {
        const idx = this.items.findIndex((item) => item.id === payload.id)
        if (idx !== -1) this.items.splice(idx, 1, payload)
      }

      this.showForm = false
      this.rebuild()
    },

    removeNode(id) {
      const toRemove = new Set([id, ...this.descendantIds(id)])
      const confirmed = window.confirm(
        toRemove.size > 1
          ? `Remover esta unidade também removerá ${toRemove.size - 1} unidade(s) subordinada(s). Continuar?`
          : 'Remover esta unidade?'
      )
      if (!confirmed) return

      this.items = this.items.filter((item) => !toRemove.has(item.id))
      if (toRemove.has(this.selectedId)) this.selectedId = null
      if (toRemove.has(this.form.id)) this.showForm = false
      this.rebuild()
    },
  },
}
</script>

<style scoped src="./OrgChart.scss" lang="scss"></style>
