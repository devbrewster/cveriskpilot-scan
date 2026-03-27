// ---------------------------------------------------------------------------
// Shared types for the @cveriskpilot/storage package
// ---------------------------------------------------------------------------

export interface UploadParams {
  buffer: Buffer;
  filename: string;
  organizationId: string;
  clientId: string;
  mimeType: string;
}

export interface UploadResult {
  gcsBucket: string;
  gcsPath: string;
  checksumSha256: string;
  sizeBytes: number;
}

export interface CreateArtifactParams {
  file: Buffer;
  filename: string;
  mimeType: string;
  organizationId: string;
  clientId: string;
  uploadedById: string;
  parserFormat: string;
}

export interface ArtifactRecord {
  id: string;
  organizationId: string;
  clientId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  gcsBucket: string;
  gcsPath: string;
  checksumSha256: string;
  parserFormat: string;
  uploadedById: string;
  createdAt: Date;
}

export interface EnqueueParams {
  organizationId: string;
  clientId: string;
  artifactId: string;
  uploadedById: string;
}

export interface JobProgress {
  total: number;
  parsed: number;
  enriched: number;
  created: number;
}

export interface JobStatus {
  id: string;
  status: string;
  progress: JobProgress;
  error?: string;
  timestamps: {
    created: Date;
    updated: Date;
    completed?: Date | null;
  };
}
