<script setup>
import ButtonText from '@/components/ui/ButtonText.vue';
import { useToast } from '@/composables/useToast';

const { toasts, dismiss } = useToast();

const KIND_CLASS = {
  success: 'border-line bg-accent text-accent-ink',
  error: 'border-line bg-danger text-danger-ink',
  warning: 'border-line bg-warning-soft text-warning-ink',
};

const KIND_LABEL = {
  success: 'Sucesso',
  error: 'Erro',
  warning: 'Aviso',
};
</script>

<template>
  <div
    class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex justify-center
      px-4"
    role="region"
    aria-label="Notificações"
  >
    <TransitionGroup
      tag="div"
      name="toast"
      class="relative flex w-full max-w-md flex-col items-center gap-2"
    >
      <div
        v-for="toast in toasts"
        :key="toast.id"
        class="pointer-events-auto flex w-full items-center gap-3 rounded-ui
          border px-4 py-3 text-sm shadow-panel"
        :class="KIND_CLASS[toast.kind]"
        role="status"
        aria-live="polite"
      >
        <p class="flex-1">
          <span class="sr-only">{{ KIND_LABEL[toast.kind] }}:</span>
          {{ toast.message }}
        </p>
        <ButtonText
          size="sm"
          tone="on-color"
          :aria-label="`Fechar notificação: ${toast.message}`"
          @click="dismiss(toast.id)"
        >
          Fechar
        </ButtonText>
      </div>
    </TransitionGroup>
  </div>
</template>
