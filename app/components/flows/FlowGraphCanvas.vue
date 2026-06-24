<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import cytoscape from 'cytoscape'
import dagre from 'cytoscape-dagre'

if (!cytoscape.prototype.hasElement) {
  cytoscape.use(dagre)
}

interface Props {
  elements: cytoscape.ElementDefinition[]
}

const props = defineProps<Props>()
const emit = defineEmits(['node-click', 'edge-click', 'canvas-click'])

const container = ref<HTMLElement | null>(null)
let cy: cytoscape.Core | null = null

const colorMode = useColorMode()

const getStyles = (isDark: boolean): cytoscape.Stylesheet[] => [
  {
    selector: 'node',
    style: {
      'label': 'data(label)',
      'background-color': isDark ? '#3b82f6' : '#2563eb',
      'color': isDark ? '#f8fafc' : '#1e293b',
      'text-valign': 'center',
      'text-halign': 'center',
      'width': '120px',
      'height': '40px',
      'shape': 'round-rectangle',
      'font-size': '12px'
    }
  },
  {
    selector: 'edge',
    style: {
      'width': 2,
      'line-color': isDark ? '#475569' : '#cbd5e1',
      'target-arrow-color': isDark ? '#475569' : '#cbd5e1',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'overlay-opacity': 0,
      'hit-weights': 'inner'
    }
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 3,
      'border-color': isDark ? '#f8fafc' : '#0f172a'
    }
  },
  {
    selector: 'edge:selected',
    style: {
      'width': 4,
      'line-color': isDark ? '#94a3b8' : '#64748b',
      'target-arrow-color': isDark ? '#94a3b8' : '#64748b'
    }
  }
]

const tooltip = ref<{
  show: boolean
  text: string
  x: number
  y: number
} | null>({
  show: false,
  text: '',
  x: 0,
  y: 0
})

function initCy() {
  if (!container.value) return

  cy = cytoscape({
    container: container.value,
    elements: props.elements,
    style: getStyles(colorMode.value === 'dark'),
    layout: {
      name: 'dagre',
      rankDir: 'LR'
    } as any
  })

  cy.on('tap', 'node', (evt) => {
    emit('node-click', evt.target.data())
  })

  cy.on('tap', 'edge', (evt) => {
    emit('edge-click', evt.target.data())
  })

  cy.on('tap', (evt) => {
    if (evt.target === cy) {
      emit('canvas-click')
    }
  })

  cy.on('mouseover', 'node, edge', (evt) => {
    if (container.value) {
      container.value.style.cursor = 'pointer'
    }

    if (evt.target.isEdge() && tooltip.value) {
      const position = evt.renderedPosition || (evt as any).renderedPosition
      tooltip.value.show = true
      tooltip.value.text = 'Click to manage connection'
      tooltip.value.x = position.x
      tooltip.value.y = position.y - 10
    }
  })

  cy.on('mouseout', 'node, edge', (evt) => {
    if (container.value) {
      container.value.style.cursor = 'default'
    }

    if (evt.target.isEdge() && tooltip.value) {
      tooltip.value.show = false
    }
  })
}

function runLayout() {
  cy?.layout({
    name: 'dagre',
    rankDir: 'LR',
    animate: true
  } as any).run()
}

onMounted(() => {
  initCy()
})

onBeforeUnmount(() => {
  cy?.destroy()
})

watch(() => props.elements, (newElements) => {
  if (!cy) return
  cy.json({ elements: newElements })
  runLayout()
}, { deep: true })

watch(colorMode, (newMode) => {
  cy?.style(getStyles(newMode.value === 'dark'))
})

defineExpose({
  runLayout
})
</script>

<template>
  <div class="relative w-full h-full min-h-[500px]">
    <div ref="container" class="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800" />
    <div
      v-if="tooltip?.show"
      class="absolute z-50 px-2 py-1 text-xs font-medium text-white bg-gray-900 rounded shadow-sm pointer-events-none -translate-x-1/2 -translate-y-full"
      :style="{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }"
    >
      {{ tooltip.text }}
    </div>
  </div>
</template>
