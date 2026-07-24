// Estrutura de exemplo com 3.600 unidades: a raiz (nó 1) tem 35 filhos
// diretos, e as 3.564 unidades restantes são distribuídas em níveis
// subsequentes (largura limitada por unidade), formando uma árvore grande
// e profunda para testar performance/virtualização do organograma.
const TOTAL_NODES = 3600
const ROOT_CHILDREN = 35
const BRANCHING_FACTOR = 6

function buildChartData({
  totalNodes = TOTAL_NODES,
  rootChildren = ROOT_CHILDREN,
  branchingFactor = BRANCHING_FACTOR,
} = {}) {
  const items = []
  let nextId = 1

  function createItem(parentId) {
    const id = String(nextId++)
    items.push({
      id,
      parentId,
      siglaUnidade: `U${id}`,
      nomeUnidade: `Unidade ${id}`,
      simboloQuantidadeCargos: 'NS-01',
    })
    return id
  }

  const rootId = createItem('')
  let remaining = totalNodes - 1

  // Nível 1: filhos diretos da raiz.
  const frontier = []
  const firstLevelCount = Math.min(rootChildren, remaining)
  for (let i = 0; i < firstLevelCount; i++) {
    frontier.push(createItem(rootId))
  }
  remaining -= firstLevelCount

  // Demais níveis: distribui o restante em largura (branchingFactor por nó),
  // percorrendo a fronteira em ordem (BFS), até esgotar o total pedido.
  let cursor = 0
  while (remaining > 0 && cursor < frontier.length) {
    const parentId = frontier[cursor++]
    const childCount = Math.min(branchingFactor, remaining)
    for (let i = 0; i < childCount; i++) {
      frontier.push(createItem(parentId))
    }
    remaining -= childCount
  }

  return items
}

export const defaultChartData = buildChartData()