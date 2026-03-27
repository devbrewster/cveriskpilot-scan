import { PortfolioDashboard } from '@/components/portfolio/portfolio-dashboard';

export default function PortfolioPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Portfolio</h2>
        <p className="mt-1 text-sm text-gray-500">
          Cross-client overview of vulnerability posture across your entire organization.
        </p>
      </div>
      <PortfolioDashboard />
    </div>
  );
}
