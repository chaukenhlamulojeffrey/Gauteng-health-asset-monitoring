'use client';

import { useEffect, useState } from 'react';
import { Archive } from 'lucide-react';
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
import type { DecommissionRequestData, HealthAsset } from '@/lib/types';

type DecommissionRequestDialogProps = {
  asset: HealthAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DecommissionRequestData, evidence: File) => Promise<void>;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const initialForm: DecommissionRequestData = {
  decommission_date: todayDate(),
  reason: '',
  reference_number: '',
};

export function DecommissionRequestDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: DecommissionRequestDialogProps) {
  const [form, setForm] = useState<DecommissionRequestData>(initialForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...initialForm, decommission_date: todayDate() });
    setError(null);
    setEvidence(null);
  }, [open]);

  const update = <K extends keyof DecommissionRequestData>(
    key: K,
    value: DecommissionRequestData[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (
      !asset ||
      !form.decommission_date ||
      form.decommission_date > todayDate() ||
      form.reason.trim().length < 20 ||
      form.reference_number.trim().length > 191 ||
      !evidence
    ) {
      setError('Enter a valid date and at least 20 characters explaining why the asset should be decommissioned.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        reason: form.reason.trim(),
        reference_number: form.reference_number.trim(),
      }, evidence);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit the decommission request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Archive className="h-5 w-5 text-primary" />
            Request asset decommissioning
          </DialogTitle>
          <DialogDescription>
            Submit the reason and effective date for independent review. The
            asset remains in the register and its custody assignment is retained.
          </DialogDescription>
        </DialogHeader>
        {asset && (
          <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-semibold text-foreground">
              {asset.asset_name} <span className="font-mono">({asset.asset_tag})</span>
            </p>
            <p className="mt-1 text-muted-foreground">
              {asset.district} · {asset.sub_district} · {asset.facility_name}
            </p>
            <p className="mt-1 text-muted-foreground">
              Current status: {asset.status} · Condition: {asset.condition}
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
              <Label htmlFor="decommission-date">
                Effective date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="decommission-date"
                type="date"
                max={todayDate()}
                value={form.decommission_date}
                onChange={(event) => update('decommission_date', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="decommission-reference">Approval or reference number</Label>
              <Input
                id="decommission-reference"
                value={form.reference_number}
                onChange={(event) => update('reference_number', event.target.value)}
                maxLength={191}
                placeholder="Internal authorization or case reference"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="decommission-reason">
              Reason and assessment <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="decommission-reason"
              value={form.reason}
              onChange={(event) => update('reason', event.target.value)}
              minLength={20}
              maxLength={4000}
              rows={5}
              required
              placeholder="Describe the asset's condition, serviceability, repair assessment, and why it should be retired from service."
            />
            <p className="text-xs text-muted-foreground">
              The app records decommissioning separately from disposal. Physical
              disposal requires its own approved process.
            </p>
          </div>
          <EvidencePdfField
            id="decommission-evidence"
            file={evidence}
            onChange={setEvidence}
            title="Decommissioning evidence PDF"
            description="Attach the scanned condition assessment, authorization, or supporting document. PDF only, maximum 10 MB."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !asset}>
              {saving ? 'Submitting…' : 'Submit for approval'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
