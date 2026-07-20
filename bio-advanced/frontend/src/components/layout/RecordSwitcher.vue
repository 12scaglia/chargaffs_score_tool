<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
</script>

<template>
  <div v-if="store.records.length > 1" class="rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-800">
    <p class="mb-2 text-xs font-medium text-slate-400 dark:text-slate-500">
      {{ t('records.label') }} ({{ store.records.length }})
    </p>
    <div class="flex flex-wrap gap-2">
      <button
        v-for="(record, index) in store.records"
        :key="record.sequence_info.sequence_id + index"
        type="button"
        class="rounded-md px-3 py-1.5 text-xs font-medium ring-1 transition-colors"
        :class="
          store.activeRecordIndex === index
            ? 'bg-emerald-600 text-white ring-emerald-600 dark:bg-emerald-500 dark:ring-emerald-500'
            : 'bg-white text-slate-600 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700'
        "
        @click="store.setActiveRecord(index)"
      >
        {{ record.sequence_info.sequence_id }}
        <span class="opacity-70">· {{ formatNumber(record.sequence_info.total_length) }} bp</span>
      </button>
    </div>
  </div>
</template>
