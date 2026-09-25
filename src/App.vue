<script setup>
import { Moon, Sun } from '@lucide/vue';

import logo from '@/assets/logo-lockup.png';
import AppFooter from '@/components/AppFooter.vue';
import ButtonOutline from '@/components/ui/ButtonOutline.vue';
import ToastHost from '@/components/ToastHost.vue';
import { useTheme } from '@/composables/useTheme';

const { theme, toggleTheme } = useTheme();
</script>

<template>
  <div class="flex min-h-screen flex-col bg-canvas text-ink">
    <header
      class="sticky top-0 z-30 border-b border-line bg-surface/90
        backdrop-blur-md"
    >
      <div
        class="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4
          py-3"
      >
        <div class="flex min-w-0 items-center gap-4">
          <RouterLink
            to="/"
            class="shrink-0"
            aria-label="EcoTrack"
          >
            <img
              :src="logo"
              alt="EcoTrack"
              class="h-12 w-auto"
            />
          </RouterLink>
          <p
            class="hidden border-l border-line pl-4 text-base leading-snug
              text-muted sm:block"
          >
            Monitoramento inteligente da qualidade do ar.
          </p>
        </div>
        <div class="flex items-center gap-2">
          <nav
            class="flex gap-1 text-sm font-medium"
            aria-label="Principal"
          >
            <RouterLink
              to="/"
              class="rounded-ui px-3 py-2 text-muted transition-colors
                duration-[var(--motion-fast)] ease-[var(--ease-standard)]
                hover:bg-surface-muted hover:text-ink"
              exact-active-class="bg-accent-soft !text-ink"
            >
              Dashboard
            </RouterLink>
            <RouterLink
              to="/alerts"
              class="rounded-ui px-3 py-2 text-muted transition-colors
                duration-[var(--motion-fast)] ease-[var(--ease-standard)]
                hover:bg-surface-muted hover:text-ink"
              exact-active-class="bg-accent-soft !text-ink"
            >
              Alertas
            </RouterLink>
          </nav>
          <ButtonOutline
            size="icon"
            :aria-pressed="theme === 'dark'"
            :aria-label="
              theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'
            "
            :title="theme === 'dark' ? 'Tema claro' : 'Tema escuro'"
            @click="toggleTheme"
          >
            <Sun
              v-if="theme === 'light'"
              :size="16"
              aria-hidden="true"
            />
            <Moon
              v-else
              :size="16"
              aria-hidden="true"
            />
          </ButtonOutline>
        </div>
      </div>
    </header>
    <main class="mx-auto w-full max-w-6xl flex-1 px-4 py-8">
      <RouterView />
    </main>
    <AppFooter />
    <ToastHost />
  </div>
</template>
