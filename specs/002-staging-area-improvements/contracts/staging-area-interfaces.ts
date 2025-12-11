/**
 * Staging Area Component Interfaces
 * 
 * This file defines the TypeScript interfaces for the staging area functionality
 * in FloatingPanel. These interfaces serve as contracts between components
 * and ensure type safety.
 * 
 * Feature: 002-staging-area-improvements
 */

import type { ComputedRef, Ref } from 'vue';
import type { BentoCard } from '@/types/bento';

/**
 * Extended BentoCard with storage metadata
 */
export interface StoredCard extends BentoCard {
  storedAt: number;
}

/**
 * Storage operation result
 */
export interface StorageOperationResult {
  success: boolean;
  reason?: string;
}

/**
 * Storage capacity status
 */
export interface StorageCapacityStatus {
  current: number;
  limit: number;
  isFull: boolean;
  canAccept: boolean;
}

/**
 * FloatingPanel component props
 * Currently no external props required
 */
export interface FloatingPanelProps {
  // Empty - all state managed via composables
}

/**
 * FloatingPanel component emitted events (extended)
 */
export interface FloatingPanelEmits {
  /**
   * Emitted when user clicks to restore a card
   * @param card - The card to restore
   */
  'restore-card': (card: BentoCard) => void;

  /**
   * Emitted when a stored card is removed
   * @param cardId - ID of the removed card
   */
  'remove-stored-card': (cardId: string) => void;

  /**
   * Emitted when user requests to add a new card
   * @param type - Type of card to add
   */
  'add-card': (type: string) => void;

  /**
   * Emitted when drag operation starts from storage
   * @param card - The card being dragged
   */
  'drag-start': (card: StoredCard) => void;

  /**
   * Emitted when drag operation ends
   * @param card - The card that was dragged
   * @param success - Whether the drop was successful
   */
  'drag-end': (card: StoredCard, success: boolean) => void;

  /**
   * Emitted when storage capacity is reached
   */
  'storage-full': () => void;
}

/**
 * Return type for useFloatingPanel composable (extended)
 */
export interface UseFloatingPanelReturn {
  /** Reactive list of stored cards */
  storedCards: ComputedRef<StoredCard[]>;
  
  /** Whether the panel is visible */
  isPanelVisible: ComputedRef<boolean>;
  
  /** Count of stored cards */
  storedCardsCount: ComputedRef<number>;
  
  /** Whether currently dragging from storage */
  isDraggingFromStorage: ComputedRef<boolean>;
  
  /** Whether storage is at capacity (10 cards) */
  isFull: ComputedRef<boolean>;
  
  /** Whether storage can accept new cards */
  canAcceptDrop: ComputedRef<boolean>;
  
  /**
   * Add a card to storage
   * @param card - Card to store
   * @returns Operation result with success status and optional reason
   */
  addToStorage: (card: BentoCard) => StorageOperationResult;
  
  /**
   * Remove a card from storage
   * @param cardId - ID of card to remove
   * @returns The removed card or null if not found
   */
  removeFromStorage: (cardId: string) => BentoCard | null;
  
  /**
   * Clear all stored cards
   */
  clearStorage: () => void;
  
  /**
   * Toggle panel visibility
   */
  togglePanelVisibility: () => void;
  
  /**
   * Start drag operation from storage area
   * @param card - Card to drag
   * @param event - Mouse or touch event
   */
  startDragFromStorage: (card: StoredCard, event: MouseEvent | TouchEvent) => void;
  
  /**
   * End drag operation from storage area
   * @param success - Whether drop was successful
   */
  endDragFromStorage: (success: boolean) => void;
  
  /**
   * Check if storage has capacity for new card
   * @returns true if can accept, false if full
   */
  checkCapacity: () => boolean;
  
  /**
   * Get storage capacity status
   * @returns Current capacity information
   */
  getCapacityStatus: () => StorageCapacityStatus;
}

/**
 * Drag state extension for storage drag operations
 */
export interface StorageDragState {
  /** Currently dragged card from storage */
  draggedStorageCard: StoredCard | null;
  
  /** Whether drag is from storage area */
  isDraggingFromStorage: boolean;
  
  /** Original storage card ID for restoration */
  storageDragOrigin?: string;
  
  /** Whether dragging over storage area (for visual feedback) */
  isDragOverStorage: boolean;
  
  /** Whether storage is full (for rejection feedback) */
  storageCapacityFull: boolean;
}

/**
 * Extended drag state for useDragAndDrop composable
 */
export interface ExtendedDragState {
  /** Currently dragged card */
  draggedCard: BentoCard | StoredCard | null;
  
  /** Drag source: 'grid' or 'storage' */
  dragSource: 'grid' | 'storage' | null;
  
  /** Whether currently dragging */
  isDragging: boolean;
  
  /** Whether dragging over storage area */
  isDragOverStorage: boolean;
  
  /** Whether storage capacity is full */
  storageCapacityFull: boolean;
  
  /** Drop target element */
  dropTarget: HTMLElement | null;
  
  /** Drop preview rectangle */
  dropRect: {
    left: number;
    top: number;
    width: number;
    height: number;
  } | null;
}

/**
 * Return type for useDragAndDrop composable (extended)
 */
export interface UseDragAndDropReturn {
  /** Currently dragged card */
  draggedCard: Ref<BentoCard | null>;
  
  /** Drag source */
  dragSource: Ref<'grid' | 'storage' | null>;
  
  /** Whether currently dragging */
  isDragging: Ref<boolean>;
  
  /** Whether dragging over storage area */
  isDragOverStorage: Ref<boolean>;
  
  /** Drop preview rectangle */
  dropRect: Ref<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>;
  
  /**
   * Start drag operation
   * @param card - Card to drag
   * @param event - Mouse or touch event
   * @param source - Drag source ('grid' or 'storage')
   */
  startDrag: (card: BentoCard, event: MouseEvent | TouchEvent, source?: 'grid' | 'storage') => void;
  
  /**
   * End drag operation
   */
  endDrag: () => void;
  
  /**
   * Update drag position
   * @param event - Mouse or touch event
   * @param columns - Grid columns
   * @param gap - Grid gap
   * @param unit - Grid unit size
   * @param rows - Grid rows
   * @param gridEl - Grid element
   * @param callback - Optional callback after update
   */
  updateDrag: (
    event: MouseEvent | TouchEvent,
    columns: number,
    gap: number,
    unit: number,
    rows: any[] | undefined,
    gridEl: HTMLElement,
    callback?: () => void
  ) => void;
  
  /**
   * Set drag over storage state
   * @param value - Whether dragging over storage
   */
  setDragOverStorage: (value: boolean) => void;
}

/**
 * Visual feedback configuration for drag operations
 */
export interface DragVisualFeedback {
  /** Whether to highlight storage icon */
  highlightIcon: boolean;
  
  /** Hint text to display */
  hintText: string | null;
  
  /** Cursor style */
  cursorStyle: 'default' | 'move' | 'not-allowed';
  
  /** Whether storage is full (for rejection feedback) */
  isFull: boolean;
}


