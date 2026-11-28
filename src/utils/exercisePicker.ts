import type { Exercise } from '@/db/queries';

let pending: ((exercise: Exercise) => void) | null = null;

export function setPickHandler(handler: (exercise: Exercise) => void) {
  pending = handler;
}

export function deliverPick(exercise: Exercise) {
  const handler = pending;
  pending = null;
  if (!handler) return false;
  handler(exercise);
  return true;
}
