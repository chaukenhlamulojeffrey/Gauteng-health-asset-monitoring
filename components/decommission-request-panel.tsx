'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Archive, CheckCircle2, Clock3, XCircle } from 'lucide-react';
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
import {
  fetchDecommissionRequests,
  reviewDecommissionRequest,
} from '@/lib/decommission-requests';
import { GAUTENG_DISTRICTS, type AssetDecommissionRequest } from '@/lib/types';
import type { AppRole } from '@/lib/roles';

type DecommissionRequestPanelProps = {
  canReview: boolean;
  currentUserId: string;
  currentUserRole: AppRole;
  currentUserDistrict: string | null;
  onUpdated: () => Promise<void>;
};

type Decision = 'approve' | 'reject';
type StatusFilter = 'all' | AssetDecommissionRequest['status'];

const statusStyle: Record<AssetDecommissionRequest['status'], string> = {
  Pending: 'border-warning/30 bg-warning/10 text-warning',
  Approved: 'border-success/30 bg-success/10 text-success',
  Rejected: 'border-border bg-muted text-muted-foreground',
};

function displayDate(value: string | null): string {
  return value ? value.slice(0, 10) : '—';
}

export function DecommissionRequestPanel({
  canReview,
  currentUserId,
  currentUserRole,
  currentUserDistrict,
  onUpdated,
}: DecommissionRequestPanelProps) {
  const [requests, setRequests] = useState<AssetDecommissionRequest[]>([]);
  const [district, setDistrict] = useState(
    currentUserRole === 'super_administrator' ? '' : currentUserDistrict ?? ''
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssetDecommissionRequest | null>(null);
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
      setRequests([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result = await fetchDecommissionRequests(district);
      if (sequence === requestSequence.current) setRequests(result);
    } catch (err) {
      if (sequence === requestSequence.current) {
        setError(err instanceof Error ? err.message : 'Unable to load decommission requests.');
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
      pending: requests.filter((request) => request.status === 'Pending').length,
      approved: requests.filter((request) => request.status === 'Approved').length,
      rejected: requests.filter((request) => request.status === 'Rejected').length,
    }),
    [requests]
  );
  const visibleRequests = useMemo(
    () =>
      statusFilter === 'all'
        ? requests
        : requests.filter((request) => request.status === statusFilter),
    [requests, statusFilter]
  );

  const beginReview = (request: AssetDecommissionRequest, action: Decision) => {
    setSelected(request);
    setDecision(action);
    setNotes('');
    setEvidence(null);
    setError(null);
  };

  const submitReview = async () => {
    if (!selected || !decision || !evidence) {
      setError('Attach the scanned approval or review evidence PDF.');
      return;
    }
    if (decision === 'reject' && notes.trim().length < 10) {
      setError('Add at least 10 characters explaining why this request is returned.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await reviewDecommissionRequest(selected.id, decision, notes.trim(), evidence);
      setSelected(null);
      setDecision(null);
      setNotes('');
      setEvidence(null);
      await Promise.all([load(), onUpdated()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review this decommission request.');
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
              <Archive className="h-4 w-4 text-primary" />
              Decommission requests
            </h3>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Track asset retirement requests through independent approval.
              Approved assets remain in the register; physical disposal is a separate process.
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
          <div className="rounded-lg border border-success/20 bg-success/[0.04] p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <CheckCircle2 className="h-4 w-4 text-success" /> Approved
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.approved}</p>
          </div>
          <div className="rounded-lg border border-border bg-muted/20 p-3">
            <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <XCircle className="h-4 w-4" /> Returned
            </div>
            <p className="mt-1 text-2xl font-semibold">{counts.rejected}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="decommission-report-district">District</Label>
            <Select
              value={district}
              onValueChange={setDistrict}
              disabled={districtOptions.length === 0}
            >
              <SelectTrigger id="decommission-report-district">
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
            <Label htmlFor="decommission-report-status">Request status</Label>
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as StatusFilter)}
            >
              <SelectTrigger id="decommission-report-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All requests</SelectItem>
                <SelectItem value="Pending">Awaiting review</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
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
          <p className="text-sm text-muted-foreground">Loading decommission requests…</p>
        ) : !district ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Select a district to view its decommission request history.
          </p>
        ) : visibleRequests.length === 0 ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            No {statusFilter === 'all' ? '' : `${statusFilter.toLocaleLowerCase()} `}decommission requests found in this district.
          </p>
        ) : (
          <div className="space-y-3">
            {visibleRequests.map((request) => {
              const mayReview =
                canReview &&
                request.status === 'Pending' &&
                request.requested_by !== currentUserId;
              return (
                <article key={request.id} className="rounded-lg border border-border p-4">
                  <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start">
                    <div className="min-w-0 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {request.asset_tag_snapshot}
                        </span>
                        <Badge variant="outline" className={statusStyle[request.status]}>
                          {request.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{request.asset_name_snapshot}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.district_snapshot} · {request.sub_district_snapshot || 'Sub-district not recorded'} · {request.facility_name_snapshot}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Effective date: {displayDate(request.decommission_date)} · Previous status: {request.previous_status}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Location: {request.location_snapshot} · Condition: {request.condition_snapshot}
                      </p>
                      <p className="whitespace-pre-wrap text-sm text-foreground">{request.reason}</p>
                      {request.reference_number && (
                        <p className="text-xs text-muted-foreground">Reference: {request.reference_number}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Custodian at request: {request.custodian_name_snapshot || 'Unassigned'}
                        {request.custodian_persal_number_snapshot
                          ? ` · PERSAL ${request.custodian_persal_number_snapshot}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {request.requester_name_snapshot} · PERSAL {request.requester_persal_number_snapshot} · {request.requester_role_snapshot.replaceAll('_', ' ')} · {request.requested_at}
                      </p>
                      {request.reviewer_name_snapshot && (
                        <p className="text-xs text-muted-foreground">
                          {request.status === 'Rejected' ? 'Returned' : 'Approved'} by {request.reviewer_name_snapshot} · PERSAL {request.reviewer_persal_number_snapshot} · {request.reviewed_at}
                        </p>
                      )}
                      {request.review_notes && (
                        <p className="rounded-md bg-muted/50 p-2 text-xs text-muted-foreground">
                          Review note: {request.review_notes}
                        </p>
                      )}
                      <WorkflowEvidenceLinks
                        workflowType="decommission"
                        workflowId={request.id}
                      />
                    </div>
                    {mayReview && (
                      <div className="flex shrink-0 gap-2">
                        <Button size="sm" onClick={() => beginReview(request, 'approve')}>
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => beginReview(request, 'reject')}
                        >
                          Return
                        </Button>
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
            setError(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approve' ? 'Approve decommission request?' : 'Return decommission request?'}
            </DialogTitle>
            <DialogDescription>
              {decision === 'approve'
                ? 'Approval marks the asset Decommissioned. It remains recorded and can later enter the separate disposal process.'
                : 'The request will be returned and the asset restored to its previous status.'}
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="decommission-review-notes">
              Review notes{decision === 'reject' ? ' (required)' : ' (optional)'}
            </Label>
            <Textarea
              id="decommission-review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              maxLength={4000}
              minLength={decision === 'reject' ? 10 : undefined}
              rows={4}
              placeholder={
                decision === 'reject'
                  ? 'Explain why the request is being returned.'
                  : 'Add any approval conditions or comments.'
              }
            />
          </div>
          <EvidencePdfField
            id="decommission-review-evidence"
            file={evidence}
            onChange={setEvidence}
            title="Review evidence PDF"
            description="Attach the scanned approval, return, or authorization document. PDF only, maximum 10 MB."
          />
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(null);
                setDecision(null);
                setNotes('');
                setError(null);
              }}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={saving || !evidence || (decision === 'reject' && notes.trim().length < 10)}
            >
              {saving ? 'Saving…' : decision === 'approve' ? 'Approve request' : 'Return request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
