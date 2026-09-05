import { PortfolioPage } from '../components/portfolio/PortfolioPage';
import { sampleCV } from '../data/sampleCV';
import { migrateProfile } from '../lib/schema';

// The production homepage must use repository-backed data rather than
// IndexedDB: visitors do not share the browser storage used by the editor.
const portfolio = migrateProfile(sampleCV);

export function PortfolioHome() {
  return <PortfolioPage cv={portfolio} />;
}
