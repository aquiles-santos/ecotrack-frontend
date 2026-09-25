<script setup>
import logoRodape from '@/assets/logo-rodape-lockup.png';
import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from '@/types';

const year = new Date().getFullYear();
</script>

<template>
  <footer class="mt-auto border-t border-line bg-surface">
    <div
      class="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-6 sm:flex-row
        sm:items-end sm:justify-between sm:gap-8"
    >
      <div class="min-w-0 space-y-2">
        <RouterLink
          to="/"
          class="inline-flex"
          :aria-label="APP_NAME"
        >
          <img
            :src="logoRodape"
            :alt="APP_NAME"
            class="footer-logo h-9 w-auto"
          />
        </RouterLink>
        <p class="text-base text-muted">Respire com consciência.</p>
      </div>
      <div class="space-y-1.5 text-sm text-muted sm:text-right">
        <p>v{{ APP_VERSION }}</p>
        <p>&copy; {{ year }} {{ APP_NAME }}. Todos os direitos reservados.</p>
        <p>
          Suporte Técnico:
          <a
            :href="`mailto:${SUPPORT_EMAIL}`"
            class="rounded-ui text-muted underline decoration-line
              underline-offset-2 transition-colors duration-[var(--motion-fast)]
              ease-[var(--ease-standard)] hover:text-ink"
          >
            {{ SUPPORT_EMAIL }}
          </a>
        </p>
      </div>
    </div>
  </footer>
</template>
