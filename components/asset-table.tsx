'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Archive,
  Pencil,
  Trash2,
  Package,
  ClipboardCheck,
  TriangleAlert,
  Wrench,
  ArrowRightLeft,
  ScanSearch,
  Clock3,
} from 'lucide-react';
import type { HealthAsset } from '@/lib/types';

type AssetTableProps = {
  assets: HealthAsset[];
  onEdit?: (asset: HealthAsset) => void;
  onDelete?: (asset: HealthAsset) => void;
  onDispose?: (asset: HealthAsset) => void;
  onReportLost?: (asset: HealthAsset) => void;
  onDecommission?: (asset: HealthAsset) => void;
  onStartMaintenance?: (asset: HealthAsset) => void;
  onTransfer?: (asset: HealthAsset) => void;
  onVerify?: (asset: HealthAsset) => void;
  onExtendLifespan?: (asset: HealthAsset) => void;
};

const statusStyles: Record<string, string> = {
  Active: 'bg-success/10 text-success border-success/20',
  'In Maintenance': 'bg-warning/10 text-warning border-warning/20',
  'Loss Report Pending': 'bg-warning/10 text-warning border-warning/20',
  'Decommission Pending': 'bg-warning/10 text-warning border-warning/20',
  'Disposal Pending': 'bg-warning/10 text-warning border-warning/20',
  'Need Attention': 'bg-warning/10 text-warning border-warning/20',
  Decommissioned: 'bg-muted text-muted-foreground border-border',
  Lost: 'bg-destructive/10 text-destructive border-destructive/20',
  Disposed: 'bg-destructive/10 text-destructive border-destructive/20',
};

const conditionStyles: Record<string, string> = {
  Excellent: 'bg-success/10 text-success border-success/20',
  Good: 'bg-success/10 text-success border-success/20',
  Fair: 'bg-warning/10 text-warning border-warning/20',
  Poor: 'bg-destructive/10 text-destructive border-destructive/20',
  Damaged: 'bg-destructive/10 text-destructive border-destructive/20',
};

export function AssetTable({
  assets,
  onEdit,
  onDelete,
  onDispose,
  onReportLost,
  onDecommission,
  onStartMaintenance,
  onTransfer,
  onVerify,
  onExtendLifespan,
}: AssetTableProps) {
  if (assets.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent">
          <Package className="h-8 w-8 text-muted-foreground" />
        </div>
        <h3 className="mt-4 text-lg font-semibold text-foreground">No assets found</h3>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          No assets match your current filters. Try adjusting your search, or
          register a new asset to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto scrollbar-thin">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[120px]">Asset Tag</TableHead>
            <TableHead className="min-w-[160px]">Asset Name</TableHead>
            <TableHead className="min-w-[160px]">Facility</TableHead>
            <TableHead className="min-w-[120px]">District</TableHead>
            <TableHead className="min-w-[120px]">Sub-District</TableHead>
            <TableHead className="min-w-[120px]">Location</TableHead>
            <TableHead className="min-w-[80px]">Room</TableHead>
            <TableHead className="min-w-[140px]">Custodian</TableHead>
            <TableHead className="min-w-[120px]">PERSAL Number</TableHead>
            <TableHead className="min-w-[160px]">Serial / IMEI</TableHead>
            <TableHead className="min-w-[100px]">Status</TableHead>
            <TableHead className="min-w-[100px]">Condition</TableHead>
            <TableHead className="min-w-[140px]">Verification</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {assets.map((asset) => (
            <TableRow key={asset.id} className="group">
              <TableCell>
                <span className="font-mono text-xs font-semibold text-primary">
                  {asset.asset_tag}
                </span>
              </TableCell>
              <TableCell className="font-medium text-foreground">
                {asset.asset_name}
              </TableCell>
              <TableCell className="text-sm text-foreground">
                {asset.facility_name}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {asset.district}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {asset.sub_district || '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {asset.location}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {asset.room_number || '—'}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {asset.custodian_name || 'Custody released'}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {asset.custodian_name ? asset.persal_number || '—' : '—'}
              </TableCell>
              <TableCell className="font-mono text-xs text-muted-foreground">
                {asset.serial_imei_number || '—'}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${statusStyles[asset.display_status ?? asset.status] ?? 'border-border'}`}
                >
                  {asset.display_status ?? asset.status}
                </Badge>
                {asset.useful_life_end_date && (
                  <div className="mt-1 text-xs text-muted-foreground">
                    Useful life ends {asset.useful_life_end_date.slice(0, 10)}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge
                  variant="outline"
                  className={`text-xs ${conditionStyles[asset.condition] ?? 'border-border'}`}
                >
                  {asset.condition}
                </Badge>
              </TableCell>
              <TableCell className="text-xs text-muted-foreground">
                {asset.verification_due ? (
                  <span className="font-medium text-warning">
                    {asset.last_verified_at
                      ? `Due — last verified ${asset.last_verified_at.slice(0, 10)}`
                      : 'Never verified — due now'}
                  </span>
                ) : asset.last_verified_at ? (
                  `Verified ${asset.last_verified_at.slice(0, 10)}`
                ) : (
                  'Not required'
                )}
              </TableCell>
              <TableCell>
                <div className="flex items-center justify-end gap-1">
                  {onTransfer && asset.status === 'Active' && asset.custodian_name && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-muted-foreground hover:text-primary"
                      aria-label={`Transfer ${asset.asset_tag} to another custodian`}
                      onClick={() => onTransfer(asset)}
                    >
                      <ArrowRightLeft className="h-4 w-4" />
                      <span>Transfer</span>
                    </Button>
                  )}
                  {onVerify && ['Active', 'In Maintenance'].includes(asset.status) && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1 px-2 text-muted-foreground hover:text-primary"
                      aria-label={`Verify ${asset.asset_tag}`}
                      onClick={() => onVerify(asset)}
                    >
                      <ScanSearch className="h-4 w-4" />
                      <span>Verify</span>
                    </Button>
                  )}
                  {onExtendLifespan && asset.display_status === 'Need Attention' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-warning hover:text-primary"
                      aria-label={`Review lifespan for ${asset.asset_tag}`}
                      onClick={() => onExtendLifespan(asset)}
                    >
                      <Clock3 className="h-4 w-4" />
                    </Button>
                  )}
                  {onEdit &&
                    ![
                      'Lost',
                      'Loss Report Pending',
                      'Decommission Pending',
                      'Decommissioned',
                      'Disposed',
                      'Disposal Pending',
                    ].includes(asset.status) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label={`Edit ${asset.asset_tag}`}
                      onClick={() => onEdit(asset)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                  )}
                  {onDispose &&
                    asset.status === 'Active' &&
                    ![
                      'Lost',
                      'Loss Report Pending',
                      'Decommission Pending',
                      'Disposed',
                      'Disposal Pending',
                    ].includes(asset.status) &&
                    asset.custodian_name && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        aria-label={`Request disposal for ${asset.asset_tag}`}
                        onClick={() => onDispose(asset)}
                      >
                        <ClipboardCheck className="h-4 w-4" />
                      </Button>
                    )}
                  {onReportLost &&
                    asset.status === 'Active' &&
                    ![
                      'Lost',
                      'Loss Report Pending',
                      'Decommission Pending',
                      'Decommissioned',
                      'Disposed',
                      'Disposal Pending',
                    ].includes(asset.status) && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Report ${asset.asset_tag} as missing`}
                        onClick={() => onReportLost(asset)}
                      >
                        <TriangleAlert className="h-4 w-4" />
                      </Button>
                    )}
                  {onDelete &&
                    asset.status !== 'In Maintenance' &&
                    ![
                      'Lost',
                      'Loss Report Pending',
                      'Decommission Pending',
                      'Decommissioned',
                      'Disposed',
                      'Disposal Pending',
                    ].includes(asset.status) && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      aria-label={`Delete ${asset.asset_tag}`}
                      onClick={() => onDelete(asset)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  {onDecommission &&
                    asset.status === 'Active' && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        aria-label={`Request decommissioning for ${asset.asset_tag}`}
                        onClick={() => onDecommission(asset)}
                      >
                        <Archive className="h-4 w-4" />
                      </Button>
                    )}
                  {onStartMaintenance && asset.status === 'Active' && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-muted-foreground hover:text-primary"
                      aria-label={`Start maintenance for ${asset.asset_tag}`}
                      onClick={() => onStartMaintenance(asset)}
                    >
                      <Wrench className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
