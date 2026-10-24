'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
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
import type { HealthAsset, LostAssetReportData } from '@/lib/types';

type LostAssetReportDialogProps = {
  asset: HealthAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: LostAssetReportData, evidence: File) => Promise<void>;
};

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

const emptyForm: LostAssetReportData = {
  last_seen_date: todayDate(),
  last_known_location: '',
  circumstances: '',
  reference_number: '',
};

export function LostAssetReportDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: LostAssetReportDialogProps) {
  const [form, setForm] = useState<LostAssetReportData>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);

  useEffect(() => {
    if (!open) return;
    setForm({ ...emptyForm, last_seen_date: todayDate() });
    setError(null);
    setEvidence(null);
  }, [open]);

  const update = <K extends keyof LostAssetReportData>(
    key: K,
    value: LostAssetReportData[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (
      !asset ||
      !form.last_seen_date ||
      form.last_seen_date > todayDate() ||
      form.last_known_location.trim().length < 3 ||
      form.circumstances.trim().length < 20 ||
      form.reference_number.trim().length > 191 ||
      !evidence
    ) {
      setError('Add a valid last-seen date, location, and at least 20 characters describing what happened.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        last_known_location: form.last_known_location.trim(),
        circumstances: form.circumstances.trim(),
        reference_number: form.reference_number.trim(),
      }, evidence);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit the loss report.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-warning" />
            Report a missing asset
          </DialogTitle>
          <DialogDescription>
            Record the known facts. The asset will be marked Loss Report Pending
            until an independent Supervisor or Asset Manager reviews the report.
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
              Current custodian: {asset.custodian_name || 'Unassigned'}
              {asset.persal_number ? ` · PERSAL: ${asset.persal_number}` : ''}
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
              <Label htmlFor="loss-last-seen">
                Date last known in custody <span className="text-destructive">*</span>
              </Label>
              <Input
                id="loss-last-seen"
                type="date"
                max={todayDate()}
                value={form.last_seen_date}
                onChange={(event) => update('last_seen_date', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="loss-reference">Case or reference number</Label>
              <Input
                id="loss-reference"
                value={form.reference_number}
                onChange={(event) => update('reference_number', event.target.value)}
                maxLength={191}
                placeholder="Police case, incident, or internal reference"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loss-last-location">
              Last known location <span className="text-destructive">*</span>
            </Label>
            <Input
              id="loss-last-location"
              value={form.last_known_location}
              onChange={(event) => update('last_known_location', event.target.value)}
              minLength={3}
              maxLength={500}
              required
              placeholder="Facility, room, department, or other known location"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loss-circumstances">
              What happened? <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="loss-circumstances"
              value={form.circumstances}
              onChange={(event) => update('circumstances', event.target.value)}
              minLength={20}
              maxLength={4000}
              rows={5}
              required
              placeholder="Describe when and how the asset was discovered missing, checks already completed, and any immediate actions taken."
            />
            <p className="text-xs text-muted-foreground">
              Include factual details only. Do not include passwords, medical information, or unrelated personal data.
            </p>
          </div>
          <EvidencePdfField
            id="lost-report-evidence"
            file={evidence}
            onChange={setEvidence}
            title="Lost-asset evidence PDF"
            description="Attach the scanned incident report, police case document, or supporting evidence. PDF only, maximum 10 MB."
          />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !asset}>
              {saving ? 'Submitting…' : 'Submit for review'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
