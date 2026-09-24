<script setup>
import { APP_NAME } from '@/types';
</script>

<template>
  <div class="min-h-screen bg-emerald-50 text-emerald-950">
    <header class="border-b border-emerald-200 bg-white">
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4
          py-4"
      >
        <routerLink
          to="/"
          class="text-xl font-semibold text-emerald-950"
        >
          {{ APP_NAME }}
        </routerLink>
        <nav
          class="flex gap-2 text-sm font-medium"
          aria-label="Principal"
        >
          <routerLink
            to="/"
            class="rounded-lg px-3 py-2 text-emerald-800"
            exact-active-class="bg-emerald-800 text-white"
          >
            Dashboard
          </routerLink>
          <routerLink
            to="/alerts"
            class="rounded-lg px-3 py-2 text-emerald-800"
            exact-active-class="bg-emerald-800 text-white"
          >
            Alertas
          </routerLink>
        </nav>
      </div>
    </header>
    <main class="mx-auto max-w-6xl px-4 py-8">
      <RouterView />
    </main>
  </div>
</template>
