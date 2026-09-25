import { ref, watch } from 'vue';

const STORAGE_KEY = 'ecotrack-theme';

/**
 * @returns {'light' | 'dark'}
 */
const readStoredTheme = () => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Storage can be blocked; fall through to the document or system theme.
  }

  return null;
};

/**
 * @returns {'light' | 'dark'}
 */
const readTheme = () => {
  const stored = readStoredTheme();

  if (stored) return stored;

  const current = document.documentElement.dataset.theme;

  if (current === 'light' || current === 'dark') return current;

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};

/**
 * @param {'light' | 'dark'} value
 * @param {boolean} persist
 */
const applyTheme = (value, persist) => {
  document.documentElement.dataset.theme = value;
  document.documentElement.style.colorScheme = value;

  if (!persist) return;

  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // Preference still applies for this session.
  }
};

/** @type {import('vue').Ref<'light' | 'dark'>} */
const theme = ref(readTheme());

applyTheme(theme.value, false);

watch(theme, (value) => {
  applyTheme(value, true);
});

export const useTheme = () => {
  const toggleTheme = () => {
    theme.value = theme.value === 'dark' ? 'light' : 'dark';
  };

  return { theme, toggleTheme };
};
