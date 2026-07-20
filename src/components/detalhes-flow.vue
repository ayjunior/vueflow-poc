<template src="./detalhes-flow.html"></template>

<script>
import { VueFlow, Position, Handle, useVueFlow } from '@vue-flow/core'
import { Background } from '@vue-flow/background'
import { Controls } from '@vue-flow/controls'
import { MiniMap } from '@vue-flow/minimap'
import { Modal } from 'bootstrap'

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

// Estado inicial de recolhimento: só o primeiro nível (filhos das raízes)
// fica visível; qualquer unidade com filhos própria já nasce recolhida.
function defaultCollapsedIds(items) {
  const childrenByParent = groupByParent(items)
  return new Set(
    items.filter((item) => item.parentId && childrenByParent.has(item.id)).map((item) => item.id)
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

function emptyForm() {
  return { id: '', parentId: '', siglaUnidade: '', nomeUnidade: '', simboloQuantidadeCargos: '' }
}

function emptyFormErrors() {
  return { parentId: '', siglaUnidade: '', nomeUnidade: '', simboloQuantidadeCargos: '' }
}

export default {
  name: 'OrgChart',
  components: { VueFlow, Background, Controls, MiniMap, Handle },
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
      formMode: 'add',
      form: emptyForm(),
      formErrors: emptyFormErrors(),
      // Só uma unidade raiz (sem unidade pai) pode ficar com "Unidade pai" em
      // branco; para as demais o campo é obrigatório.
      allowRootParent: false,
      modalInstance: null,
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

    this.modalInstance = new Modal(this.$refs.formModal)
    // Cobre fechamento via ESC, clique no backdrop ou botão "x", que não
    // passam por cancelForm()/saveForm().
    this.$refs.formModal.addEventListener('hidden.bs.modal', this.resetForm)
  },
  beforeUnmount() {
    this.$refs.formModal.removeEventListener('hidden.bs.modal', this.resetForm)
    this.modalInstance?.dispose()
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

    // Impede vincular um nó a si mesmo ou a um de seus próprios
    // descendentes, o que criaria um ciclo na árvore.
    isValidConnection({ source, target }) {
      if (!source || !target || source === target) return false
      return !this.descendantIds(target).includes(source)
    },

    // Arrastar e soltar de um nó para outro reatribui a unidade pai:
    // o nó de origem (alça inferior) passa a ser o novo pai do nó de
    // destino (alça superior), substituindo o vínculo anterior.
    onConnect({ source, target }) {
      if (!this.isValidConnection({ source, target })) return

      const idx = this.items.findIndex((item) => item.id === target)
      if (idx === -1 || this.items[idx].parentId === source) return

      this.items.splice(idx, 1, { ...this.items[idx], parentId: source })
      // Garante que a unidade recém-vinculada fique visível de imediato.
      this.collapsedIds.delete(source)
      this.rebuild()
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
      this.formErrors = emptyFormErrors()
      this.form = { ...emptyForm(), id: this.nextId(), parentId: parentId || '' }
      // O botão "Adicionar unidade raiz" chama openAddForm(''); nesse caso
      // não há unidade pai possível e o campo fica opcional.
      this.allowRootParent = !parentId
      this.modalInstance.show()
    },

    openEditForm(id) {
      const item = this.items.find((i) => i.id === id)
      if (!item) return
      this.formMode = 'edit'
      this.formErrors = emptyFormErrors()
      this.form = { ...item }
      this.allowRootParent = !item.parentId
      this.modalInstance.show()
    },

    resetForm() {
      this.form = emptyForm()
      this.formErrors = emptyFormErrors()
      this.allowRootParent = false
    },

    cancelForm() {
      this.modalInstance.hide()
    },

    validateForm() {
      const errors = emptyFormErrors()

      if (!this.form.parentId && !this.allowRootParent) {
        errors.parentId = 'Unidade pai é obrigatória.'
      }
      if (!this.form.siglaUnidade.trim()) {
        errors.siglaUnidade = 'Sigla é obrigatória.'
      }
      if (!this.form.nomeUnidade.trim()) {
        errors.nomeUnidade = 'Nome da unidade é obrigatório.'
      }
      if (!this.form.simboloQuantidadeCargos.trim()) {
        errors.simboloQuantidadeCargos = 'Símbolo é obrigatório.'
      }

      this.formErrors = errors
      return Object.values(errors).every((message) => !message)
    },

    saveForm() {
      if (!this.validateForm()) return

      const payload = {
        id: this.form.id,
        parentId: this.form.parentId,
        siglaUnidade: this.form.siglaUnidade.trim(),
        nomeUnidade: this.form.nomeUnidade.trim(),
        simboloQuantidadeCargos: this.form.simboloQuantidadeCargos.trim(),
      }

      if (this.formMode === 'add') {
        this.items.push(payload)
        // Se a unidade pai estava recolhida, expande para que a nova
        // subordinada fique visível imediatamente.
        if (payload.parentId) this.collapsedIds.delete(payload.parentId)
      } else {
        const idx = this.items.findIndex((item) => item.id === payload.id)
        if (idx !== -1) this.items.splice(idx, 1, payload)
      }

      this.modalInstance.hide()
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
      if (toRemove.has(this.form.id)) this.modalInstance.hide()
      this.rebuild()
    },
  },
}
</script>

<style scoped src="./detalhes-flow.scss" lang="scss"></style>
