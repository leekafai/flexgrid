import { ref, computed } from 'vue';

export const useTheme = () => {
  const isDark = ref(false);

  const toggleTheme = () => {
    isDark.value = !isDark.value;
    document.documentElement.classList.toggle('dark', isDark.value);
    localStorage.setItem('bento-theme', isDark.value ? 'dark' : 'light');
  };

  const initializeTheme = () => {
    const savedTheme = localStorage.getItem('bento-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    isDark.value = savedTheme === 'dark' || (!savedTheme && prefersDark);
    document.documentElement.classList.toggle('dark', isDark.value);
  };

  // Initialize theme on composable creation
  initializeTheme();

  return {
    isDark,
    toggleTheme,
    initializeTheme
  };
};