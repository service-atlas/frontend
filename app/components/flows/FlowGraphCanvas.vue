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
      'curve-style': 'bezier'
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
  <div ref="container" class="w-full h-full min-h-[500px] bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-800" />
</template>
