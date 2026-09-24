<script setup>
import { APP_NAME } from '@/types'
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-emerald-50 p-8">
    <div class="max-w-lg text-center">
      <p class="text-sm font-medium tracking-wide text-emerald-700 uppercase">
        Monitoramento de qualidade do ar
      </p>
      <h1 class="mt-2 text-4xl font-semibold text-emerald-950">
        {{ APP_NAME }}
      </h1>
      <p class="mt-4 text-emerald-800">
        Interface em Vue 3. O dashboard e os alertas entram nas próximas
        etapas.
      </p>
    </div>
  </main>
</template>
