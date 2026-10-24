'use client';

import { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { HealthAsset, DisposalRequestData } from '@/lib/types';
import { EvidencePdfField } from '@/components/evidence-pdf-field';

const methods = [
  'Recycling',
  'Auction',
  'Donation',
  'Destruction',
  'Return to supplier',
  'Other',
] as const;

type DisposalRequestDialogProps = {
  asset: HealthAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: DisposalRequestData, evidence: File) => Promise<void>;
};

const today = new Date().toISOString().slice(0, 10);
const emptyForm: DisposalRequestData = {
  disposal_method: '',
  disposal_reason: '',
  disposal_date: today,
  reference_number: '',
};

export function DisposalRequestDialog({
  asset,
  open,
  onOpenChange,
  onSubmit,
}: DisposalRequestDialogProps) {
  const [form, setForm] = useState<DisposalRequestData>(emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [evidence, setEvidence] = useState<File | null>(null);

  useEffect(() => {
    if (open) {
      setForm({ ...emptyForm, disposal_date: today });
      setError(null);
      setEvidence(null);
    }
  }, [open]);

  const update = <K extends keyof DisposalRequestData>(
    key: K,
    value: DisposalRequestData[K]
  ) => setForm((previous) => ({ ...previous, [key]: value }));

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (
      !asset ||
      !form.disposal_method ||
      form.disposal_reason.trim().length < 10 ||
      !form.disposal_date ||
      form.disposal_date > today ||
      form.reference_number.trim().length < 3 ||
      !evidence
    ) {
      setError('Complete all required fields with a past or current disposal date.');
      return;
    }
    setSaving(true);
    try {
      await onSubmit({
        ...form,
        disposal_reason: form.disposal_reason.trim(),
        reference_number: form.reference_number.trim(),
      }, evidence);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to submit the request.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Complete disposal request</DialogTitle>
          <DialogDescription>
            Enter the disposal details below. The system records the requester, the
            asset&apos;s current custodian, and its facility automatically. The asset
            is marked Disposed and its active custodian assignment is released only
            after an independent Supervisor or Asset Manager approves the request.
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
          <div className="space-y-2">
            <Label>
              Disposal method <span className="text-destructive">*</span>
            </Label>
            <Select
              value={form.disposal_method}
              onValueChange={(value) => update('disposal_method', value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                {methods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="disposal_reason">
              Reason and supporting details <span className="text-destructive">*</span>
            </Label>
            <Textarea
              id="disposal_reason"
              value={form.disposal_reason}
              onChange={(event) => update('disposal_reason', event.target.value)}
              minLength={10}
              maxLength={4000}
              rows={4}
              required
              placeholder="Describe why the asset was disposed of and include relevant supporting details."
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="disposal_date">
                Disposal date <span className="text-destructive">*</span>
              </Label>
              <Input
                id="disposal_date"
                type="date"
                max={today}
                value={form.disposal_date}
                onChange={(event) => update('disposal_date', event.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reference_number">
                Supporting reference <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reference_number"
                value={form.reference_number}
                onChange={(event) => update('reference_number', event.target.value)}
                minLength={3}
                maxLength={191}
                required
                placeholder="Approval, work order, or certificate number"
              />
            </div>
          </div>
          <EvidencePdfField
            id="disposal-evidence"
            file={evidence}
            onChange={setEvidence}
            title="Disposal evidence PDF"
            description="Attach the scanned disposal certificate, approval, or supporting document. PDF only, maximum 10 MB."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !asset}>
              {saving ? 'Submitting…' : 'Send to Supervisor / Asset Manager'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
