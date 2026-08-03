import { useDashboard } from '../../contexts/DashboardContext';
import CompetitionMapModule from '../../components/competition/CompetitionMapModule';
import { PremiumGate } from '../../lib/premium';

/** Dashboard route — reuses shell dark mode, does not redesign layout chrome */
export default function CompetitionMapPage() {
  const { dark } = useDashboard();
  return (
    <PremiumGate featureName="Competition Map">
      <CompetitionMapModule dark={dark} embedded />
    </PremiumGate>
  );
}
