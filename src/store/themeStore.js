import { create } from 'zustand'

const useThemeStore = create((set) => ({
  darkMode: localStorage.getItem('darkMode') === 'true',

  toggleDarkMode: () => set((state) => {
    const newValue = !state.darkMode
    localStorage.setItem('darkMode', newValue)
    if (newValue) {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    return { darkMode: newValue }
  }),

  initTheme: () => {
    const isDark = localStorage.getItem('darkMode') === 'true'
    if (isDark) {
      document.documentElement.setAttribute('data-theme', 'dark')
    }
  }
}))

export default useThemeStore