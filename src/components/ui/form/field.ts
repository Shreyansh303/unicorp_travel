/** Ids and ARIA wiring shared by every form field. */
export function fieldAria(id: string, hint?: string, error?: string) {
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;
  return {
    hintId,
    errorId,
    describedBy,
    invalid: error ? ('true' as const) : undefined,
  };
}
