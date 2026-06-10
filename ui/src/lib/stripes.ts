/**
 * Diagonal stripe fills used to render "break / away" time so it reads as
 * "not a task" rather than a solid project color.
 */

/** Fine stripe for small dots (project legend, stat cards). */
export const STRIPE_DOT =
  "repeating-linear-gradient(45deg, #3a3f4b 0, #3a3f4b 3px, #16181d 3px, #16181d 6px)";

/** Coarser stripe for the day histogram bars. */
export const STRIPE_BAR =
  "repeating-linear-gradient(45deg, #3a3f4b 0, #3a3f4b 4px, #16181d 4px, #16181d 8px)";
