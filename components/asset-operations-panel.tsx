'use client';

import { useEffect, useState } from 'react';
import { ArrowRightLeft, Clock3, FileText, Loader2, ScanSearch } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { fetchAssetOperationHistory } from '@/lib/asset-operations';
import type { AssetOperationHistoryEntry, AssetOperationType } from '@/lib/types';

const sections: {
  type: AssetOperationType;
  title: string;
  Icon: typeof ArrowRightLeft;
}[] = [
  { type: 'transfer', title: 'Custodian transfers', Icon: ArrowRightLeft },
  { type: 'verification', title: 'Asset verification', Icon: ScanSearch },
  { type: 'lifespan_extension', title: 'Lifespan reviews', Icon: Clock3 },
];

export function AssetOperationsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const [entries, setEntries] = useState<Record<AssetOperationType, AssetOperationHistoryEntry[]>>({
    transfer: [],
    verification: [],
    lifespan_extension: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all(sections.map(async ({ type }) => [type, await fetchAssetOperationHistory(type)] as const))
      .then((results) => {
        if (!cancelled) {
          setEntries(Object.fromEntries(results) as Record<AssetOperationType, AssetOperationHistoryEntry[]>);
        }
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load asset operation history.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  return (
    <Card className="space-y-5 p-5">
      <div>
        <h3 className="text-lg font-semibold">Asset control history</h3>
        <p className="text-sm text-muted-foreground">Recent custody, verification, and useful-life actions for your district.</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {loading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading asset control history...
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-3">
          {sections.map(({ type, title, Icon }) => (
            <section key={type} className="space-y-3 rounded-lg border p-4">
              <h4 className="flex items-center gap-2 font-medium">
                <Icon aria-hidden="true" className="h-4 w-4 text-primary" />
                {title}
              </h4>
              {entries[type].length === 0 ? (
                <p className="text-sm text-muted-foreground">No records yet.</p>
              ) : (
                <ul className="space-y-3">
                  {entries[type].map((entry) => (
                    <li key={entry.id} className="border-t pt-3 text-sm first:border-0 first:pt-0">
                      <p className="font-medium">{entry.asset_tag_snapshot} · {entry.asset_name_snapshot}</p>
                      <p className="mt-1 text-muted-foreground">{entry.summary}</p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {entry.occurred_at.slice(0, 10)} · {entry.actor_name} ({entry.actor_persal_number})
                      </p>
                      <a
                        href={`/api/asset-operations/evidence/${encodeURIComponent(entry.operation_type)}/${encodeURIComponent(entry.id)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs text-primary underline underline-offset-2"
                      >
                        <FileText aria-hidden="true" className="h-3.5 w-3.5" />
                        {entry.evidence_file_name}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </Card>
  );
}
