// CVERiskPilot Domain Types
// Re-exports from Prisma-generated client for use across the monorepo

// Re-export Prisma client
export { PrismaClient } from '@prisma/client';
export type { Prisma } from '@prisma/client';

// Re-export all generated model types
export type {
  Organization,
  Client,
  User,
  Team,
  TeamMembership,
  ClientTeamAssignment,
  Asset,
  Finding,
  VulnerabilityCase,
  ScanArtifact,
  UploadJob,
  Comment,
  WorkflowLineage,
  RiskException,
  Ticket,
  SlaPolicy,
  ApiKey,
  AuditLog,
  Notification,
  GlobalCveRecord,
  GlobalEpssScore,
  GlobalKevRecord,
} from '@prisma/client';

// Re-export enums (as values, not just types)
export {
  UserRole,
  UserStatus,
  Tier,
  Severity,
  CaseStatus,
  UploadJobStatus,
  AssetType,
  Environment,
  Criticality,
  ScannerType,
  ParserFormat,
  AuditAction,
  TeamRole,
  ExceptionType,
} from '@prisma/client';
