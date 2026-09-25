<script setup>
import { computed, onUnmounted, ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  placeholder: {
    type: String,
    default: 'Selecione',
  },
  /** @type {import('vue').PropType<{ value: string, label: string }[]>} */
  options: {
    type: Array,
    default: () => [],
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:modelValue']);

const open = ref(false);
const root = ref(/** @type {HTMLElement | null} */ (null));
const activeIndex = ref(-1);
const listId = `dropdown-${Math.random().toString(36).slice(2, 9)}`;

const selected = computed(
  () =>
    props.options.find((option) => option.value === props.modelValue) ?? null,
);

const close = () => {
  open.value = false;
};

const toggle = () => {
  if (props.disabled) return;

  open.value = !open.value;
};

/**
 * @param {string} value
 */
const choose = (value) => {
  emit('update:modelValue', value);
  close();
};

/**
 * @param {number} next
 */
const moveActive = (next) => {
  if (props.options.length === 0) return;

  const last = props.options.length - 1;
  const index = next < 0 ? last : next > last ? 0 : next;

  activeIndex.value = index;
};

/**
 * @param {KeyboardEvent} event
 */
const onKeydown = (event) => {
  if (props.disabled) return;

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    open.value = true;
    moveActive(open.value ? activeIndex.value + 1 : 0);
    return;
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault();
    open.value = true;
    moveActive(activeIndex.value - 1);
    return;
  }

  if (event.key === 'Escape') {
    close();
    return;
  }

  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();

    if (!open.value) {
      open.value = true;
      return;
    }

    const option = props.options[activeIndex.value];

    if (option) choose(option.value);
  }
};

/**
 * @param {MouseEvent} event
 */
const onPointerDown = (event) => {
  if (!open.value || !(event.target instanceof Node)) return;

  if (!root.value?.contains(event.target)) close();
};

watch(open, (isOpen) => {
  if (!isOpen) {
    activeIndex.value = -1;
    return;
  }

  const current = props.options.findIndex(
    (option) => option.value === props.modelValue,
  );

  activeIndex.value = current >= 0 ? current : 0;
});

window.addEventListener('pointerdown', onPointerDown);

onUnmounted(() => {
  window.removeEventListener('pointerdown', onPointerDown);
});
</script>

<template>
  <div
    ref="root"
    class="relative block text-sm font-medium text-ink"
  >
    <span
      v-if="label"
      :id="`${listId}-label`"
      class="mb-2 block"
    >
      {{ label }}
    </span>
    <button
      type="button"
      class="field flex items-center justify-between gap-3 px-3 py-3 text-left
        font-normal"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      :aria-controls="listId"
      :aria-labelledby="label ? `${listId}-label` : undefined"
      @click="toggle"
      @keydown="onKeydown"
    >
      <span :class="selected ? 'text-ink' : 'text-muted'">
        {{ selected?.label ?? placeholder }}
      </span>
      <span
        class="text-muted transition-transform duration-[var(--motion-base)]
          ease-[var(--ease-emphasis)]"
        :class="open ? 'rotate-180' : ''"
        aria-hidden="true"
      >
        ▾
      </span>
    </button>
    <Transition name="dropdown">
      <ul
        v-if="open"
        :id="listId"
        class="absolute z-30 mt-1 max-h-64 w-full overflow-auto rounded-ui
          border border-line bg-surface shadow-panel"
        role="listbox"
        :aria-labelledby="label ? `${listId}-label` : undefined"
      >
        <li
          v-for="(option, index) in options"
          :key="option.value"
          role="presentation"
        >
          <button
            type="button"
            class="list-option px-3 py-3 text-sm font-normal"
            role="option"
            :aria-selected="option.value === modelValue"
            :class="index === activeIndex ? 'bg-surface-muted' : ''"
            @click="choose(option.value)"
            @mouseenter="activeIndex = index"
          >
            {{ option.label }}
          </button>
        </li>
      </ul>
    </Transition>
  </div>
</template>
