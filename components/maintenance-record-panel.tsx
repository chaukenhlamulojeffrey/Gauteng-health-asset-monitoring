'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Clock3, Wrench } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EvidencePdfField } from '@/components/evidence-pdf-field';
import { WorkflowEvidenceLinks } from '@/components/workflow-evidence-links';
import {
  completeMaintenanceRecord,
  fetchMaintenanceRecords,
} from '@/lib/maintenance-records';
import {
  GAUTENG_DISTRICTS,
  type AssetMaintenanceRecord,
  type MaintenanceCompletionData,
} from '@/lib/types';
import type { AppRole } from '@/lib/roles';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type MaintenanceRecordPanelProps = {
  canManage: boolean;
  currentUserRole: AppRole;
  currentUserDistrict: string | null;
  onUpdated: () => Promise<void>;
};

type StatusFilter = 'all' | AssetMaintenanceRecord['status'];

function todayDate(): string {
  return new Date().toISOString().slice(0, 10);
}

function displayDate(value: string | null): string {
  return value ? value.slice(0, 10) : '—';
}

function displayCost(value: number | null): string {
  return value === null
    ? '—'
    : new Intl.NumberFormat('en-ZA', {
        style: 'currency',
        currency: 'ZAR',
      }).format(Number(value));
}

const initialCompletion: MaintenanceCompletionData = {
  completed_at: todayDate(),
  work_performed: '',
  actual_cost: null,
  completion_notes: '',
};

export function MaintenanceRecordPanel({
  canManage,
  currentUserRole,
  currentUserDistrict,
  onUpdated,
}: MaintenanceRecordPanelProps) {
  const [records, setRecords] = useState<AssetMaintenanceRecord[]>([]);
  const [district, setDistrict] = useState(
    currentUserRole === 'super_administrator' ? '' : currentUserDistrict ?? ''
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssetMaintenanceRecord | null>(null);
  const [form, setForm] = useState<MaintenanceCompletionData>(initialCompletion);
  const [evidence, setEvidence] = useState<File | null>(null);
  const requestSequence = useRef(0);

  const districtOptions =
    currentUserRole === 'super_administrator'
      ? GAUTENG_DISTRICTS
      : currentUserDistrict
        ? [currentUserDistrict]
        : [];

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!district) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchMaintenanceRecords(district);
      if (sequence === requestSequence.current) setRecords(result);
    } catch (err) {
      if (sequence === requestSequence.current) {
        setError(err instanceof Error ? err.message : 'Unable to load maintenance history.');
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [district]);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(
    () => ({
      open: records.filter((record) => record.status === 'Open').length,
      completed: records.filter((record) => record.status === 'Completed').length,
    }),
    [records]
  );
  const visibleRecords = useMemo(
    () =>
      statusFilter === 'all'
        ? records
        : records.filter((record) => record.status === statusFilter),
    [records, statusFilter]
  );

  const beginCompletion = (record: AssetMaintenanceRecord) => {
    setSelected(record);
    setForm({ ...initialCompletion, completed_at: todayDate() });
    setEvidence(null);
    setError(null);
  };

  const submitCompletion = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    if (
      !form.completed_at ||
      form.completed_at < displayDate(selected.started_at) ||
      form.completed_at > todayDate() ||
      form.work_performed.trim().length < 10 ||
      !evidence ||
      (form.actual_cost !== null &&
        (!Number.isFinite(form.actual_cost) || form.actual_cost < 0))
    ) {
      setError('Enter a valid completion date, work summary, and actual cost.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await completeMaintenanceRecord(selected.id, {
        ...form,
        work_performed: form.work_performed.trim(),
        completion_notes: form.completion_notes.trim(),
      }, evidence);
      setSelected(null);
      await Promise.all([load(), onUpdated()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete maintenance.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Card className="space-y-5 p-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <Wrench className="h-4 w-4 text-primary" />
              Maintenance history
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Follow repair work from issue reporting through completion.
              Completing a record returns the asset to Active and retains its custodian.
            </p>
          </div>
          <Badge variant="outline" className="w-fit shrink-0">
            {counts.open} in maintenance
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-warning/20 bg-warning/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-4 w-4 text-warning" /> Open work orders
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.open}</p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Completed records
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.completed}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="maintenance-history-district">District</Label>
            <Select
              value={district}
              onValueChange={setDistrict}
              disabled={districtOptions.length === 0}
            >
              <SelectTrigger id="maintenance-history-district">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {districtOptions.map((item) => (
                  <SelectItem key={item} value={item}>{item}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-history-status">Record status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger id="maintenance-history-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All records</SelectItem>
                <SelectItem value="Open">In maintenance</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && !selected && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <p className="py-8 text-center text-sm text-muted-foreground">Loading maintenance history…</p>
        ) : visibleRecords.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
            {district ? 'No maintenance records match this filter.' : 'Select a district to view maintenance history.'}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleRecords.map((record) => (
              <article key={record.id} className="rounded-lg border border-border p-4">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-semibold text-foreground">
                        {record.asset_name_snapshot}
                      </h4>
                      <span className="font-mono text-xs text-primary">{record.asset_tag_snapshot}</span>
                      <Badge
                        variant="outline"
                        className={
                          record.status === 'Open'
                            ? 'border-warning/30 bg-warning/10 text-warning'
                            : 'border-success/30 bg-success/10 text-success'
                        }
                      >
                        {record.status === 'Open' ? 'In maintenance' : 'Completed'}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {record.district_snapshot} · {record.sub_district_snapshot || 'Sub-district not recorded'} · {record.facility_name_snapshot}
                    </p>
                    <p className="mt-2 text-sm text-foreground">{record.issue_description}</p>
                    <div className="mt-3 grid gap-x-6 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                      <span>Started: {displayDate(record.started_at)}</span>
                      <span>Provider: {record.service_provider || '—'}</span>
                      <span>Estimated: {displayCost(record.estimated_cost)}</span>
                      <span>Work order: {record.reference_number || '—'}</span>
                      <span>Custodian: {record.custodian_name_snapshot || 'Not assigned'}</span>
                      <span>Recorded by: {record.opener_name_snapshot}</span>
                      {record.status === 'Completed' && (
                        <>
                          <span>Completed: {displayDate(record.completed_at)}</span>
                          <span>Actual cost: {displayCost(record.actual_cost)}</span>
                        </>
                      )}
                    </div>
                    {record.status === 'Completed' && record.work_performed && (
                      <p className="mt-3 text-sm">
                        <span className="font-medium">Work performed:</span> {record.work_performed}
                      </p>
                    )}
                    {record.status === 'Completed' && record.completion_notes && (
                      <p className="mt-1 text-sm text-muted-foreground">
                        Completion notes: {record.completion_notes}
                      </p>
                    )}
                    <WorkflowEvidenceLinks
                      workflowType="maintenance"
                      workflowId={record.id}
                    />
                  </div>
                  {canManage && record.status === 'Open' && (
                    <Button className="shrink-0" onClick={() => beginCompletion(record)}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Complete work
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </Card>

      <Dialog
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open && !saving) setSelected(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Complete maintenance work</DialogTitle>
            <DialogDescription>
              Record the completed work and actual cost. This returns the asset
              to Active while preserving its assigned custodian.
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="rounded-lg border bg-muted/40 px-4 py-3 text-sm">
              <p className="font-semibold">{selected.asset_name_snapshot} ({selected.asset_tag_snapshot})</p>
              <p className="mt-1 text-muted-foreground">
                Started {displayDate(selected.started_at)} · {selected.district_snapshot}
              </p>
            </div>
          )}
          <form onSubmit={submitCompletion} className="space-y-4">
            {error && (
              <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="maintenance-completed-date">Completion date <span className="text-destructive">*</span></Label>
                <Input
                  id="maintenance-completed-date"
                  type="date"
                  min={selected ? displayDate(selected.started_at) : undefined}
                  max={todayDate()}
                  value={form.completed_at}
                  onChange={(event) =>
                    setForm((previous) => ({ ...previous, completed_at: event.target.value }))
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maintenance-actual-cost">Actual cost (R)</Label>
                <Input
                  id="maintenance-actual-cost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.actual_cost ?? ''}
                  onChange={(event) =>
                    setForm((previous) => ({
                      ...previous,
                      actual_cost: event.target.value === '' ? null : Number(event.target.value),
                    }))
                  }
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-work-performed">Work performed <span className="text-destructive">*</span></Label>
              <Textarea
                id="maintenance-work-performed"
                value={form.work_performed}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, work_performed: event.target.value }))
                }
                minLength={10}
                maxLength={4000}
                rows={4}
                required
                placeholder="Summarize repairs, parts replaced, and final serviceability."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-completion-notes">Completion notes</Label>
              <Textarea
                id="maintenance-completion-notes"
                value={form.completion_notes}
                onChange={(event) =>
                  setForm((previous) => ({ ...previous, completion_notes: event.target.value }))
                }
                maxLength={4000}
                rows={2}
                placeholder="Optional handover or follow-up notes"
              />
            </div>
            <EvidencePdfField
              id="maintenance-completion-evidence"
              file={evidence}
              onChange={setEvidence}
              title="Maintenance completion evidence PDF"
              description="Attach the scanned service report, invoice, or proof of completed work. PDF only, maximum 10 MB."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setSelected(null)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || !selected}>
                {saving ? 'Saving…' : 'Complete maintenance'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
