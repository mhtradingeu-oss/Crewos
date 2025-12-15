
// Pricing Page (Server Component)
// Architectural: Read-only, no business logic
// All imports explicit, ESM, alias-based

import { listPricing } from '@/lib/api/pricing.ts';
import type { Pricing } from '@/lib/api/types.ts';

export const dynamic = 'force-dynamic';

export default async function PricingPage() {
  const pricing = await listPricing();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Pricing</h1>
      <table className="min-w-full border text-sm">
        <thead>
          <tr>
            <th className="border px-2 py-1">ID</th>
            <th className="border px-2 py-1">Product</th>
            <th className="border px-2 py-1">Price</th>
            <th className="border px-2 py-1">Currency</th>
            <th className="border px-2 py-1">Valid From</th>
            <th className="border px-2 py-1">Valid To</th>
          </tr>
        </thead>
        <tbody>
          {pricing.items.map((pr: Pricing) => (
            <tr key={pr.id}>
              <td className="border px-2 py-1">{pr.id}</td>
              <td className="border px-2 py-1">{pr.productId}</td>
              <td className="border px-2 py-1">{pr.price}</td>
              <td className="border px-2 py-1">{pr.currency}</td>
              <td className="border px-2 py-1">{pr.validFrom}</td>
              <td className="border px-2 py-1">{pr.validTo || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
