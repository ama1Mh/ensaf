const SCREEN_PARTS = [
  { id: 'sw', src: 'screens/sw.html' },
  { id: 'sp', src: 'screens/sp.html' },
  { id: 'ss', src: 'screens/ss.html' },
  { id: 'sq', src: 'screens/sq.html' },
  { id: 'sl', src: 'screens/sl.html' },
  { id: 'sr', src: 'screens/sr.html' }
];

async function loadScreens() {
  const root = document.getElementById('screens-root');
  if (!root) {
    console.warn('[ScreenLoader] screens-root not found');
    return;
  }

  for (const part of SCREEN_PARTS) {
    try {
      const response = await fetch(part.src);
      if (!response.ok) {
        throw new Error(`Failed to load ${part.src}: ${response.status} ${response.statusText}`);
      }
      const html = await response.text();
      root.insertAdjacentHTML('beforeend', html);
    } catch (error) {
      console.error('[ScreenLoader] Error loading screen fragment:', part.src, error);
    }
  }
}

window.SCREENS_READY = (async () => {
  if (document.readyState === 'loading') {
    await new Promise((resolve) => document.addEventListener('DOMContentLoaded', resolve, { once: true }));
  }
  await loadScreens();
})();
