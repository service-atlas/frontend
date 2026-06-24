<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue'
import { usePlatforms, type PlatformDto } from '~/composables/usePlatforms'
import { useProducts, type ProductDto } from '~/composables/useProducts'
import { useFlows, type FlowDto } from '~/composables/useFlows'
import { useServices } from '~/composables/useServices'
import { useAuth } from '~/composables/useAuth'
import FlowGraphCanvas from '~/components/flows/FlowGraphCanvas.vue'
import AddNextDependencyPicker from '~/components/flows/AddNextDependencyPicker.vue'
import FlowStepDetailsPanel from '~/components/flows/FlowStepDetailsPanel.vue'

const route = useRoute()
const platformId = computed(() => route.params.platformId as string)
const productId = computed(() => route.params.productId as string)
const flowId = computed(() => route.params.flowId as string)

const { getPlatform } = usePlatforms()
const { getProduct } = useProducts()
const { getFlow, deleteFlowStep, updateFlowStep } = useFlows()
const { fetchServices, services } = useServices()
const { isAuthenticated } = useAuth()
const { apiFetch } = useProductsApi()
const toast = useToast()

const platform = ref<PlatformDto | null>(null)
const product = ref<ProductDto | null>(null)
const flow = ref<FlowDto | null>(null)

interface FlowStep {
  id: number
  flow_id: number
  target: string | null
  protocol: string | null
  current: string
  next: string
  created_at: string
  updated_at: string
}

const steps = ref<FlowStep[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

const serviceMap = computed(() => {
  const map = new Map<string, string>()
  services.value.forEach((s) => {
    map.set(s.id, s.name)
  })
  return map
})

function getServiceLabel(id: string) {
  return serviceMap.value.get(id) || id.split('-')[0]
}

interface EdgeData {
  id: string
  stepId: number
  source: string
  target: string
  protocol: string | null
  targetNode: string
  flowId: number
  endpointTarget: string | null
}

const selectedNodeId = ref<string | null>(null)
const selectedEdge = ref<EdgeData | null>(null)
const showAddPicker = ref(false)
const isAddingStep = ref(false)
const showInstructions = ref(false)

function dismissInstructions() {
  showInstructions.value = false
  localStorage.setItem('flow-builder-instructions-dismissed', 'true')
}

async function fetchSteps() {
  loading.value = true
  try {
    const data = await apiFetch<FlowStep[]>(`/flows/${flowId.value}/steps`)
    steps.value = Array.isArray(data) ? data : []
  } catch (error: unknown) {
    console.error('Failed to load flow steps', error)
    error.value = 'Failed to load flow steps'
  } finally {
    loading.value = false
  }
}

const graphElements = computed(() => {
  if (steps.value.length === 0) return []

  // 1. Build adjacency list
  const adj = new Map<string, Array<{ to: string, step: FlowStep }>>()
  const allNodes = new Set<string>()
  const nodesWithInbound = new Set<string>()

  steps.value.forEach((step) => {
    allNodes.add(step.current)
    allNodes.add(step.next)
    nodesWithInbound.add(step.next)

    if (!adj.has(step.current)) adj.set(step.current, [])
    adj.get(step.current)!.push({ to: step.next, step })
  })

  // 2. Find root(s): Nodes with outbound but no inbound edges
  let roots = Array.from(allNodes).filter(id => !nodesWithInbound.has(id))

  // Fallback: if there are no roots (e.g. a cycle), use the first step's current
  if (roots.length === 0 && steps.value.length > 0) {
    roots = [steps.value[0].current]
  }

  // 3. BFS to find reachable nodes and edges
  const reachableNodes = new Set<string>()
  const reachableEdges = new Set<number>()
  const queue = [...roots]
  roots.forEach(r => reachableNodes.add(r))

  while (queue.length > 0) {
    const curr = queue.shift()!
    const neighbors = adj.get(curr) || []
    neighbors.forEach(({ to, step }) => {
      reachableEdges.add(step.id)
      if (!reachableNodes.has(to)) {
        reachableNodes.add(to)
        queue.push(to)
      }
    })
  }

  // 4. Construct graph elements
  const elements: cytoscape.ElementDefinition[] = []

  // Add reachable nodes
  reachableNodes.forEach((id) => {
    elements.push({
      group: 'nodes',
      data: {
        id,
        label: getServiceLabel(id)
      }
    })
  })

  // Add reachable edges
  steps.value.filter(s => reachableEdges.has(s.id)).forEach((step) => {
    elements.push({
      group: 'edges',
      data: {
        id: `step-${step.id}`,
        stepId: step.id,
        source: step.current,
        target: step.next,
        protocol: step.protocol,
        targetNode: step.next,
        flowId: step.flow_id,
        endpointTarget: step.target
      }
    })
  })

  return elements
})

async function handleAddDependency(dependency: { id: string, name: string, type: string }) {
  if (!flow.value) return

  // Ensure the service is in our local list so labels resolve immediately
  if (!services.value.find(s => s.id === dependency.id)) {
    services.value.push({
      id: dependency.id,
      name: dependency.name,
      type: dependency.type
    })
  }

  isAddingStep.value = true
  try {
    // Re-reading spec: "Add starting item ... The selected item becomes the first node in the graph."
    // But POST /steps requires current and next.
    // Re-reading spec: "Add starting item ... The selected item becomes the first node in the graph."
    // "Selected-node action is: Add next"
    // So if the graph is empty, we just show the node. But how to show a node without an edge in this model?
    // "Nodes are inferred from unique current and next IDs in the returned steps"
    // This implies we need at least one step to see any nodes.
    // If the backend doesn't support a "starting node" without an edge, we might need a dummy or wait for first edge.
    // Let's assume for now that if selectedNodeId is null, we are adding the VERY FIRST node,
    // and maybe we can't save it to the backend until we have a second node to connect it to?
    // OR maybe 'current' and 'next' can be the same for the first node? Unlikely.
    // Actually, usually "Starting item" in these builders means you pick the root,
    // and then you "Add next" from it.

    if (!selectedNodeId.value) {
      // If it's the first node, we just track it locally for now?
      // Spec says: "The selected item becomes the first node in the graph."
      // Let's just set it as the selected node and wait for "Add next".
      selectedNodeId.value = dependency.id
      // We need to show it in the graph. Since nodes are inferred from steps,
      // we might need to add a virtual node if steps are empty.
      showAddPicker.value = false
      return
    }

    const newStep = await apiFetch<FlowStep>(`/flows/${flowId.value}/steps`, {
      method: 'POST',
      body: {
        flow_id: Number.parseInt(flowId.value, 10),
        current: selectedNodeId.value,
        next: dependency.id
      }
    })

    steps.value.push(newStep)
    showAddPicker.value = false
    selectedNodeId.value = dependency.id // Select the newly added node
    toast.add({
      title: 'Step added',
      description: `Connection to ${dependency.name} created successfully.`,
      color: 'success'
    })
  } catch (err: unknown) {
    console.error('Failed to add flow step', err)
    toast.add({
      title: 'Failed to add step',
      description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      color: 'error'
    })
  } finally {
    isAddingStep.value = false
  }
}

async function handleDeleteStep(stepId: number) {
  try {
    const stepToDelete = steps.value.find(s => s.id === stepId)
    if (!stepToDelete) return

    const sourceNodeId = stepToDelete.current
    const targetNodeId = stepToDelete.next

    // 1. Find all steps that are downstream from the target node of the step being deleted
    const stepsToDelete = [stepId]
    const queue = [targetNodeId]
    const visitedNodes = new Set<string>()
    visitedNodes.add(targetNodeId)

    while (queue.length > 0) {
      const curr = queue.shift()!
      // Find all steps originating from this node
      const downstreamSteps = steps.value.filter(s => s.current === curr)
      downstreamSteps.forEach((s) => {
        if (!stepsToDelete.includes(s.id)) {
          stepsToDelete.push(s.id)
          if (!visitedNodes.has(s.next)) {
            visitedNodes.add(s.next)
            queue.push(s.next)
          }
        }
      })
    }

    // 2. Delete all identified steps from backend
    // Note: In a real app, we might want a bulk delete endpoint,
    // but here we follow the existing pattern.
    await Promise.all(stepsToDelete.map(id => deleteFlowStep(id)))

    // 3. Update local state
    steps.value = steps.value.filter(s => !stepsToDelete.includes(s.id))
    selectedEdge.value = null

    // Select the source node of the deleted step so the user can continue from there
    if (sourceNodeId) {
      selectedNodeId.value = sourceNodeId
    }

    toast.add({
      title: stepsToDelete.length > 1 ? 'Steps deleted' : 'Step deleted',
      description: stepsToDelete.length > 1
        ? `${stepsToDelete.length} steps were removed from the flow.`
        : 'The connection was removed from the flow.',
      color: 'success'
    })
  } catch (err: unknown) {
    console.error('Failed to delete flow steps', err)
    toast.add({
      title: 'Failed to delete',
      description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      color: 'error'
    })
  }
}

function handleNodeClick(nodeData: { id: string }) {
  selectedNodeId.value = nodeData.id
  selectedEdge.value = null
}

function handleEdgeClick(edgeData: EdgeData) {
  selectedEdge.value = edgeData
  selectedNodeId.value = null
}

async function handleUpdateStep(payload: { stepId: number, protocol: string | null, target: string | null }) {
  try {
    const updatedStep = await updateFlowStep(payload.stepId, {
      protocol: payload.protocol,
      target: payload.target
    })

    // Update local state
    const index = steps.value.findIndex(s => s.id === payload.stepId)
    if (index !== -1) {
      steps.value[index] = updatedStep
    }

    // Update selectedEdge if it matches
    if (selectedEdge.value && selectedEdge.value.stepId === payload.stepId) {
      selectedEdge.value = {
        ...selectedEdge.value,
        protocol: updatedStep.protocol,
        endpointTarget: updatedStep.target
      }
    }

    toast.add({
      title: 'Step updated',
      description: 'Metadata saved successfully.',
      color: 'success'
    })
  } catch (err: unknown) {
    console.error('Failed to update flow step', err)
    toast.add({
      title: 'Failed to update',
      description: err instanceof Error ? err.message : 'An unexpected error occurred.',
      color: 'error'
    })
  }
}

async function loadData() {
  if (!isAuthenticated.value) return
  try {
    const [plat, prod, fl] = await Promise.all([
      getPlatform(platformId.value),
      getProduct(productId.value),
      getFlow(flowId.value),
      fetchServices(),
      fetchSteps()
    ])
    platform.value = plat
    product.value = prod
    flow.value = fl
  } catch (err: unknown) {
    console.error('Failed to load flow data', err)
  }
}

onMounted(() => {
  loadData()
  if (!localStorage.getItem('flow-builder-instructions-dismissed')) {
    showInstructions.value = true
  }
})

watch(isAuthenticated, (val) => {
  if (val) {
    loadData()
  }
})

watch([platformId, productId, flowId], () => {
  loadData()
})

const breadcrumbs = computed(() => [
  { label: 'Platforms', to: '/platforms' },
  { label: platform.value?.name || '...', to: `/platforms/${platformId.value}` },
  { label: product.value?.name || '...', to: `/platforms/${platformId.value}/products/${productId.value}` },
  { label: flow.value?.name || 'Loading...' }
])

// Augment graph elements with virtual node if empty and first node selected
const finalElements = computed(() => {
  const els = [...graphElements.value]
  if (els.length === 0 && selectedNodeId.value) {
    els.push({
      group: 'nodes',
      data: {
        id: selectedNodeId.value,
        label: getServiceLabel(selectedNodeId.value)
      }
    })
  }
  return els
})
</script>

<template>
  <div class="space-y-6 mx-[2%] h-[calc(100vh-120px)] flex flex-col">
    <UBreadcrumb :links="breadcrumbs" />

    <div class="flex items-center justify-between shrink-0">
      <div>
        <h1 class="text-3xl font-bold tracking-tight">
          {{ flow?.name || 'Flow' }}
        </h1>
        <p v-if="flow?.description" class="text-muted-foreground mt-1">
          {{ flow.description }}
        </p>
      </div>
      <div class="flex gap-2">
        <UButton
          icon="i-heroicons-question-mark-circle"
          color="neutral"
          variant="ghost"
          label="Help"
          @click="showInstructions = true"
        />
        <UButton
          v-if="selectedNodeId"
          icon="i-heroicons-plus"
          label="Add Next"
          :loading="isAddingStep"
          @click="showAddPicker = true"
        />
        <UButton
          v-if="finalElements.length === 0"
          icon="i-heroicons-plus"
          label="Add starting item"
          :loading="isAddingStep"
          @click="showAddPicker = true"
        />
      </div>
    </div>

    <div class="flex-1 flex gap-6 min-h-0">
      <div class="flex-1 relative">
        <FlowGraphCanvas
          :elements="finalElements"
          @node-click="handleNodeClick"
          @edge-click="handleEdgeClick"
          @canvas-click="handleCanvasClick"
        />

        <UModal v-model:open="showInstructions" :prevent-close="false" :ui="{ content: 'max-h-[90vh] flex flex-col' }">
          <template #header>
            Welcome to the Flow Builder!
          </template>
          <template #body>
            <div class="space-y-4">
              <p>Here's how to get started with building your service flow:</p>
              <ul class="list-disc list-inside space-y-2 text-sm text-(--ui-text-muted)">
                <li>
                  <span class="font-medium text-(--ui-text)">Add Nodes:</span> Click "Add starting item" to begin, or select an existing node and click "Add Next" to build your chain.
                </li>
                <li>
                  <span class="font-medium text-(--ui-text)">Delete Steps:</span> Simply click on any connection (edge) between nodes to select it, then use the delete option in the sidebar.
                </li>
                <li>
                  <span class="font-medium text-(--ui-text)">Metadata:</span> You can optionally add protocol (e.g. HTTP, SQL) and target (e.g. endpoint, table) details to connections for enrichment.
                </li>
              </ul>
              <p class="text-sm">
                It's that simple! Happy building.
              </p>
            </div>
          </template>
          <template #footer>
            <UButton
              label="Got it!"
              color="primary"
              @click="dismissInstructions"
            />
          </template>
        </UModal>

        <div v-if="loading" class="absolute inset-0 flex items-center justify-center bg-white/50 dark:bg-black/50 z-10">
          <UIcon name="i-heroicons-arrow-path" class="animate-spin h-8 w-8 text-primary" />
        </div>

        <div v-if="error" class="absolute top-4 left-4 right-4">
          <UAlert
            color="error"
            variant="soft"
            icon="i-heroicons-exclamation-triangle"
            :title="error"
          />
        </div>
      </div>

      <div class="w-80 shrink-0 flex flex-col gap-6">
        <UCard v-if="selectedNodeId || selectedEdge" class="flex-1 overflow-y-auto">
          <template #header>
            <div class="flex items-center justify-between">
              <span class="font-medium">{{ selectedNodeId ? 'Node Actions' : 'Edge Details' }}</span>
              <UButton
                color="neutral"
                variant="ghost"
                icon="i-heroicons-x-mark"
                size="xs"
                @click="handleCanvasClick"
              />
            </div>
          </template>

          <div v-if="selectedNodeId" class="p-4 space-y-4">
            <div class="space-y-1">
              <label class="text-xs font-medium text-muted-foreground uppercase">Service</label>
              <div class="text-sm font-semibold break-all bg-gray-50 dark:bg-gray-800 p-2 rounded border border-gray-100 dark:border-gray-700">
                {{ getServiceLabel(selectedNodeId) }}
              </div>
              <div class="text-[10px] font-mono text-muted-foreground truncate" :title="selectedNodeId">
                ID: {{ selectedNodeId }}
              </div>
            </div>
            <UButton
              block
              icon="i-heroicons-plus"
              label="Add Next Dependency"
              @click="showAddPicker = true"
            />
          </div>

          <FlowStepDetailsPanel
            v-else-if="selectedEdge"
            :step="selectedEdge"
            :get-service-label="getServiceLabel"
            @delete="handleDeleteStep"
            @save="handleUpdateStep"
          />
        </UCard>

        <UCard v-else class="flex-1 flex flex-col items-center justify-center text-center p-6 italic text-muted-foreground">
          <UIcon name="i-heroicons-cursor-arrow-rays" class="h-10 w-10 mb-2 opacity-20" />
          <p>Select a node or edge to see details</p>
        </UCard>
      </div>
    </div>

    <UModal v-model:open="showAddPicker" :title="selectedNodeId ? 'Add Next Dependency' : 'Add Starting Item'">
      <template #body>
        <AddNextDependencyPicker
          :source-node-id="selectedNodeId"
          :exclude-ids="steps.filter(s => s.current === selectedNodeId).map(s => s.next)"
          @selected="handleAddDependency"
        />
      </template>
    </UModal>
  </div>
</template>
