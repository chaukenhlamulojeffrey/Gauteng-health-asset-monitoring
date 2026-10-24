'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { AppRole } from '@/lib/roles';

type AuditEntry = {
  id: number;
  asset_id: string;
  asset_tag: string;
  action: 'created' | 'updated' | 'deleted';
  actor_name: string;
  actor_persal_number: string;
  actor_role: AppRole;
  before_snapshot: Record<string, unknown> | null;
  after_snapshot: Record<string, unknown> | null;
  created_at: string;
};

const PAGE_SIZE = 50;

export default function AssetAuditPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/audit/assets?limit=${PAGE_SIZE}&offset=${offset}`)
      .then(async (response) => {
        if (response.status === 401) {
          router.replace('/login');
          return null;
        }
        if (response.status === 403) {
          router.replace('/');
          return null;
        }
        const result = (await response.json()) as
          | { entries: AuditEntry[]; total: number }
          | { error?: string };
        if (!response.ok || !('entries' in result)) {
          throw new Error(
            'error' in result ? result.error || 'Unable to load audit history.' : 'Unable to load audit history.'
          );
        }
        return result;
      })
      .then((result) => {
        if (cancelled || !result) return;
        setEntries(result.entries);
        setTotal(result.total);
      })
      .catch((loadError: unknown) => {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load audit history.'
          );
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [offset, router]);

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Asset audit history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Record of asset registrations, edits, and deletions, including the acting user and saved before/after details.
          </p>
        </div>
        {error && (
          <Card role="alert" className="border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </Card>
        )}
        {loading ? (
          <Card className="p-5 text-sm text-muted-foreground">Loading audit history…</Card>
        ) : entries.length === 0 ? (
          <Card className="p-5 text-sm text-muted-foreground">No asset changes have been recorded yet.</Card>
        ) : (
          <div className="space-y-3">
            {entries.map((entry) => (
              <Card key={entry.id} className="space-y-3 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-mono text-sm font-semibold text-primary">{entry.asset_tag}</p>
                    <p className="mt-1 text-sm capitalize text-foreground">
                      {entry.action} · {entry.actor_name} ({entry.actor_role.replace(/_/g, ' ')})
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Actor PERSAL: {entry.actor_persal_number} · {entry.created_at}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground">Record #{entry.id}</span>
                </div>
                {(entry.before_snapshot || entry.after_snapshot) && (
                  <details>
                    <summary className="cursor-pointer text-sm text-primary">
                      View recorded details
                    </summary>
                    <div className="mt-3 grid gap-3 md:grid-cols-2">
                      {entry.before_snapshot && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">Before</p>
                          <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                            {JSON.stringify(entry.before_snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                      {entry.after_snapshot && (
                        <div>
                          <p className="mb-1 text-xs font-semibold text-muted-foreground">After</p>
                          <pre className="max-h-72 overflow-auto rounded-md bg-muted p-3 text-xs">
                            {JSON.stringify(entry.after_snapshot, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </Card>
            ))}
          </div>
        )}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">
            {total === 0 ? '0 records' : `Showing ${offset + 1}–${offset + entries.length} of ${total}`}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              disabled={offset === 0 || loading}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={offset + entries.length >= total || loading}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
