import { PortfolioPage } from '../components/portfolio/PortfolioPage';
import publishedPortfolio from '../data/publishedPortfolio.json';
import { migrateProfile } from '../lib/schema';

// The production homepage must use repository-backed data rather than
// IndexedDB: visitors do not share the browser storage used by the editor.
const portfolio = migrateProfile(publishedPortfolio);

export function PortfolioHome() {
  return <PortfolioPage cv={portfolio} />;
}
