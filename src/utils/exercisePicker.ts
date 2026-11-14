import type { Exercise } from '@/db/queries';

/**
 * Lets a screen open the exercise picker and get the chosen exercise back
 * without saving anything to the database first (used by the routine editor).
 */
let pending: ((exercise: Exercise) => void) | null = null;

export function setPickHandler(handler: (exercise: Exercise) => void) {
  pending = handler;
}

/** Delivers the pick to the waiting screen. Returns false if nobody was waiting. */
export function deliverPick(exercise: Exercise) {
  const handler = pending;
  pending = null;
  if (!handler) return false;
  handler(exercise);
  return true;
}
