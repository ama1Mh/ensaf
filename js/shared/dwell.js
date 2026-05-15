// Dwell selection system for hands-free interaction
class Dwell {
  constructor(onSelect, onProgress) {
    this.onSelect = onSelect;
    this.onProgress = onProgress;
    this.items = new Map();
    this.dwellTime = 3500; // milliseconds
  }
  
  setItems(items) {
    this.items.clear();
    items.forEach((item) => {
      this.items.set(item.id, {
        element: item.element,
        startTime: null,
        active: false,
        completed: false
      });
    });
  }
  
  setDwellTime(ms) {
    this.dwellTime = Math.max(1000, Math.min(8000, ms));
  }
  
  update(x, y) {
    let hoveredId = null;
    
    // Find which item is being hovered
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
    
    // Update all items
    for (const [id, item] of this.items) {
      if (id !== hoveredId && item.active) {
        // Lost focus
        item.active = false;
        item.startTime = null;
        this.onProgress(id, 0, false);
      }
    }
    
    if (hoveredId) {
      const item = this.items.get(hoveredId);
      
      if (!item.active) {
        // Just started hovering
        item.active = true;
        item.startTime = performance.now();
      }
      
      const elapsed = performance.now() - item.startTime;
      const progress = Math.min(1, elapsed / this.dwellTime);
      this.onProgress(hoveredId, progress, true);
      
      if (progress >= 1 && !item.completed) {
        // Selection complete
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