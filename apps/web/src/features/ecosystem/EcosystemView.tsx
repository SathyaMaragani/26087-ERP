import { useState } from 'react';
import type { UserPersona } from '../../types';
import type { ModuleId } from '../../shell/modules';
import { PageHeader, Tabs } from '../../ui/primitives';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { CapabilityMatrix } from './CapabilityMatrix';
import { ExplorerView } from './ExplorerView';

type Tab = 'explore' | 'architecture' | 'capabilities';

export function EcosystemView({ persona, onNavigate }: { persona: UserPersona; onNavigate: (id: ModuleId) => void }) {
  const [tab, setTab] = useState<Tab>('explore');
  return (
    <>
      <PageHeader eyebrow="Ecosystem" title={<>One connected <em className="serif-em">system</em></>}
        description="Fly from the national network into an institution, a programme and a learner; see how the parts connect; and check what each official deliverable does today." />
      <Tabs label="Ecosystem view" value={tab} onChange={setTab} tabs={[{ id: 'explore', label: 'Zoom through' }, { id: 'architecture', label: 'Architecture' }, { id: 'capabilities', label: 'Capabilities' }]} />
      <div className="att-body">
        {tab === 'explore' && <ExplorerView persona={persona} onOpenPeople={() => onNavigate('trainees')} />}
        {tab === 'architecture' && <ArchitectureDiagram onNavigate={onNavigate} />}
        {tab === 'capabilities' && <CapabilityMatrix onNavigate={onNavigate} />}
      </div>
    </>
  );
}
