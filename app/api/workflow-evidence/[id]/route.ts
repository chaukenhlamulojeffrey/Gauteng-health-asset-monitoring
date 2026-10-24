import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import {
  canAccessDistrict,
  hasDistrictAssignment,
  requireUser,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import type { WorkflowEvidenceType } from '@/lib/workflow-evidence';

export const dynamic = 'force-dynamic';

type EvidenceRow = {
  workflow_type: WorkflowEvidenceType;
  workflow_id: string;
  file_name: string;
  file_content: Buffer;
} & RowDataPacket;
type WorkflowRow = { district: string } & RowDataPacket;
type RouteContext = { params: Promise<{ id: string }> };

const districtQueries: Record<WorkflowEvidenceType, string> = {
  maintenance:
    'SELECT district_snapshot AS district FROM health_asset_maintenance_records WHERE id = ?',
  decommission:
    'SELECT district_snapshot AS district FROM health_asset_decommission_requests WHERE id = ?',
  lost: 'SELECT district_snapshot AS district FROM health_asset_loss_reports WHERE id = ?',
  disposal: `SELECT COALESCE(d.district_snapshot, a.district) AS district
    FROM health_asset_disposals d
    JOIN health_assets a ON a.id = d.asset_id
    WHERE d.id = ?`,
};

export async function GET(request: Request, { params }: RouteContext) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before accessing evidence.' },
      { status: 403 }
    );
  }
  const { id } = await params;
  try {
    const [evidenceRows] = await getDbPool().execute<EvidenceRow[]>(
      `SELECT workflow_type, workflow_id, file_name, file_content
      FROM health_asset_workflow_evidence WHERE id = ?`,
      [id]
    );
    const evidence = evidenceRows[0];
    if (!evidence) {
      return NextResponse.json({ error: 'Evidence document not found.' }, { status: 404 });
    }
    const [workflows] = await getDbPool().execute<WorkflowRow[]>(
      districtQueries[evidence.workflow_type],
      [evidence.workflow_id]
    );
    const workflow = workflows[0];
    if (!workflow || !canAccessDistrict(auth.user, workflow.district)) {
      return NextResponse.json({ error: 'Evidence document not found.' }, { status: 404 });
    }
    return new NextResponse(evidence.file_content, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="workflow-evidence.pdf"; filename*=UTF-8''${encodeURIComponent(evidence.file_name)}`,
        'Content-Length': String(evidence.file_content.length),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Failed to download workflow evidence:', error);
    return NextResponse.json(
      { error: 'Unable to download workflow evidence.' },
      { status: 500 }
    );
  }
}
