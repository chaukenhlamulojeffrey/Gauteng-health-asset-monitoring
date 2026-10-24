'use client';

import { FileText, Upload } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type EvidencePdfFieldProps = {
  id: string;
  file: File | null;
  onChange: (file: File | null) => void;
  title?: string;
  description?: string;
};

export function EvidencePdfField({
  id,
  file,
  onChange,
  title = 'Supporting evidence (PDF)',
  description = 'Scan and attach the supporting document for this workflow. PDF only, maximum 10 MB.',
}: EvidencePdfFieldProps) {
  return (
    <div className="space-y-2 rounded-lg border border-primary/20 bg-primary/[0.03] p-4">
      <Label htmlFor={id}>
        <Upload aria-hidden="true" className="mr-1 inline h-4 w-4" />
        {title} <span className="text-destructive">*</span>
      </Label>
      <p className="text-sm text-muted-foreground">{description}</p>
      <Input
        id={id}
        type="file"
        accept="application/pdf,.pdf"
        required
        onChange={(event) => onChange(event.target.files?.[0] ?? null)}
      />
      {file && (
        <p className="flex items-center gap-2 text-sm text-foreground">
          <FileText aria-hidden="true" className="h-4 w-4 text-primary" />
          {file.name}
        </p>
      )}
    </div>
  );
}
