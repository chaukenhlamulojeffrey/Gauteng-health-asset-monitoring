'use client';

import { useEffect, useState } from 'react';
import { FileText } from 'lucide-react';
import type { WorkflowEvidenceType } from '@/lib/workflow-evidence';

type EvidenceMetadata = {
  id: string;
  action: string;
  file_name: string;
  uploaded_at: string;
};

export function WorkflowEvidenceLinks({
  workflowType,
  workflowId,
}: {
  workflowType: WorkflowEvidenceType;
  workflowId: string;
}) {
  const [evidence, setEvidence] = useState<EvidenceMetadata[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const query = new URLSearchParams({
      type: workflowType,
      workflowId,
    });
    fetch(`/api/workflow-evidence?${query.toString()}`)
      .then(async (response) => {
        if (!response.ok) {
          const result = (await response.json()) as { error?: string };
          throw new Error(result.error || 'Unable to load evidence documents.');
        }
        return response.json() as Promise<EvidenceMetadata[]>;
      })
      .then(setEvidence)
      .catch((loadError: unknown) => {
        setError(
          loadError instanceof Error
            ? loadError.message
            : 'Unable to load evidence documents.'
        );
      });
  }, [workflowId, workflowType]);

  if (error) {
    return <p role="alert" className="text-xs text-destructive">{error}</p>;
  }
  if (!evidence.length) return null;
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
      {evidence.map((item) => (
        <a
          key={item.id}
          href={`/api/workflow-evidence/${encodeURIComponent(item.id)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-primary underline underline-offset-2"
        >
          <FileText aria-hidden="true" className="h-3.5 w-3.5" />
          {item.action}: {item.file_name}
        </a>
      ))}
    </div>
  );
}
