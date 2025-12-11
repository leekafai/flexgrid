/**
 * FloatingPanel Component Interfaces
 * 
 * This file defines the TypeScript interfaces for the FloatingPanel component
 * and its related composables. These interfaces serve as contracts between
 * components and ensure type safety.
 */

import type { ComputedRef } from 'vue';
import type { BentoCard } from '@/types/bento';

/**
 * Extended BentoCard with storage metadata
 */
export interface StoredCard extends BentoCard {
  storedAt: number;
}

/**
 * FloatingPanel component props
 * Currently no external props required
 */
export interface FloatingPanelProps {
  // Empty - all state managed via composables
}

/**
 * FloatingPanel component emitted events
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
}

/**
 * Return type for useFloatingPanel composable
 */
export interface UseFloatingPanelReturn {
  /** Reactive list of stored cards */
  storedCards: ComputedRef<StoredCard[]>;
  
  /** Whether the panel is visible */
  isPanelVisible: ComputedRef<boolean>;
  
  /** Count of stored cards */
  storedCardsCount: ComputedRef<number>;
  
  /**
   * Add a card to storage
   * @param card - Card to store
   */
  addToStorage: (card: BentoCard) => void;
  
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
   */
  startDragFromStorage?: (card: StoredCard) => void;
  
  /**
   * End drag operation from storage area
   * @param success - Whether drop was successful
   */
  endDragFromStorage?: (success: boolean) => void;
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
}


