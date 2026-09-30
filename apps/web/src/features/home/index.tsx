import { CoordinatorHome } from './CoordinatorHome';
import { InstitutionHome } from './InstitutionHome';
import { NcctHome } from './NcctHome';
import { RecruiterHome } from './RecruiterHome';
import { TraineeHome } from './TraineeHome';
import { TrainerHome } from './TrainerHome';
import type { HomeProps } from './shared';

/** Each persona lands on a purpose-built workspace, not a shared dashboard. */
export function HomeView(props: HomeProps) {
  switch (props.persona.role) {
    case 'NCCT_ADMIN': return <NcctHome {...props} />;
    case 'RICM_DIRECTOR': return <InstitutionHome {...props} />;
    case 'RICM_COORDINATOR': return <CoordinatorHome {...props} />;
    case 'TRAINER': return <TrainerHome {...props} />;
    case 'TRAINEE': return <TraineeHome {...props} />;
    case 'RECRUITER': return <RecruiterHome {...props} />;
  }
}
