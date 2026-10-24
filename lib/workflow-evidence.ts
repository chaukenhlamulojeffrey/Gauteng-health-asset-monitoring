import type { PoolConnection } from 'mysql2/promise';

export const WORKFLOW_EVIDENCE_TYPES = [
  'maintenance',
  'decommission',
  'lost',
  'disposal',
] as const;

export type WorkflowEvidenceType = (typeof WORKFLOW_EVIDENCE_TYPES)[number];
export type WorkflowEvidenceAction =
  | 'submission'
  | 'completion'
  | 'review'
  | 'recovery';

export type ValidatedPdfEvidence = {
  fileName: string;
  fileSize: number;
  fileContent: Buffer;
};

export type EvidenceRequestResult =
  | { ok: true; body: unknown; evidence: ValidatedPdfEvidence }
  | { ok: false; status: number; error: string };

export async function parseEvidenceRequest(
  request: Request,
  payloadField = 'data'
): Promise<EvidenceRequestResult> {
  const contentLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > 11 * 1024 * 1024) {
    return { ok: false, status: 413, error: 'Evidence PDF must be no larger than 10 MB.' };
  }
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return {
      ok: false,
      status: 400,
      error: 'Submit the details with the required scanned PDF evidence document.',
    };
  }
  const serialized = formData.get(payloadField);
  if (typeof serialized !== 'string') {
    return { ok: false, status: 400, error: 'Request details are missing or invalid.' };
  }
  let body: unknown;
  try {
    body = JSON.parse(serialized) as unknown;
  } catch {
    return { ok: false, status: 400, error: 'Request details are invalid.' };
  }
  const file = formData.get('evidence');
  if (!(file instanceof File)) {
    return {
      ok: false,
      status: 400,
      error: 'Attach the scanned evidence document as a PDF.',
    };
  }
  const fileName = file.name
    .replace(/[\\/]/g, '_')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, 255);
  if (
    !fileName ||
    !fileName.toLocaleLowerCase().endsWith('.pdf') ||
    file.size === 0 ||
    file.size > 10 * 1024 * 1024
  ) {
    return {
      ok: false,
      status: 400,
      error: 'Evidence must be a PDF file no larger than 10 MB.',
    };
  }
  const fileContent = Buffer.from(await file.arrayBuffer());
  const trailer = fileContent
    .subarray(Math.max(0, fileContent.length - 1024))
    .toString('latin1');
  if (
    fileContent.subarray(0, 5).toString('ascii') !== '%PDF-' ||
    !trailer.includes('%%EOF')
  ) {
    return {
      ok: false,
      status: 400,
      error: 'The attached file does not contain a valid PDF document.',
    };
  }
  return {
    ok: true,
    body,
    evidence: { fileName, fileSize: fileContent.length, fileContent },
  };
}

export async function insertWorkflowEvidence(
  connection: PoolConnection,
  workflowType: WorkflowEvidenceType,
  workflowId: string,
  action: WorkflowEvidenceAction,
  evidence: ValidatedPdfEvidence,
  uploadedBy: string
): Promise<void> {
  await connection.execute(
    `INSERT INTO health_asset_workflow_evidence (
      id, workflow_type, workflow_id, action, file_name, file_size,
      file_content, uploaded_by
    ) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?)`,
    [
      workflowType,
      workflowId,
      action,
      evidence.fileName,
      evidence.fileSize,
      evidence.fileContent,
      uploadedBy,
    ]
  );
}
