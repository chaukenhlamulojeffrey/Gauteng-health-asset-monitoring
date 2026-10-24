'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CheckCircle2, ClipboardCheck, Clock3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
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
import { fetchDisposals, reviewDisposal } from '@/lib/disposals';
import { fetchFacilities } from '@/lib/facilities';
import {
  GAUTENG_DISTRICTS,
  GAUTENG_SUB_DISTRICTS,
  type AssetDisposal,
  type FacilityDirectoryEntry,
} from '@/lib/types';
import type { AppRole } from '@/lib/roles';

const UNASSIGNED_SUB_DISTRICT = '__unassigned__';

type DisposalPanelProps = {
  canReview: boolean;
  currentUserId: string;
  currentUserRole: AppRole;
  currentUserDistrict: string | null;
  onReviewed: () => Promise<void>;
};

export function DisposalPanel({
  canReview,
  currentUserId,
  currentUserRole,
  currentUserDistrict,
  onReviewed,
}: DisposalPanelProps) {
  const [records, setRecords] = useState<AssetDisposal[]>([]);
  const [facilities, setFacilities] = useState<FacilityDirectoryEntry[]>([]);
  const [district, setDistrict] = useState('');
  const [subDistrict, setSubDistrict] = useState('');
  const [facilityName, setFacilityName] = useState('');
  const [facilitiesLoading, setFacilitiesLoading] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AssetDisposal | null>(null);
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [evidence, setEvidence] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const requestSequence = useRef(0);

  const districtOptions =
    currentUserRole === 'super_administrator'
      ? GAUTENG_DISTRICTS
      : currentUserDistrict
        ? [currentUserDistrict]
        : [];
  const subDistrictOptions = useMemo(
    () =>
      Array.from(
        new Set(
          [
            ...(GAUTENG_SUB_DISTRICTS[district] ?? []),
            ...facilities
              .filter((entry) => entry.district === district)
              .map((entry) => entry.sub_district ?? UNASSIGNED_SUB_DISTRICT),
          ]
        )
      ).sort((left, right) => left.localeCompare(right)),
    [district, facilities]
  );
  const facilityOptions = useMemo(
    () =>
      Array.from(
        new Set(
          facilities
            .filter(
              (entry) =>
                entry.district === district &&
                (subDistrict === UNASSIGNED_SUB_DISTRICT
                  ? entry.sub_district === null
                  : entry.sub_district === subDistrict)
            )
            .map((entry) => entry.facility_name)
        )
      ).sort((left, right) => left.localeCompare(right)),
    [district, facilities, subDistrict]
  );
  const matchingFacilityCount = facilityOptions.length;
  const districtFacilityCount = facilities.filter(
    (entry) => entry.district === district
  ).length;
  const unassignedSubDistrictFacilityCount = facilities.filter(
    (entry) => entry.district === district && entry.sub_district === null
  ).length;
  const filtersComplete = Boolean(district && subDistrict && facilityName);

  useEffect(() => {
    let cancelled = false;
    fetchFacilities()
      .then((entries) => {
        if (!cancelled) setFacilities(entries);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load facilities for disposal review.');
        }
      })
      .finally(() => {
        if (!cancelled) setFacilitiesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const load = useCallback(async () => {
    const sequence = ++requestSequence.current;
    if (!filtersComplete) {
      setRecords([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const results = await fetchDisposals({ district, subDistrict, facilityName });
      if (sequence === requestSequence.current) setRecords(results);
    } catch (err) {
      if (sequence === requestSequence.current) {
        setError(err instanceof Error ? err.message : 'Unable to load disposal records.');
      }
    } finally {
      if (sequence === requestSequence.current) setLoading(false);
    }
  }, [district, facilityName, filtersComplete, subDistrict]);

  useEffect(() => {
    load();
  }, [load]);

  const pending = records.filter((record) => record.status === 'Pending');
  const review = async () => {
    if (!selected || !decision || !evidence) {
      setError('Attach the scanned approval or review evidence PDF.');
      return;
    }
    setError(null);
    setSaving(true);
    try {
      await reviewDisposal(selected.id, decision, notes, evidence);
      setSelected(null);
      setDecision(null);
      setNotes('');
      setEvidence(null);
      await Promise.all([load(), onReviewed()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to review this request.');
    } finally {
      setSaving(false);
    }
  };

  const beginReview = (record: AssetDisposal, action: 'approve' | 'reject') => {
    setSelected(record);
    setDecision(action);
    setNotes('');
    setEvidence(null);
  };

  return (
    <>
      <Card className="space-y-4 p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 font-semibold text-foreground">
              <ClipboardCheck className="h-4 w-4 text-primary" />
              Disposal requests &amp; approvals
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Choose the location to review its disposal queue. Admin Clerk requests need
              approval from a Supervisor or Asset Manager before the asset is marked Disposed.
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              The facility list is filtered from the complete {facilities.length}-facility directory by district and sub-district.
            </p>
          </div>
          <Badge variant="outline" className="shrink-0">
            {pending.length} awaiting review
          </Badge>
        </div>
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="grid gap-3 rounded-lg border border-border bg-muted/20 p-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label htmlFor="disposal-filter-district">District</Label>
            <Select
              value={district}
              onValueChange={(value) => {
                setDistrict(value);
                setSubDistrict('');
                setFacilityName('');
              }}
              disabled={districtOptions.length === 0}
            >
              <SelectTrigger id="disposal-filter-district">
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
            <Label htmlFor="disposal-filter-subdistrict">Sub-district</Label>
            <Select
              value={subDistrict}
              onValueChange={(value) => {
                setSubDistrict(value);
                setFacilityName('');
              }}
              disabled={!district || facilitiesLoading}
            >
              <SelectTrigger id="disposal-filter-subdistrict">
                <SelectValue placeholder="Select sub-district" />
              </SelectTrigger>
              <SelectContent>
                {subDistrictOptions.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item === UNASSIGNED_SUB_DISTRICT
                      ? `Not recorded (${unassignedSubDistrictFacilityCount})`
                      : item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="disposal-filter-facility">
              Facility{district && subDistrict ? ` (${matchingFacilityCount})` : ''}
            </Label>
            <Select
              value={facilityName}
              onValueChange={setFacilityName}
              disabled={!subDistrict || facilitiesLoading || matchingFacilityCount === 0}
            >
              <SelectTrigger id="disposal-filter-facility">
                <SelectValue placeholder="Select facility" />
              </SelectTrigger>
              <SelectContent>
                {facilityOptions.map((name) => (
                  <SelectItem key={name} value={name}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {district && subDistrict && !facilitiesLoading && matchingFacilityCount > 0 && (
              <p className="text-xs text-muted-foreground">
                {matchingFacilityCount} of {districtFacilityCount} facilities in this district match the selected sub-district.
                {unassignedSubDistrictFacilityCount > 0
                  ? ` ${unassignedSubDistrictFacilityCount} without a recorded sub-district are listed under “Not recorded”.`
                  : ''}
              </p>
            )}
            {district && subDistrict && !facilitiesLoading && matchingFacilityCount === 0 && (
              <p className="text-xs text-muted-foreground">
                No facilities in this district and sub-district have been mapped yet.
              </p>
            )}
          </div>
        </div>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading disposal requests for the selected facility…</p>
        ) : !filtersComplete ? (
          <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Select a district, sub-district, and facility to display pending disposal requests.
          </p>
        ) : records.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No disposal requests are recorded for this facility.
          </p>
        ) : (
          <div className="space-y-3">
            {records.map((record) => {
              const isPending = record.status === 'Pending';
              const canReviewRecord =
                canReview &&
                isPending &&
                record.requested_by !== currentUserId &&
                (record.requester_role !== 'admin_clerk' ||
                  currentUserRole === 'asset_manager' ||
                  currentUserRole === 'supervisor' ||
                  currentUserRole === 'super_administrator');
              return (
                <div
                  key={record.id}
                  className="rounded-lg border border-border p-4"
                >
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-semibold text-primary">
                          {record.asset_tag}
                        </span>
                        <Badge
                          variant="outline"
                          className={
                            record.status === 'Approved'
                              ? 'border-success/30 bg-success/10 text-success'
                              : record.status === 'Rejected'
                                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                                : 'border-warning/30 bg-warning/10 text-warning'
                          }
                        >
                          {record.status}
                        </Badge>
                      </div>
                      <p className="font-medium text-foreground">{record.asset_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {record.district_snapshot} · {record.sub_district_snapshot || 'Sub-district not recorded'} · {record.facility_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Method: {record.disposal_method} · Disposal date: {record.disposal_date} · Reference: {record.reference_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Custodian assigned when requested: {record.former_custodian_name}
                        {record.former_custodian_persal_number
                          ? ` · PERSAL: ${record.former_custodian_persal_number}`
                          : ''}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This records the custodian assignment at request time; it does not identify who physically disposed of the asset.
                      </p>
                      <p className="text-sm text-foreground">{record.disposal_reason}</p>
                      <p className="text-xs text-muted-foreground">
                        Requested by {record.requester_name} · PERSAL {record.requester_persal_number} · {record.requester_role.replaceAll('_', ' ')} · {record.requested_at}
                      </p>
                      {record.approver_name && (
                        <p className="text-xs font-medium text-success">
                          Approved by {record.approver_name} · PERSAL {record.approver_persal_number} · {record.approver_role?.replaceAll('_', ' ')} · {record.approved_at}
                        </p>
                      )}
                      {record.rejecter_name && (
                        <p className="text-xs font-medium text-destructive">
                          Returned by {record.rejecter_name} · PERSAL {record.rejecter_persal_number} · {record.rejecter_role?.replaceAll('_', ' ')} · {record.rejected_at}
                        </p>
                      )}
                      {record.approver_notes && (
                        <p className="text-xs text-muted-foreground">
                          Review note: {record.approver_notes}
                        </p>
                      )}
                      <WorkflowEvidenceLinks
                        workflowType="disposal"
                        workflowId={record.id}
                      />
                    </div>
                    {canReviewRecord && (
                      <div className="flex shrink-0 gap-2">
                        <Button
                          size="sm"
                          onClick={() => beginReview(record, 'approve')}
                        >
                          <CheckCircle2 className="mr-1.5 h-4 w-4" />
                          Approve &amp; mark Disposed
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => beginReview(record, 'reject')}
                        >
                          Return
                        </Button>
                      </div>
                    )}
                    {isPending && record.requested_by === currentUserId && (
                      <span className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock3 className="h-3.5 w-3.5" />
                        Awaiting a different approver
                      </span>
                    )}
                  </div>
                </div>
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
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {decision === 'approve'
                ? 'Approve disposal and mark asset Disposed?'
                : 'Return disposal request for correction?'}
            </DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="rounded-md border bg-muted/40 p-3 text-sm">
              <p className="font-medium">{selected.asset_name}</p>
              <p className="text-muted-foreground">
                {selected.asset_tag} · Requested by {selected.requester_name}
              </p>
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="review-notes">
              {decision === 'reject' ? 'Reason for return *' : 'Approval note (optional)'}
            </Label>
            <Textarea
              id="review-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              minLength={decision === 'reject' ? 10 : undefined}
              maxLength={4000}
              required={decision === 'reject'}
              placeholder={
                decision === 'reject'
                  ? 'Explain what needs to be corrected before resubmission.'
                  : 'Add a short verification note if needed.'
              }
            />
          </div>
          <EvidencePdfField
            id="disposal-review-evidence"
            file={evidence}
            onChange={setEvidence}
            title="Review evidence PDF"
            description="Attach the scanned approval, return, or disposal authorization. PDF only, maximum 10 MB."
          />
          {error && (
            <p role="alert" className="flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              {error}
            </p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={() => {
                setSelected(null);
                setDecision(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant={decision === 'reject' ? 'outline' : 'default'}
              disabled={
                saving || !selected || !evidence || (decision === 'reject' && notes.trim().length < 10)
              }
              onClick={review}
            >
              {saving
                ? 'Saving…'
                : decision === 'approve'
                  ? 'Approve & mark Disposed'
                  : 'Return request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
