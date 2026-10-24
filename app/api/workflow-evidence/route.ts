import { NextResponse } from 'next/server';
import type { RowDataPacket } from 'mysql2';
import {
  canAccessDistrict,
  hasDistrictAssignment,
  requireUser,
} from '@/lib/auth';
import { getDbPool } from '@/lib/db';
import {
  WORKFLOW_EVIDENCE_TYPES,
  type WorkflowEvidenceType,
} from '@/lib/workflow-evidence';

export const dynamic = 'force-dynamic';

type WorkflowRow = { district: string } & RowDataPacket;
type EvidenceMetadata = {
  id: string;
  action: string;
  file_name: string;
  uploaded_at: string;
} & RowDataPacket;

async function getWorkflowDistrict(
  type: WorkflowEvidenceType,
  id: string
): Promise<string | null> {
  const queryByType: Record<WorkflowEvidenceType, string> = {
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
  const [rows] = await getDbPool().execute<WorkflowRow[]>(queryByType[type], [id]);
  return rows[0]?.district ?? null;
}

export async function GET(request: Request) {
  const auth = await requireUser(request);
  if (auth.response) return auth.response;
  if (!hasDistrictAssignment(auth.user)) {
    return NextResponse.json(
      { error: 'Your account needs a district assignment before accessing evidence.' },
      { status: 403 }
    );
  }
  const params = new URL(request.url).searchParams;
  const type = params.get('type') as WorkflowEvidenceType | null;
  const workflowId = params.get('workflowId')?.trim() ?? '';
  if (
    !type ||
    !WORKFLOW_EVIDENCE_TYPES.includes(type) ||
    !workflowId
  ) {
    return NextResponse.json(
      { error: 'Select a valid workflow record to view its evidence.' },
      { status: 400 }
    );
  }
  try {
    const district = await getWorkflowDistrict(type, workflowId);
    if (!district || !canAccessDistrict(auth.user, district)) {
      return NextResponse.json({ error: 'Workflow record not found.' }, { status: 404 });
    }
    const [evidence] = await getDbPool().execute<EvidenceMetadata[]>(
      `SELECT id, action, file_name, uploaded_at
      FROM health_asset_workflow_evidence
      WHERE workflow_type = ? AND workflow_id = ?
      ORDER BY uploaded_at`,
      [type, workflowId]
    );
    return NextResponse.json(evidence);
  } catch (error) {
    console.error('Failed to load workflow evidence:', error);
    return NextResponse.json(
      { error: 'Unable to load workflow evidence.' },
      { status: 500 }
    );
  }
}
