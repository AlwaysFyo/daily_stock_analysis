/**
 * Bottom Drawer Modal Component - 底部抽屉弹窗
 * 
 * Features:
 * - Slides up from bottom of screen
 * - Background content remains visible (no overlay dimming)
 * - Swipe down to close gesture support
 * - Smooth animation transitions
 * - Responsive design
 * - Smart scrollbar management
 */

const { ref, watch, onMounted, onUnmounted, nextTick } = Vue;

import { lockPageScroll, unlockPageScroll } from '../../utils/scrollbarManager.js';

export default {
    name: 'BottomDrawerModal',

    props: {
        show: {
            type: Boolean,
            default: false
        },
        title: {
            type: String,
            default: ''
        },
        height: {
            type: String,
            default: '70%' // Default height percentage
        }
    },

    emits: ['close'],

    setup(props, { emit }) {
        const isVisible = ref(false);
        const isDragging = ref(false);
        const startY = ref(0);
        const currentY = ref(0);
        const translateY = ref(0);
        const drawerRef = ref(null);
        const previousActiveElement = ref(null);

        // Touch/Mouse event handlers for swipe to close
        const handleStart = (y) => {
            isDragging.value = true;
            startY.value = y;
            currentY.value = y;
        };

        const handleMove = (y) => {
            if (!isDragging.value) return;
            currentY.value = y;
            const deltaY = currentY.value - startY.value;
            
            // Only allow dragging down (positive delta)
            if (deltaY > 0) {
                translateY.value = deltaY;
            }
        };
        
        const handleEnd = () => {
            if (!isDragging.value) return;
            isDragging.value = false;
            
            const deltaY = currentY.value - startY.value;
            const threshold = 100; // Close threshold in pixels
            
            if (deltaY > threshold) {
                close();
            } else {
                // Snap back to open position
                translateY.value = 0;
            }
        };

        // Touch events
        const onTouchStart = (e) => {
            handleStart(e.touches[0].clientY);
        };

        const onTouchMove = (e) => {
            handleMove(e.touches[0].clientY);
        };

        const onTouchEnd = () => {
            handleEnd();
        };

        // Mouse events
        const onMouseDown = (e) => {
            handleStart(e.clientY);
        };

        const onMouseMove = (e) => {
            handleMove(e.clientY);
        };

        const onMouseUp = () => {
            handleEnd();
        };

        // Close modal
        const close = () => {
            isVisible.value = false;
            translateY.value = 0;
            setTimeout(() => {
                emit('close');
                restoreFocus();
            }, 300);
        };

        const restoreFocus = () => {
            if (previousActiveElement.value) {
                previousActiveElement.value.focus();
            }
        };

        // Handle escape key
        const handleKeydown = (e) => {
            if (e.key === 'Escape' && props.show) {
                close();
            }
        };

        // Watch show prop
        watch(() => props.show, (newVal) => {
            if (newVal) {
                previousActiveElement.value = document.activeElement;
                lockPageScroll();
                // Small delay to allow transition
                setTimeout(() => {
                    isVisible.value = true;
                }, 10);
            } else {
                isVisible.value = false;
                translateY.value = 0;
                unlockPageScroll();
            }
        });

        onMounted(() => {
            document.addEventListener('keydown', handleKeydown);
        });

        onUnmounted(() => {
            document.removeEventListener('keydown', handleKeydown);
            unlockPageScroll();
        });

        return {
            isVisible,
            isDragging,
            translateY,
            drawerRef,
            close,
            onTouchStart,
            onTouchMove,
            onTouchEnd,
            onMouseDown,
            onMouseMove,
            onMouseUp,
        };
    },

    template: `
        <teleport to="body">
            <transition name="drawer-fade">
                <div
                    v-if="show"
                    class="bottom-drawer-container"
                    :class="{ 'is-visible': isVisible }"
                >
                    <!-- Handle bar for dragging -->
                    <div 
                        class="drawer-handle-bar"
                        @touchstart="onTouchStart"
                        @touchmove="onTouchMove"
                        @touchend="onTouchEnd"
                        @mousedown="onMouseDown"
                    >
                        <div class="handle-indicator"></div>
                    </div>

                    <!-- Drawer content -->
                    <div
                        ref="drawerRef"
                        class="bottom-drawer"
                        :class="{ 'is-visible': isVisible, 'is-dragging': isDragging }"
                    >
                        <!-- Header -->
                        <div class="drawer-header">
                            <h3 class="drawer-title">{{ title }}</h3>
                            <button class="drawer-close-btn btn-icon-only" @click="close" aria-label="关闭">
                                <i class="bi bi-x-lg"></i>
                            </button>
                        </div>

                        <!-- Content slot -->
                        <div class="drawer-content">
                            <slot></slot>
                        </div>
                    </div>
                </div>
            </transition>
        </teleport>
    `
};
