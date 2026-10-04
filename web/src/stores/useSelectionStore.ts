/**
 * Canonical Single Selection Store Re-export (Rule R6: Exactly one active selection state)
 * Unifies store/ and stores/ to guarantee a single singleton instance across all components.
 */

export * from '../store/useSelectionStore';
export { default } from '../store/useSelectionStore';
