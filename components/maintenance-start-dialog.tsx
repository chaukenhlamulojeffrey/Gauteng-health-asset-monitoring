'use client';

import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import { EvidencePdfField } from '@/components/evidence-pdf-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { HealthAsset, MaintenanceStartData } from '@/lib/types';

type MaintenanceStartDialogProps = {
  asset: HealthAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: MaintenanceStartData, evidence: File) => Promise<void>;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: MaintenanceStartData = {
  started_at: todayDate(),
  issue_description: '',
  service_provider: '',
  estimated_cost: null,
  reference_number: '',
};

export function MaintenanceStartDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: MaintenanceStartDialogProps) {
  const [form, setForm] = useState<MaintenanceStartData>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...initialForm, started_at: todayDate() });
    setError(null);
    setEvidence(null);
  }, [open]);

  const update = <K extends keyof MaintenanceStartData>(
    key: K,
    value: MaintenanceStartData[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (
      !asset ||
      !form.started_at ||
      form.started_at > todayDate() ||
      form.issue_description.trim().length < 10 ||
      form.estimated_cost !== null &&
        (!Number.isFinite(form.estimated_cost) || form.estimated_cost < 0) ||
      !evidence
    ) {
      setError('Enter a valid start date, issue description, and estimated cost.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        issue_description: form.issue_description.trim(),
        service_provider: form.service_provider.trim(),
        reference_number: form.reference_number.trim(),
      }, evidence);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to start maintenance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-primary" />
            Start asset maintenance
          </DialogTitle>
          <DialogDescription>
            Record the issue and service details. This moves the asset from
            Active to In Maintenance without changing its custodian.
          </DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {asset.asset_name} <span className="font-mono">({asset.asset_tag})</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              {asset.district} · {asset.sub_district || 'Sub-district not recorded'} · {asset.facility_name}
            </p>
            <p className="mt-1 text-muted-foreground">
              Custodian: {asset.custodian_name || 'Not assigned'}
              {asset.persal_number ? ` · PERSAL ${asset.persal_number}` : ''}
            </p>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-start-date">Start date <span className="text-destructive">*</span></Label>
              <Input
                id="maintenance-start-date"
                type="date"
                max={todayDate()}
                value={form.started_at}
                onChange={(event) => update('started_at', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-provider">Service provider</Label>
              <Input
                id="maintenance-provider"
                value={form.service_provider}
                onChange={(event) => update('service_provider', event.target.value)}
                maxLength={255}
                placeholder="Internal workshop or provider"
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-estimated-cost">Estimated cost (R)</Label>
              <Input
                id="maintenance-estimated-cost"
                type="number"
                min="0"
                step="0.01"
                value={form.estimated_cost ?? ''}
                onChange={(event) =>
                  update(
                    'estimated_cost',
                    event.target.value === '' ? null : Number(event.target.value)
                  )
                }
                placeholder="Optional"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-reference">Work order / reference</Label>
              <Input
                id="maintenance-reference"
                value={form.reference_number}
                onChange={(event) => update('reference_number', event.target.value)}
                maxLength={191}
                placeholder="Optional reference"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-issue">Issue and requested work <span className="text-destructive">*</span></Label>
            <Textarea
              id="maintenance-issue"
              value={form.issue_description}
              onChange={(event) => update('issue_description', event.target.value)}
              minLength={10}
              maxLength={4000}
              rows={4}
              required
              placeholder="Describe the fault, damage, or service required."
            />
          </div>
          <EvidencePdfField
            id="maintenance-start-evidence"
            file={evidence}
            onChange={setEvidence}
            title="Maintenance evidence PDF"
            description="Attach the scanned maintenance request, service quotation, or supporting document. PDF only, maximum 10 MB."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !asset}>
              {saving ? 'Starting…' : 'Start maintenance'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
