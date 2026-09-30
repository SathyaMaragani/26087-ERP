import { useId, type ReactNode } from 'react';

/**
 * Label + control with the association handled for you. The control is given as a
 * render function so it receives the generated id and a described-by hint id.
 */
export function Field({ label, hint, wide, children }: {
  label: string;
  hint?: string;
  wide?: boolean;
  children: (props: { id: string; 'aria-describedby'?: string }) => ReactNode;
}) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className={`field${wide ? ' span-2' : ''}`}>
      <label htmlFor={id}>{label}</label>
      {children({ id, 'aria-describedby': hintId })}
      {hint && <small id={hintId} className="field-hint">{hint}</small>}
    </div>
  );
}
