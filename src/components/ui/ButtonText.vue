<script setup>
import { ref } from 'vue';

defineProps({
  type: {
    type: String,
    default: 'button',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  tone: {
    type: String,
    default: 'accent',
    validator: (value) =>
      ['accent', 'danger', 'neutral', 'on-color'].includes(value),
  },
  size: {
    type: String,
    default: 'md',
    validator: (value) => ['sm', 'md', 'icon'].includes(value),
  },
});

const buttonRef = ref(/** @type {HTMLButtonElement | null} */ (null));

const focus = () => {
  buttonRef.value?.focus();
};

defineExpose({ focus });
</script>

<template>
  <button
    ref="buttonRef"
    :type="type"
    :disabled="disabled"
    class="btn btn-text"
    :class="[`btn--${size}`, `btn-text--${tone}`]"
  >
    <slot />
  </button>
</template>
