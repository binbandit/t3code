/**
 * Module-level registry for the active chat composer's focus function.
 * ChatView registers itself here via useLayoutEffect so that other parts
 * of the app (e.g. command palette) can imperatively focus the input.
 */

let focusFn: (() => void) | null = null;

export function registerComposerFocus(fn: () => void): () => void {
  focusFn = fn;
  return () => {
    if (focusFn === fn) focusFn = null;
  };
}

export function focusComposerInput(): void {
  focusFn?.();
}
