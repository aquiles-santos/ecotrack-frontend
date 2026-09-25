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
  pressed: {
    type: Boolean,
    default: false,
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
    class="btn btn-outline"
    :class="[`btn--${size}`, { 'btn-outline--pressed': pressed }]"
  >
    <slot />
  </button>
</template>
