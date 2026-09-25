<script setup>
import { onUnmounted, watch } from 'vue';

const props = defineProps({
  open: {
    type: Boolean,
    default: false,
  },
  labelledby: {
    type: String,
    required: true,
  },
  describedby: {
    type: String,
    default: '',
  },
});

const emit = defineEmits(['close']);

const lockScroll = (locked) => {
  document.body.style.overflow = locked ? 'hidden' : '';
};

watch(
  () => props.open,
  (open) => {
    lockScroll(open);
  },
  { immediate: true },
);

onUnmounted(() => {
  lockScroll(false);
});
</script>

<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open"
        class="fixed inset-0 z-50 flex items-center justify-center bg-overlay
          p-4"
        @mousedown.self="emit('close')"
      >
        <div
          class="modal-panel max-h-[90vh] w-full max-w-lg overflow-y-auto
            rounded-ui bg-surface p-5 text-ink shadow-panel"
          role="dialog"
          aria-modal="true"
          :aria-labelledby="labelledby"
          :aria-describedby="describedby || undefined"
        >
          <slot />
        </div>
      </div>
    </Transition>
  </Teleport>
</template>
