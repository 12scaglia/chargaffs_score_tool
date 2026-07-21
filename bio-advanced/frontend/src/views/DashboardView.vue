<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import AppHeader from '@/components/layout/AppHeader.vue'
import LeftSidebar from '@/components/layout/LeftSidebar.vue'
import RightSidebar from '@/components/layout/RightSidebar.vue'
import RecordSwitcher from '@/components/layout/RecordSwitcher.vue'
import StatsCards from '@/components/dashboard/StatsCards.vue'
import SignificancePanel from '@/components/dashboard/SignificancePanel.vue'
import ScoreLineChart from '@/components/charts/ScoreLineChart.vue'
import ScoreHeatmap from '@/components/charts/ScoreHeatmap.vue'
import SkewChart from '@/components/charts/SkewChart.vue'
import AnnotationStatsPanel from '@/components/annotations/AnnotationStatsPanel.vue'
import OriTerPanel from '@/components/annotations/OriTerPanel.vue'
import ComparisonPanel from '@/components/comparison/ComparisonPanel.vue'
import TopSegmentsPanel from '@/components/table/TopSegmentsPanel.vue'
import ResultsTable from '@/components/table/ResultsTable.vue'

const store = useAnalysisStore()
const { t } = useI18n()
</script>

<template>
  <div class="flex h-screen flex-col">
    <AppHeader />

    <div class="flex min-h-0 flex-1">
      <LeftSidebar />

      <main class="flex min-w-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        <div v-if="!store.hasResults" class="flex flex-1 items-center justify-center text-center text-slate-400 dark:text-slate-500">
          <div>
            <p class="text-lg font-medium">{{ t('dashboard.emptyTitle') }}</p>
            <p class="mt-1 text-sm">{{ t('dashboard.emptySubtitle') }}</p>
          </div>
        </div>

        <template v-else>
          <RecordSwitcher />

          <StatsCards />

          <SignificancePanel />

          <div class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800" style="height: 320px">
            <ScoreLineChart />
          </div>

          <div class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800" style="height: 180px">
            <ScoreHeatmap />
          </div>

          <div class="rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800" style="height: 320px">
            <SkewChart />
          </div>

          <OriTerPanel />

          <AnnotationStatsPanel />

          <ComparisonPanel />

          <div class="flex min-h-0 flex-1 flex-col gap-3 rounded-lg bg-white p-4 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800" style="min-height: 420px">
            <TopSegmentsPanel />
            <div class="min-h-0 flex-1">
              <ResultsTable />
            </div>
          </div>
        </template>
      </main>

      <RightSidebar v-if="store.hasResults" />
    </div>
  </div>
</template>
