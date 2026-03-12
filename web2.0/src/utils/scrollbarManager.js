/**
 * Scrollbar Manager - Smart auto-hide scrollbar system
 * 
 * Features:
 * - Auto-hide scrollbar when not scrolling
 * - Show scrollbar during scroll with smooth transition
 * - Cross-browser compatible (Chrome, Firefox, Safari, Edge)
 * - Works with modal/drawer scroll lock
 */

class ScrollbarManager {
    constructor(options = {}) {
        this.scrollTimeout = options.scrollTimeout || 1000;
        this.isLocked = false;
        this.scrollHandler = null;
        this.mouseMoveHandler = null;
        this.mouseLeaveHandler = null;
        this.timeoutId = null;
        this.savedScrollY = 0;
        this.scrollbarWidth = 0;
        this.initialized = false;
    }

    init() {
        if (this.initialized) return;
        
        // Ensure body exists
        if (!document.body) {
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.scrollHandler = this.handleScroll.bind(this);
        this.mouseMoveHandler = this.handleMouseMove.bind(this);
        this.mouseLeaveHandler = this.handleMouseLeave.bind(this);
        
        // Listen to body scroll since html has overflow: hidden
        document.body.addEventListener('scroll', this.scrollHandler, { passive: true });
        
        // Show scrollbar on mouse near right edge
        document.addEventListener('mousemove', this.mouseMoveHandler, { passive: true });
        document.addEventListener('mouseleave', this.mouseLeaveHandler);
        
        // Calculate scrollbar width
        this.scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
        
        // Initial state
        this.hideScrollbar();
        
        this.initialized = true;
    }

    handleScroll() {
        if (this.isLocked) return;
        
        this.showScrollbar();
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        this.timeoutId = setTimeout(() => {
            this.hideScrollbar();
        }, this.scrollTimeout);
    }

    handleMouseMove(e) {
        if (this.isLocked) return;
        
        // Show scrollbar when mouse is within 20px of right edge
        if (window.innerWidth - e.clientX < 20) {
            document.body.classList.add('scrollbar-visible');
        } else {
            document.body.classList.remove('scrollbar-visible');
        }
    }

    handleMouseLeave() {
        if (this.isLocked) return;
        document.body.classList.remove('scrollbar-visible');
    }

    showScrollbar() {
        document.body.classList.add('scrolling');
    }

    hideScrollbar() {
        document.body.classList.remove('scrolling');
    }

    lock() {
        if (this.isLocked) return;
        
        this.isLocked = true;
        
        // Save current scroll position
        this.savedScrollY = document.body.scrollTop;
        
        // Add lock class to body (this sets overflow: hidden via CSS)
        document.body.classList.add('drawer-scroll-locked');
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        this.hideScrollbar();
    }

    unlock() {
        // Always remove lock class, regardless of isLocked state
        this.isLocked = false;
        
        // Remove lock class from body
        document.body.classList.remove('drawer-scroll-locked');
    }

    destroy() {
        if (!this.initialized) return;
        
        if (this.scrollHandler) {
            document.body.removeEventListener('scroll', this.scrollHandler);
        }
        if (this.mouseMoveHandler) {
            document.removeEventListener('mousemove', this.mouseMoveHandler);
        }
        if (this.mouseLeaveHandler) {
            document.removeEventListener('mouseleave', this.mouseLeaveHandler);
        }
        
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        document.body.classList.remove('scrolling', 'scrollbar-visible', 'drawer-scroll-locked');
        this.initialized = false;
    }
}

let instance = null;

export function getScrollbarManager() {
    if (!instance) {
        instance = new ScrollbarManager();
    }
    return instance;
}

export function lockPageScroll() {
    const manager = getScrollbarManager();
    manager.lock();
}

export function unlockPageScroll() {
    const manager = getScrollbarManager();
    manager.unlock();
}

export default ScrollbarManager;
