<script setup>
import { computed, ref, useAttrs } from 'vue';

defineOptions({ inheritAttrs: false });

const attrs = useAttrs();
const inputAttrs = computed(() =>
  Object.fromEntries(Object.entries(attrs).filter(([key]) => key !== 'class')),
);

defineProps({
  modelValue: {
    type: [String, Number],
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  type: {
    type: String,
    default: 'text',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const inputRef = ref(/** @type {HTMLInputElement | null} */ (null));

const focus = () => {
  inputRef.value?.focus();
};

defineExpose({ focus });
</script>

<template>
  <label
    class="block text-sm font-medium text-ink"
    :class="attrs.class"
  >
    <span v-if="label">{{ label }}</span>
    <input
      ref="inputRef"
      :value="modelValue"
      :type="type"
      class="field mt-2 px-3 py-3"
      :disabled="disabled"
      :readonly="readonly"
      v-bind="inputAttrs"
      @input="
        emit(
          'update:modelValue',
          /** @type {HTMLInputElement} */ ($event.target).value,
        )
      "
    />
  </label>
</template>
