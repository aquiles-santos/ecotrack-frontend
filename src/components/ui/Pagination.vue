<script setup>
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from '@lucide/vue';
import { computed } from 'vue';

import ButtonOutline from '@/components/ui/ButtonOutline.vue';
import ButtonStandard from '@/components/ui/ButtonStandard.vue';

const props = defineProps({
  page: {
    type: Number,
    default: 1,
  },
  pageSize: {
    type: Number,
    default: 50,
  },
  itemCount: {
    type: Number,
    default: 0,
  },
  totalPages: {
    type: Number,
    default: 0,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['update:page']);

const hasNext = computed(() =>
  props.totalPages > 0
    ? props.page < props.totalPages
    : props.itemCount >= props.pageSize,
);
const hasPrev = computed(() => props.page > 1);
const lastPage = computed(() =>
  props.totalPages > 0
    ? props.totalPages
    : hasNext.value
      ? props.page + 1
      : props.page,
);

const pages = computed(() => {
  const last = lastPage.value;
  const seeds = [1, last, props.page, props.page - 1, props.page + 1];
  const numbers = [...new Set(seeds)]
    .filter((value) => value >= 1 && value <= last)
    .sort((left, right) => left - right);

  /** @type {Array<number | 'ellipsis'>} */
  const items = [];
  let previous = 0;

  numbers.forEach((value) => {
    if (previous && value - previous > 1) items.push('ellipsis');

    items.push(value);
    previous = value;
  });

  return items;
});

/**
 * @param {number} next
 */
const goTo = (next) => {
  if (props.disabled || next < 1 || next === props.page) return;

  if (next > lastPage.value) return;

  emit('update:page', next);
};
</script>

<template>
  <nav
    class="flex flex-wrap items-center justify-between gap-3"
    aria-label="Paginação"
  >
    <p class="text-sm text-muted">Página {{ page }}</p>
    <div class="flex flex-wrap items-center gap-1">
      <ButtonOutline
        size="icon"
        :disabled="disabled || page <= 1"
        aria-label="Primeira página"
        title="Primeira página"
        @click="goTo(1)"
      >
        <ChevronsLeft
          :size="16"
          aria-hidden="true"
        />
      </ButtonOutline>
      <ButtonOutline
        size="icon"
        :disabled="disabled || !hasPrev"
        aria-label="Página anterior"
        title="Página anterior"
        @click="goTo(page - 1)"
      >
        <ChevronLeft
          :size="16"
          aria-hidden="true"
        />
      </ButtonOutline>
      <template
        v-for="(item, index) in pages"
        :key="`${item}-${index}`"
      >
        <span
          v-if="item === 'ellipsis'"
          class="px-1 text-muted"
          aria-hidden="true"
        >
          …
        </span>
        <ButtonStandard
          v-else-if="item === page"
          size="sm"
          :aria-label="`Página ${item}`"
          aria-current="page"
        >
          {{ item }}
        </ButtonStandard>
        <ButtonOutline
          v-else
          size="sm"
          :disabled="disabled"
          :aria-label="`Ir para a página ${item}`"
          @click="goTo(item)"
        >
          {{ item }}
        </ButtonOutline>
      </template>
      <ButtonOutline
        size="icon"
        :disabled="disabled || !hasNext"
        aria-label="Próxima página"
        title="Próxima página"
        @click="goTo(page + 1)"
      >
        <ChevronRight
          :size="16"
          aria-hidden="true"
        />
      </ButtonOutline>
      <ButtonOutline
        size="icon"
        :disabled="disabled || !hasNext"
        aria-label="Última página"
        title="Última página"
        @click="goTo(lastPage)"
      >
        <ChevronsRight
          :size="16"
          aria-hidden="true"
        />
      </ButtonOutline>
    </div>
  </nav>
</template>
