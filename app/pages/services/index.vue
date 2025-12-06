<script setup lang="ts">
definePageMeta({
  title: 'Services'
})

const tabs = [
  { label: 'Overview', icon: 'lucide:list-tree', slot: 'overview' },
  { label: 'Associations', icon: 'lucide:git-merge', slot: 'associations' },
  { label: 'Releases', icon: 'lucide:rocket', slot: 'releases' },
  { label: 'Debt', icon: 'lucide:alert-triangle', slot: 'debt' }
]
</script>

<template>
  <div>
    <UPageHero
      title="Services"
      description="Create, update, and organize services. Link services, add releases, and track technical debt."
      :links="[
        { label: 'New Service', icon: 'lucide:plus', color: 'primary' },
        { label: 'Import', icon: 'lucide:upload', color: 'neutral', variant: 'subtle' }
      ]"
    />

    <UPageSection
      title="Browse"
      description="This section will list your services."
    >
      <UCard>
        <div class="flex items-center justify-between gap-3">
          <UInput
            icon="lucide:search"
            placeholder="Search services..."
            class="w-full md:w-80"
          />
          <div class="flex items-center gap-2">
            <USelect :options="['All', 'Active', 'Archived']" />
            <UButton
              icon="lucide:filter"
              label="Filters"
              color="neutral"
              variant="ghost"
            />
          </div>
        </div>
        <div class="mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <UCard
            v-for="n in 6"
            :key="n"
          >
            <template #header>
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <UIcon name="lucide:box" />
                  <span class="font-medium">Service {{ n }}</span>
                </div>
                <UButton
                  icon="lucide:more-horizontal"
                  variant="ghost"
                  color="neutral"
                  aria-label="More"
                />
              </div>
            </template>
            <p class="text-(--ui-text-muted)">
              Placeholder description about this service. Click to view details.
            </p>
            <template #footer>
              <div class="flex items-center gap-2">
                <UButton
                  size="sm"
                  icon="lucide:pencil"
                  color="neutral"
                  variant="subtle"
                  label="Edit"
                />
                <UButton
                  size="sm"
                  icon="lucide:link-2"
                  color="neutral"
                  variant="ghost"
                  label="Associate"
                />
              </div>
            </template>
          </UCard>
        </div>
      </UCard>
    </UPageSection>

    <UPageSection
      title="Manage"
      description="Quick actions and details for a selected service (preview only)."
    >
      <UTabs :items="tabs">
        <template #overview>
          <UCard>
            <p class="text-(--ui-text-muted)">
              Overview details for the selected service will appear here.
            </p>
          </UCard>
        </template>
        <template #associations>
          <UCard>
            <p class="text-(--ui-text-muted)">
              Define dependencies and relationships between services.
            </p>
            <div class="mt-3 flex items-center gap-2">
              <USelect :options="['Service A', 'Service B', 'Service C']" />
              <UButton
                icon="lucide:plus"
                label="Add Association"
              />
            </div>
          </UCard>
        </template>
        <template #releases>
          <UCard>
            <p class="text-(--ui-text-muted)">
              Add and view releases for this service.
            </p>
            <div class="mt-3 flex items-center gap-2">
              <UInput placeholder="Version (e.g., 1.2.3)" />
              <UInput
                placeholder="Date"
                icon="lucide:calendar"
              />
              <UButton
                icon="lucide:rocket"
                label="Add Release"
              />
            </div>
          </UCard>
        </template>
        <template #debt>
          <UCard>
            <p class="text-(--ui-text-muted)">
              Track technical debt items and their status.
            </p>
            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
              <UInput placeholder="Title" />
              <USelect
                :options="['Low', 'Medium', 'High']"
                placeholder="Severity"
              />
              <UTextarea
                placeholder="Description"
                class="md:col-span-2"
              />
              <div class="md:col-span-2">
                <UButton
                  icon="lucide:plus"
                  label="Add Debt"
                />
              </div>
            </div>
          </UCard>
        </template>
      </UTabs>
    </UPageSection>
  </div>
</template>
