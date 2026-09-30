import type { ReactNode } from 'react';

interface Props {
  children: ReactNode;
  className?: string;
}

/**
 * Wraps every route's top-level content in the shared layout grid.
 * Provides the consistent left keyline, max-width cap, and section rhythm
 * defined by --page-gutter / --page-max-width / --grid-gap in tokens.css.
 *
 * Usage:
 *   <PageContainer>
 *     <PageHeader ... />
 *     <div className="page-grid--2">...</div>
 *   </PageContainer>
 */
export function PageContainer({ children, className }: Props) {
  return (
    <div className={['page-container', className].filter(Boolean).join(' ')}>
      {children}
    </div>
  );
}
