class DwellSystem {
  constructor(options = {}) {
    this.onSelect = options.onSelect || (() => {});
    this.onProgress = options.onProgress || (() => {});
    this.items = new Map();
    this.dwellTime = CONFIG.DWELL.DEFAULT_MS;
  }

  setItems(itemList) {
    this.items.clear();
    itemList.forEach(item => {
      this.items.set(item.id, {
        element: item.element,
        startTime: null,
        active: false,
        completed: false
      });
    });
  }

  setDwellTime(ms) {
    this.dwellTime = Math.max(
      CONFIG.DWELL.MIN_MS,
      Math.min(CONFIG.DWELL.MAX_MS, ms)
    );
  }

  update(x, y) {
    let hoveredId = null;
    
    // Find hovered item
    for (const [id, item] of this.items) {
      if (item.completed) continue;
      const rect = item.element.getBoundingClientRect();
      const padding = 30;
      
      if (x >= rect.left - padding && 
          x <= rect.right + padding && 
          y >= rect.top - padding && 
          y <= rect.bottom + padding) {
        hoveredId = id;
        break;
      }
    }
    
    // Update states
    for (const [id, item] of this.items) {
      if (id !== hoveredId && item.active) {
        item.active = false;
        item.startTime = null;
        this.onProgress(id, 0, false);
      }
    }
    
    if (hoveredId) {
      const item = this.items.get(hoveredId);
      if (!item.active) {
        item.active = true;
        item.startTime = performance.now();
      }
      
      const elapsed = performance.now() - item.startTime;
      const progress = Math.min(1, elapsed / this.dwellTime);
      this.onProgress(hoveredId, progress, true);
      
      if (progress >= 1 && !item.completed) {
        item.completed = true;
        this.onSelect(hoveredId);
      }
    }
  }

  reset() {
    for (const [id, item] of this.items) {
      item.startTime = null;
      item.active = false;
      item.completed = false;
      this.onProgress(id, 0, false);
    }
  }

  destroy() {
    this.items.clear();
  }
}