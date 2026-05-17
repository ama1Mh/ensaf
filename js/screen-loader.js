/**
 * Screen Loader
 * Fetches HTML fragments and injects them into #screens-root.
 *
 * KEY FIX: window.SCREENS_READY is set synchronously to a Promise so
 * any script that awaits it will wait for ALL fragments before running.
 * Previously the promise was created after an async gap, so ROUTER could
 * boot before fragments existed in the DOM.
 */

const SCREEN_PARTS = [
  { id: 'sw',      src: 'screens/sw.html'      },
  { id: 'sp',      src: 'screens/sp.html'      },
  { id: 'ss',      src: 'screens/ss.html'      },
  { id: 'sq',      src: 'screens/sq.html'      },
  { id: 'sl',      src: 'screens/sl.html'      },
  { id: 'sr',      src: 'screens/sr.html'      },
  { id: 'login',   src: 'screens/login.html'   },
  { id: 'profile', src: 'screens/profile.html' },
];

async function loadScreens() {
  const root = document.getElementById('screens-root');
  if (!root) {
    console.warn('[ScreenLoader] #screens-root not found');
    return;
  }

  console.log('[ScreenLoader] Loading screen fragments');

  // Load all fragments in parallel for speed
  const results = await Promise.allSettled(
    SCREEN_PARTS.map(part => fetch(part.src).then(r => {
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      return r.text().then(html => ({ id: part.id, html }));
    }))
  );

  results.forEach((result, i) => {
    if (result.status === 'fulfilled') {
      root.insertAdjacentHTML('beforeend', result.value.html);
    } else {
      console.error(`[ScreenLoader] Failed to load ${SCREEN_PARTS[i].src}:`, result.reason);
    }
  });

  console.log('[ScreenLoader] Screen fragments loaded');
}

// Set window.SCREENS_READY synchronously so ROUTER and App can await it
// from the very first line — no async gap where it could be undefined.
window.SCREENS_READY = (async () => {
  if (document.readyState === 'loading') {
    await new Promise(resolve =>
      document.addEventListener('DOMContentLoaded', resolve, { once: true })
    );
  }
  await loadScreens();
})();