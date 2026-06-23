# Product Flow Builder Service Atlas Spec

## Overview

Build a Nuxt/Vue product flow builder that lets users construct and edit a directed data flow between service atlas items.

Use Cytoscape.js for the graph canvas.

The interface starts with an empty graph. The user adds a starting item, selects nodes, and uses an `Add next` action to append valid downstream nodes. Valid downstream nodes come from the service atlas dependency endpoint.

The graph should behave like a constrained flow builder, not a freeform diagramming tool. Users should only be able to add edges that are valid according to backend dependency data.

## Styling Guidance

Use the existing Nuxt/Vue application pages as the style guide.

Do not invent a separate design system. Match existing page structure, spacing, button styles, panels, empty states, form controls, loading states, and error states.

## API Base URLs

There are two API base URLs involved.

Use `API_URL` for service atlas dependency lookup:

```http
GET {{API_URL}}/services/:id/dependencies
```

Use `PRODUCTS_API_URL` for product flow endpoints:

```http
GET {{PRODUCTS_API_URL}}/flows/:id/steps
POST {{PRODUCTS_API_URL}}/flows/:id/steps
```

## Graph Model

Represent the flow as directed edges between service atlas item IDs.

The canonical editable unit is a flow step.

```ts
type FlowStep = {
  id: number
  flow_id: number
  target: string | null
  protocol: string | null
  current: string
  next: string
  created_at: string
  updated_at: string
}
```

Each `FlowStep` maps to one Cytoscape edge:

```ts
{
  group: 'edges',
  data: {
    id: `step-${step.id}`,
    stepId: step.id,
    flowId: step.flow_id,
    source: step.current,
    target: step.next,
    protocol: step.protocol,
    endpointTarget: step.target,
    createdAt: step.created_at,
    updatedAt: step.updated_at
  }
}
```

Nodes are inferred from unique `current` and `next` IDs in the returned steps, then hydrated with service metadata when an appropriate service lookup is available.

Until a service detail endpoint is available, the implementation may render IDs or locally available labels for nodes created from existing steps.

## Empty State

The initial builder view should show an empty canvas and a clear primary action:

```text
Add starting item
```

Clicking `Add starting item` should open a searchable picker for selecting the first service atlas item. Use the existing `searchServices` from `useServices.ts`. 

The picker should display the service name and its type (e.g., "Frontend", "Backend", "Database") to help users identify the correct entry point.

The selected item becomes the first node in the graph.

## Node Selection

Users can select any graph node.

When a node is selected, show contextual actions and details using existing application UI patterns.

The primary selected-node action is:

```text
Add next
```

The selected state should make it clear which node future additions will originate from.

## Finding Valid Next Nodes

Use this endpoint when the user selects a node and clicks `Add next`.

```http
GET {{API_URL}}/services/:id/dependencies
```

Path params:

```ts
{
  id: string
}
```

Response:

```ts
type ServiceDependency = {
  id: string
  name: string
  type: string
  interaction_type: string
}
```

Example response:

```json
[
  {
    "id": "04ad317f-6074-4e33-bdd7-46a5a2563bb1",
    "name": "Authentication Database",
    "type": "database",
    "interaction_type": "data"
  }
]
```

Only dependencies where `interaction_type === 'data'` should be available in the `Add next` picker. Other interaction types should be hidden.

The picker should show enough context for the user to understand why each item is valid, including the dependency name and type.

## Loading Existing Flow Steps

Use this endpoint when opening an existing product flow for viewing or editing.

```http
GET {{PRODUCTS_API_URL}}/flows/:id/steps
```

Path params:

```ts
{
  id: string | number
}
```

Response:

```ts
FlowStep[]
```

Example response:

```json
[
  {
    "id": 7,
    "flow_id": 1,
    "target": null,
    "protocol": null,
    "current": "2460ad7f-54e8-49bb-b50f-0d668d69b201",
    "next": "75fce8b6-ca55-41dc-b5fb-1c12707887c0",
    "created_at": "2026-06-13T16:33:46.859383-05:00",
    "updated_at": "2026-06-13T16:33:46.859383-05:00"
  },
  {
    "id": 6,
    "flow_id": 1,
    "target": null,
    "protocol": null,
    "current": "cea050e5-ebc3-4d2b-aad2-877c47fa8961",
    "next": "2460ad7f-54e8-49bb-b50f-0d668d69b201",
    "created_at": "2026-06-13T15:37:02.798939-05:00",
    "updated_at": "2026-06-13T15:37:02.798939-05:00"
  },
  {
    "id": 5,
    "flow_id": 1,
    "target": "/tests",
    "protocol": "HTTP",
    "current": "cea050e5-ebc3-4d2b-aad2-877c47fa8961",
    "next": "75fce8b6-ca55-41dc-b5fb-1c12707887c0",
    "created_at": "2026-06-12T19:50:04.54019-05:00",
    "updated_at": "2026-06-13T17:32:48.12627-05:00"
  }
]
```

Use this endpoint as the canonical source for editable graph state.

Each returned step becomes one directed edge from `current` to `next`.

## Creating A New Flow Step

Use this endpoint after the user selects a valid next node from the `Add next` picker.

```http
POST {{PRODUCTS_API_URL}}/flows/:id/steps
```

Path params:

```ts
{
  id: string | number
}
```

Request body:

```ts
{
  flow_id: number
  current: string
  next: string
}
```

Example request body:

```json
{
  "flow_id": 1,
  "current": "cea050e5-ebc3-4d2b-aad2-877c47fa8961",
  "next": "75fce8b6-ca55-41dc-b5fb-1c12707887c0"
}
```

Successful response status:

```http
201 Created
```

Example response:

```json
{
  "id": 3,
  "flow_id": 1,
  "target": null,
  "protocol": null,
  "current": "cea050e5-ebc3-4d2b-aad2-877c47fa8961",
  "next": "75fce8b6-ca55-41dc-b5fb-1c12707887c0",
  "created_at": "2026-06-10T19:07:22.055291-05:00",
  "updated_at": "2026-06-10T19:07:22.055291-05:00"
}
```

Do not create a permanent optimistic edge before this request succeeds.

It is acceptable to show a pending state while the request is in flight, but the real graph edge should be created from the returned `FlowStep` so the frontend stores the backend-generated `step.id`.

## Add Next Flow

When the user clicks `Add next` on a selected node:

1. Call `GET {{API_URL}}/services/:id/dependencies` using the selected node ID.
2. Filter or prioritize dependencies with `interaction_type === 'data'`.
3. Show the returned items in a searchable picker.
4. When the user selects a dependency, call `POST {{PRODUCTS_API_URL}}/flows/:flowId/steps`.
5. Use the selected node ID as `current`.
6. Use the selected dependency ID as `next`.
7. After a successful `201 Created` response, add the returned step to local graph state.
8. Render the new node if it does not already exist.
9. Render the directed edge using the returned step ID.

## Fan-Out Behavior

A node may have multiple outgoing edges.

After adding one downstream node, the selected source node should still support `Add next` so users can add additional branches.

The UI should make fan-out understandable by showing clear directed edges and keeping the selected source node visually distinct while adding downstream items.

## Edge Behavior

Edges represent saved flow steps.

Selecting an edge should expose the step metadata:

```ts
{
  stepId: number
  flowId: number
  protocol: string | null
  target: string | null
  current: string
  next: string
}
```

The edge details panel should display `protocol` and `target` fields as "Coming Soon".

## Invalid State Prevention

The builder should not allow arbitrary edge creation.

Users should not be able to connect any two random nodes unless the connection is validated against the dependency endpoint.

The safest initial behavior is to only create edges through the `Add next` workflow.

If drag-to-connect is added later, valid targets should be highlighted and invalid targets should be unavailable.

## Cytoscape.js Requirements

Use Cytoscape.js for:

- rendering nodes and directed edges
- node selection
- edge selection
- viewport pan and zoom
- layout after graph changes (use automatic layout, e.g., dagre, for a simple directed flow)
- graph styling (must support light and dark modes)

Install `cytoscape` and necessary layout plugins (e.g., `dagre`).

## Recommended Component Shape

The implementation will be centered in `app/pages/platforms/[platformId]/products/[productId]/flows/[flowId].vue`.

The following component organization is recommended:

```text
FlowGraphCanvas.vue
  - wraps Cytoscape
  - renders graph elements
  - emits node-selected and edge-selected events
  - handles dark/light mode styling

AddNextDependencyPicker.vue
  - fetches or receives dependency candidates
  - filters (interaction_type === 'data') and displays valid downstream items
  - emits selected dependency

FlowStepDetailsPanel.vue
  - displays selected edge metadata
  - shows protocol/target as "Coming Soon"
  - designed for potential reuse in a read-only flow view
```

Prefer using `useProductsApi` for flow operations and `useApi` for service atlas lookups.

## Error And Loading States

Show loading state when:

- loading existing flow steps
- fetching dependencies for `Add next`
- creating a new flow step

Show errors when:

- existing flow steps fail to load
- dependencies fail to load
- creating a step fails

Errors should use existing app patterns.

If step creation fails, do not add the edge to the graph.

## Endpoint Preference Notes

`GET {{PRODUCTS_API_URL}}/flows/:id/path` exists and returns adjacency data.

Example shape:

```ts
type FlowPathResponse = {
  flow_id: number
  path: Array<{
    Current: string
    Next: string[]
  }>
}
```

This endpoint is useful for read-only topology previews or backend validation, but it should not be the primary endpoint for the editor because it does not include step IDs or editable step metadata.

Use `GET {{PRODUCTS_API_URL}}/flows/:id/steps` as the canonical editor endpoint.
