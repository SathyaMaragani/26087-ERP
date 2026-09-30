import { CommandCenter } from '../../dashboard/CommandCenter';
import type { HomeProps } from './shared';

/** NCCT_ADMIN's Home is the National Digital Command Center — see dashboard/CommandCenter.tsx. */
export function NcctHome(props: HomeProps) {
  return <CommandCenter {...props} />;
}
