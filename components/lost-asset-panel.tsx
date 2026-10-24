'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock3, RotateCcw, ShieldCheck } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { EvidencePdfField } from '@/components/evidence-pdf-field';
import { WorkflowEvidenceLinks } from '@/components/workflow-evidence-links';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchLostAssetReports, updateLostAssetReport } from '@/lib/lost-assets';
import { GAUTENG_DISTRICTS, type LostAssetReport } from '@/lib/types';
import type { AppRole } from '@/lib/roles';

type LostAssetPanelProps = {
  canReview: boolean;
  currentUserId: string;
  currentUserRole: AppRole;
  currentUserDistrict: string | null;
  onUpdated: () => Promise<void>;
};

type Decision = 'approve' | 'reject' | 'recover';
type StatusFilter = 'all' | LostAssetReport['status'];

const statusStyle: Record<LostAssetReport['status'], string> = {
  Pending: 'border-warning/30 bg-warning/10 text-warning',
  'Confirmed Lost': 'border-destructive/30 bg-destructive/10 text-destructive',
  Recovered: 'border-success/30 bg-success/10 text-success',
  Rejected: 'border-border bg-muted text-muted-foreground',
};

const decisionCopy: Record<Decision, { title: string; description: string; button: string }> = {
  approve: {
    title: 'Confirm this asset as lost?',
    description: 'The asset status will become Lost. Its custody and incident history will remain recorded.',
    button: 'Confirm loss',
  },
  reject: {
    title: 'Return this loss report?',
    description: 'The report will be returned with your reason and the asset will return to its previous status.',
    button: 'Return report',
  },
  recover: {
    title: 'Record asset recovery?',
    description: 'The report will be marked Recovered and the asset will return to its previous operational status.',
    button: 'Record recovery',
  },
};

function displayDate(value: string | null): string {
  if (!value) return '—';
  return value.slice(0, 10);
}

export function LostAssetPanel({
  canReview,
  currentUserId,
  currentUserRole,
  currentUserDistrict,
  onUpdated,
}: LostAssetPanelProps) {
  const [reports, setReports] = useState<LostAssetReport[]>([]);
  const [district, setDistrict] = useState(
    currentUserRole === 'super_administrator' ? '' : currentUserDistrict ?? ''
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<LostAssetReport | null>(null);
  const [decision, setDecision] = useState<Decision | null>(null);
  const [notes, setNotes] = useState('');
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
      setReports([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await fetchLostAssetReports(district);
      if (sequence === requestSequence.current) setReports(results);
    } catch (err) {
      if (sequence === requestSequence.current) {
        setError(err instanceof Error ? err.message : 'Unable to load lost-asset reports.');
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
      pending: reports.filter((report) => report.status === 'Pending').length,
      lost: reports.filter((report) => report.status === 'Confirmed Lost').length,
      recovered: reports.filter((report) => report.status === 'Recovered').length,
    }),
    [reports]
  );

  const visibleReports = useMemo(
    () =>
      statusFilter === 'all'
        ? reports
        : reports.filter((report) => report.status === statusFilter),
    [reports, statusFilter]
  );

  const beginAction = (report: LostAssetReport, action: Decision) => {
    setSelected(report);
    setDecision(action);
    setNotes('');
    setEvidence(null);
    setError(null);
  };

  const submitAction = async () => {
    if (!selected || !decision || !evidence) {
      setError('Attach a scanned PDF supporting this action.');
      return;
    }
    if ((decision === 'reject' || decision === 'recover') && notes.trim().length < 10) {
      setError('Add at least 10 characters of supporting notes for this action.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await updateLostAssetReport(selected.id, decision, notes.trim(), evidence);
      setSelected(null);
      setDecision(null);
      setNotes('');
      setEvidence(null);
      await Promise.all([load(), onUpdated()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update this lost-asset report.');
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
              <AlertTriangle className="h-4 w-4 text-warning" />
              Lost asset reports
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Track reported incidents from submission through independent review and recovery.
              Reports preserve the asset&apos;s location and custodian details at the time of reporting.
            </p>
          </div>
          <Badge variant="outline" className="w-fit shrink-0">
            {counts.pending} awaiting review
          </Badge>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-warning/20 bg-warning/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <Clock3 className="h-4 w-4 text-warning" /> Awaiting review
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.pending}</p>
          </div>
          <div className="rounded-lg border border-destructive/20 bg-destructive/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-destructive" /> Confirmed lost
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.lost}</p>
          </div>
          <div className="rounded-lg border border-success/20 bg-success/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Recovered
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.recovered}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="lost-report-district">District</Label>
            <Select
              value={district}
              onValueChange={setDistrict}
              disabled={districtOptions.length === 0}
            >
              <SelectTrigger id="lost-report-district">
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
            <Label htmlFor="lost-report-status">Report status</Label>
            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value as StatusFilter)}>
              <SelectTrigger id="lost-report-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All reports</SelectItem>
                <SelectItem value="Pending">Awaiting review</SelectItem>
                <SelectItem value="Confirmed Lost">Confirmed lost</SelectItem>
                <SelectItem value="Recovered">Recovered</SelectItem>
                <SelectItem value="Rejected">Returned</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading lost-asset reports…</p>
        ) : !district ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Select a district to view its lost-asset report history.
          </p>
        ) : visibleReports.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No {statusFilter === 'all' ? '' : `${statusFilter.toLocaleLowerCase()} `}lost-asset reports found in this district.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleReports.map((report) => {
              const mayReviewReport =
                canReview &&
                report.requested_by !== currentUserId &&
                report.status === 'Pending';
              const mayRecordRecovery =
                canReview && report.status === 'Confirmed Lost';
              return (
                <article key={report.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {report.asset_tag_snapshot}
                        </span>
                        <Badge variant="outline" className={statusStyle[report.status]}>
                          {report.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{report.asset_name_snapshot}</p>
                      <p className="text-sm text-muted-foreground">
                        {report.district_snapshot} · {report.sub_district_snapshot || 'Sub-district not recorded'} · {report.facility_name_snapshot}
                      </p>
                      <p className="text-sm text-foreground">
                        Last known: {report.last_known_location} · {displayDate(report.last_seen_date)}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">{report.circumstances}</p>
                      {report.reference_number && (
                        <p className="text-xs text-muted-foreground">Reference: {report.reference_number}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Custodian at report: {report.custodian_name_snapshot || 'Unassigned'}
                        {report.custodian_persal_number_snapshot
                          ? ` · PERSAL ${report.custodian_persal_number_snapshot}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Reported by {report.requester_name_snapshot} · PERSAL {report.requester_persal_number_snapshot} · {report.requester_role_snapshot.replaceAll('_', ' ')} · {report.requested_at}
                      </p>
                      {report.reviewer_name_snapshot && (
                        <p className="text-xs text-muted-foreground">
                          {report.status === 'Rejected' ? 'Returned' : 'Reviewed'} by {report.reviewer_name_snapshot} · PERSAL {report.reviewer_persal_number_snapshot} · {report.reviewed_at}
                        </p>
                      )}
                      {report.review_notes && (
                        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                          Review note: {report.review_notes}
                        </p>
                      )}
                      {report.recoverer_name_snapshot && (
                        <p className="text-xs text-success">
                          Recovered by {report.recoverer_name_snapshot} · PERSAL {report.recoverer_persal_number_snapshot} · {report.recovered_at}
                        </p>
                      )}
                      {report.recovery_notes && (
                        <p className="rounded-md bg-success/5 p-2 text-xs text-muted-foreground">
                          Recovery note: {report.recovery_notes}
                        </p>
                      )}
                      <WorkflowEvidenceLinks workflowType="lost" workflowId={report.id} />
                    </div>
                    {(mayReviewReport || mayRecordRecovery) && (
                      <div className="flex shrink-0 flex-wrap gap-2">
                        {mayReviewReport && (
                          <>
                            <Button size="sm" onClick={() => beginAction(report, 'approve')}>
                              <ShieldCheck className="mr-1.5 h-4 w-4" />
                              Confirm lost
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => beginAction(report, 'reject')}>
                              Return report
                            </Button>
                          </>
                        )}
                        {mayRecordRecovery && (
                          <Button size="sm" variant="outline" onClick={() => beginAction(report, 'recover')}>
                            <RotateCcw className="mr-1.5 h-4 w-4" />
                            Record recovery
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Card>

      <Dialog
        open={Boolean(selected && decision)}
        onOpenChange={(open) => {
          if (!open && !saving) {
            setSelected(null);
            setDecision(null);
            setNotes('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{decision ? decisionCopy[decision].title : 'Update report'}</DialogTitle>
            <DialogDescription>
              {decision ? decisionCopy[decision].description : ''}
              {selected
                ? ` Asset ${selected.asset_tag_snapshot} — ${selected.asset_name_snapshot}.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          {(decision === 'reject' || decision === 'recover') && (
            <div className="space-y-2">
              <Label htmlFor="lost-review-notes">
                {decision === 'recover' ? 'Recovery details' : 'Reason for return'}
              </Label>
              <Textarea
                id="lost-review-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                minLength={10}
                maxLength={4000}
                rows={4}
                placeholder={
                  decision === 'recover'
                    ? 'Explain where the asset was found, its condition, and custody handover.'
                    : 'Explain what information is missing or why the report cannot be confirmed.'
                }
              />
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <EvidencePdfField
            id="lost-review-evidence"
            file={evidence}
            onChange={setEvidence}
            title={decision === 'recover' ? 'Recovery evidence PDF' : 'Review evidence PDF'}
            description="Attach the scanned review, incident, or recovery document. PDF only, maximum 10 MB."
          />
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelected(null);
                setDecision(null);
                setNotes('');
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={decision === 'reject' ? 'destructive' : 'default'}
              onClick={submitAction}
              disabled={
                saving ||
                !decision ||
                !evidence ||
                ((decision === 'reject' || decision === 'recover') && notes.trim().length < 10)
              }
            >
              {saving ? 'Saving…' : decision ? decisionCopy[decision].button : 'Confirm'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
