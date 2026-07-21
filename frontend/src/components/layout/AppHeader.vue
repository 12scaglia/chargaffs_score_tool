<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAnalysisStore } from '@/stores/analysis'
import { useNumberFormat } from '@/composables/useNumberFormat'
import { useMarkdownReport } from '@/composables/useMarkdownReport'
import { useSession } from '@/composables/useSession'
import LanguageSwitcher from '@/components/layout/LanguageSwitcher.vue'
import ThemeToggle from '@/components/layout/ThemeToggle.vue'

const store = useAnalysisStore()
const { t } = useI18n()
const { formatNumber } = useNumberFormat()
const { downloadReport } = useMarkdownReport()
const { downloadSession, loadSessionFile } = useSession()

const sessionFileInput = ref<HTMLInputElement | null>(null)

function onSessionFileChange(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (file) loadSessionFile(file)
  ;(event.target as HTMLInputElement).value = ''
}
</script>

<template>
  <header class="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 dark:border-slate-800 dark:bg-slate-900">
    <div class="flex items-center gap-2">
      <span class="text-lg font-bold text-emerald-600 dark:text-emerald-400">{{ t('app.title') }}</span>
      <span class="text-sm text-slate-500 dark:text-slate-400">{{ t('app.subtitle') }}</span>
    </div>
    <div class="flex items-center gap-3">
      <div v-if="store.sequenceInfo" class="truncate text-xs text-slate-400 dark:text-slate-500">
        {{ store.sequenceInfo.filename }} · {{ t('app.windowLabel') }} {{ formatNumber(store.windowSize) }} bp
      </div>
      <button
        v-if="store.hasResults"
        type="button"
        class="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="downloadReport"
      >
        {{ t('report.button') }}
      </button>
      <button
        v-if="store.hasResults"
        type="button"
        class="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="downloadSession()"
      >
        {{ t('session.saveButton') }}
      </button>
      <button
        type="button"
        class="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
        @click="sessionFileInput?.click()"
      >
        {{ t('session.loadButton') }}
      </button>
      <input ref="sessionFileInput" type="file" accept=".json" class="hidden" @change="onSessionFileChange" />
      <ThemeToggle />
      <LanguageSwitcher />
    </div>
  </header>
</template>
