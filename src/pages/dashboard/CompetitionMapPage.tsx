import { useDashboard } from '../../contexts/DashboardContext';
import CompetitionMapModule from '../../components/competition/CompetitionMapModule';

/** Dashboard route — reuses shell dark mode, does not redesign layout chrome */
export default function CompetitionMapPage() {
  const { dark } = useDashboard();
  return <CompetitionMapModule dark={dark} embedded />;
}
