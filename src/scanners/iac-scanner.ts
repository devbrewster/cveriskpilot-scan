/**
 * Infrastructure-as-Code Compliance Scanner
 *
 * Scans Terraform, CloudFormation, Kubernetes manifests, and Dockerfiles
 * against CIS benchmarks + NIST 800-53 controls.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import type { CanonicalFinding } from '@cveriskpilot/parsers/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IacRule {
  id: string;
  title: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  description: string;
  nistControls: string[];
  cisBenchmarkRef?: string;
  fileTypes: IacFileType[];
  check: (content: string, filePath: string) => IacViolation[];
}

export type IacFileType = 'terraform' | 'cloudformation' | 'kubernetes' | 'dockerfile';

export interface IacViolation {
  ruleId: string;
  filePath: string;
  lineNumber: number;
  detail: string;
}

export interface IacScanResult {
  findings: CanonicalFinding[];
  violations: IacViolation[];
  filesScanned: number;
  rulesPassed: number;
  rulesFailed: number;
}

// ---------------------------------------------------------------------------
// File Type Detection
// ---------------------------------------------------------------------------

function detectFileType(filePath: string, content: string): IacFileType | null {
  const basename = path.basename(filePath).toLowerCase();
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.tf') return 'terraform';
  if (basename === 'dockerfile' || basename.startsWith('dockerfile.')) return 'dockerfile';

  if (ext === '.yaml' || ext === '.yml' || ext === '.json') {
    if (content.includes('AWSTemplateFormatVersion')) return 'cloudformation';
    if (content.includes('apiVersion') && content.includes('kind')) return 'kubernetes';
  }

  return null;
}

// ---------------------------------------------------------------------------
// Line Number Finder
// ---------------------------------------------------------------------------

function findLineNumber(content: string, searchStr: string, startLine = 0): number {
  const lines = content.split('\n');
  for (let i = startLine; i < lines.length; i++) {
    if (lines[i].includes(searchStr)) return i + 1;
  }
  return 1;
}

function findLineNumberRegex(content: string, regex: RegExp): number {
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) return i + 1;
  }
  return 1;
}

// ---------------------------------------------------------------------------
// Terraform Rules
// ---------------------------------------------------------------------------

const terraformRules: IacRule[] = [
  {
    id: 'TF-001',
    title: 'S3 Bucket Public Access Enabled',
    severity: 'CRITICAL',
    description: 'S3 bucket allows public access. Public buckets can expose sensitive data to the internet.',
    nistControls: ['SC-7', 'AC-3'],
    cisBenchmarkRef: 'CIS AWS 2.1.5',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      // Check for public ACL
      if (/acl\s*=\s*"public-read"/.test(content)) {
        violations.push({
          ruleId: 'TF-001',
          filePath,
          lineNumber: findLineNumberRegex(content, /acl\s*=\s*"public-read"/),
          detail: 'S3 bucket has public-read ACL.',
        });
      }
      if (/acl\s*=\s*"public-read-write"/.test(content)) {
        violations.push({
          ruleId: 'TF-001',
          filePath,
          lineNumber: findLineNumberRegex(content, /acl\s*=\s*"public-read-write"/),
          detail: 'S3 bucket has public-read-write ACL.',
        });
      }
      return violations;
    },
  },
  {
    id: 'TF-002',
    title: 'S3 Bucket Missing Server-Side Encryption',
    severity: 'HIGH',
    description: 'S3 bucket does not have server-side encryption configured, risking data exposure at rest.',
    nistControls: ['SC-28'],
    cisBenchmarkRef: 'CIS AWS 2.1.1',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const bucketRegex = /resource\s+"aws_s3_bucket"\s+"([^"]+)"/g;
      let match;
      while ((match = bucketRegex.exec(content)) !== null) {
        const bucketName = match[1];
        // Check if there's a corresponding encryption configuration
        const afterBucket = content.slice(match.index);
        const hasEncryption =
          /server_side_encryption_configuration/.test(afterBucket.slice(0, 500)) ||
          content.includes(`aws_s3_bucket_server_side_encryption_configuration`);
        if (!hasEncryption) {
          violations.push({
            ruleId: 'TF-002',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `S3 bucket "${bucketName}" missing server-side encryption.`,
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'TF-003',
    title: 'Overly Permissive IAM Policy',
    severity: 'CRITICAL',
    description: 'IAM policy uses wildcard (*) for actions or resources, violating least privilege.',
    nistControls: ['AC-6', 'AC-3'],
    cisBenchmarkRef: 'CIS AWS 1.16',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      // Look for "Action": "*" or actions = ["*"]
      const wildcardPatterns = [
        /actions\s*=\s*\[\s*"\*"\s*\]/g,
        /"Action"\s*:\s*"\*"/g,
        /"Action"\s*:\s*\[\s*"\*"\s*\]/g,
        /effect\s*=\s*"Allow"[\s\S]{0,200}actions\s*=\s*\[\s*"\*"/g,
      ];
      for (const pattern of wildcardPatterns) {
        let m;
        while ((m = pattern.exec(content)) !== null) {
          violations.push({
            ruleId: 'TF-003',
            filePath,
            lineNumber: findLineNumber(content, m[0].slice(0, 40)),
            detail: 'IAM policy grants wildcard (*) permissions.',
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'TF-004',
    title: 'CloudTrail Logging Not Enabled',
    severity: 'HIGH',
    description: 'No CloudTrail resource defined for audit logging.',
    nistControls: ['AU-2', 'AU-3', 'AU-12'],
    cisBenchmarkRef: 'CIS AWS 3.1',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      // Only flag if we see AWS provider but no cloudtrail
      if (content.includes('provider "aws"') && !content.includes('aws_cloudtrail')) {
        violations.push({
          ruleId: 'TF-004',
          filePath,
          lineNumber: findLineNumber(content, 'provider "aws"'),
          detail: 'AWS provider configured but no CloudTrail resource found.',
        });
      }
      return violations;
    },
  },
  {
    id: 'TF-005',
    title: 'Default VPC in Use',
    severity: 'MEDIUM',
    description: 'Using the default VPC is discouraged; it has overly permissive security groups.',
    nistControls: ['SC-7'],
    cisBenchmarkRef: 'CIS AWS 4.3',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/aws_default_vpc/.test(content)) {
        violations.push({
          ruleId: 'TF-005',
          filePath,
          lineNumber: findLineNumberRegex(content, /aws_default_vpc/),
          detail: 'Default VPC resource is being used.',
        });
      }
      return violations;
    },
  },
  {
    id: 'TF-006',
    title: 'Unencrypted EBS Volume',
    severity: 'HIGH',
    description: 'EBS volume not encrypted at rest.',
    nistControls: ['SC-28'],
    cisBenchmarkRef: 'CIS AWS 2.2.1',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const ebsRegex = /resource\s+"aws_ebs_volume"\s+"([^"]+)"/g;
      let match;
      while ((match = ebsRegex.exec(content)) !== null) {
        const blockEnd = content.indexOf('\n}', match.index);
        const block = content.slice(match.index, blockEnd > 0 ? blockEnd : match.index + 500);
        if (!block.includes('encrypted') || /encrypted\s*=\s*false/.test(block)) {
          violations.push({
            ruleId: 'TF-006',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `EBS volume "${match[1]}" is not encrypted.`,
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'TF-007',
    title: 'Security Group Allows Unrestricted Ingress',
    severity: 'HIGH',
    description: 'Security group allows ingress from 0.0.0.0/0 on sensitive ports.',
    nistControls: ['SC-7', 'AC-4'],
    cisBenchmarkRef: 'CIS AWS 4.1',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const sgRegex = /cidr_blocks\s*=\s*\[\s*"0\.0\.0\.0\/0"\s*\]/g;
      let match;
      while ((match = sgRegex.exec(content)) !== null) {
        violations.push({
          ruleId: 'TF-007',
          filePath,
          lineNumber: findLineNumber(content, match[0]),
          detail: 'Security group allows unrestricted ingress from 0.0.0.0/0.',
        });
      }
      return violations;
    },
  },
  {
    id: 'TF-008',
    title: 'RDS Instance Not Encrypted',
    severity: 'HIGH',
    description: 'RDS database instance does not have storage encryption enabled.',
    nistControls: ['SC-28'],
    cisBenchmarkRef: 'CIS AWS 2.3.1',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const rdsRegex = /resource\s+"aws_db_instance"\s+"([^"]+)"/g;
      let match;
      while ((match = rdsRegex.exec(content)) !== null) {
        const blockEnd = content.indexOf('\n}', match.index);
        const block = content.slice(match.index, blockEnd > 0 ? blockEnd : match.index + 800);
        if (!block.includes('storage_encrypted') || /storage_encrypted\s*=\s*false/.test(block)) {
          violations.push({
            ruleId: 'TF-008',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `RDS instance "${match[1]}" storage is not encrypted.`,
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'TF-009',
    title: 'S3 Bucket Versioning Disabled',
    severity: 'MEDIUM',
    description: 'S3 bucket versioning is not enabled, risking data loss.',
    nistControls: ['CM-2', 'SI-7'],
    cisBenchmarkRef: 'CIS AWS 2.1.3',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const bucketRegex = /resource\s+"aws_s3_bucket"\s+"([^"]+)"/g;
      let match;
      while ((match = bucketRegex.exec(content)) !== null) {
        if (!content.includes('aws_s3_bucket_versioning')) {
          violations.push({
            ruleId: 'TF-009',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `S3 bucket "${match[1]}" does not have versioning configured.`,
          });
          break; // Only flag once per file
        }
      }
      return violations;
    },
  },
  {
    id: 'TF-010',
    title: 'S3 Bucket Missing Access Logging',
    severity: 'MEDIUM',
    description: 'S3 bucket does not have access logging enabled.',
    nistControls: ['AU-2', 'AU-12'],
    cisBenchmarkRef: 'CIS AWS 2.1.2',
    fileTypes: ['terraform'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const bucketRegex = /resource\s+"aws_s3_bucket"\s+"([^"]+)"/g;
      let match;
      while ((match = bucketRegex.exec(content)) !== null) {
        const blockEnd = content.indexOf('\n}', match.index);
        const block = content.slice(match.index, blockEnd > 0 ? blockEnd : match.index + 500);
        if (!block.includes('logging') && !content.includes('aws_s3_bucket_logging')) {
          violations.push({
            ruleId: 'TF-010',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `S3 bucket "${match[1]}" does not have access logging.`,
          });
        }
      }
      return violations;
    },
  },
];

// ---------------------------------------------------------------------------
// CloudFormation Rules
// ---------------------------------------------------------------------------

const cloudFormationRules: IacRule[] = [
  {
    id: 'CFN-001',
    title: 'S3 Bucket Public Access in CloudFormation',
    severity: 'CRITICAL',
    description: 'CloudFormation S3 bucket allows public access.',
    nistControls: ['SC-7', 'AC-3'],
    cisBenchmarkRef: 'CIS AWS 2.1.5',
    fileTypes: ['cloudformation'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/PublicRead|PublicReadWrite/.test(content) && /AWS::S3::Bucket/.test(content)) {
        violations.push({
          ruleId: 'CFN-001',
          filePath,
          lineNumber: findLineNumberRegex(content, /PublicRead/),
          detail: 'CloudFormation S3 bucket has public access ACL.',
        });
      }
      return violations;
    },
  },
  {
    id: 'CFN-002',
    title: 'Missing S3 Encryption in CloudFormation',
    severity: 'HIGH',
    description: 'CloudFormation S3 bucket missing server-side encryption.',
    nistControls: ['SC-28'],
    fileTypes: ['cloudformation'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/AWS::S3::Bucket/.test(content) && !/BucketEncryption/.test(content)) {
        violations.push({
          ruleId: 'CFN-002',
          filePath,
          lineNumber: findLineNumberRegex(content, /AWS::S3::Bucket/),
          detail: 'S3 bucket missing BucketEncryption configuration.',
        });
      }
      return violations;
    },
  },
  {
    id: 'CFN-003',
    title: 'Wildcard IAM Action in CloudFormation',
    severity: 'CRITICAL',
    description: 'CloudFormation IAM policy uses wildcard actions.',
    nistControls: ['AC-6', 'AC-3'],
    fileTypes: ['cloudformation'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/Effect.*Allow[\s\S]{0,200}Action.*\*/.test(content)) {
        violations.push({
          ruleId: 'CFN-003',
          filePath,
          lineNumber: findLineNumberRegex(content, /"Action"\s*:\s*"\*"/),
          detail: 'IAM policy grants wildcard permissions.',
        });
      }
      return violations;
    },
  },
  {
    id: 'CFN-004',
    title: 'CloudFormation Missing CloudTrail',
    severity: 'HIGH',
    description: 'CloudFormation template does not define CloudTrail for logging.',
    nistControls: ['AU-2', 'AU-3'],
    fileTypes: ['cloudformation'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/AWS::/.test(content) && !/AWS::CloudTrail/.test(content)) {
        violations.push({
          ruleId: 'CFN-004',
          filePath,
          lineNumber: 1,
          detail: 'No CloudTrail resource defined in CloudFormation template.',
        });
      }
      return violations;
    },
  },
  {
    id: 'CFN-005',
    title: 'Security Group Unrestricted Ingress in CloudFormation',
    severity: 'HIGH',
    description: 'CloudFormation security group allows 0.0.0.0/0 ingress.',
    nistControls: ['SC-7', 'AC-4'],
    fileTypes: ['cloudformation'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/CidrIp.*0\.0\.0\.0\/0/.test(content)) {
        violations.push({
          ruleId: 'CFN-005',
          filePath,
          lineNumber: findLineNumberRegex(content, /0\.0\.0\.0\/0/),
          detail: 'Security group allows unrestricted ingress from 0.0.0.0/0.',
        });
      }
      return violations;
    },
  },
];

// ---------------------------------------------------------------------------
// Kubernetes Rules
// ---------------------------------------------------------------------------

const kubernetesRules: IacRule[] = [
  {
    id: 'K8S-001',
    title: 'Privileged Container',
    severity: 'CRITICAL',
    description: 'Container runs in privileged mode, giving full host access.',
    nistControls: ['AC-6', 'AC-3'],
    cisBenchmarkRef: 'CIS Kubernetes 5.2.1',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/privileged:\s*true/.test(content)) {
        violations.push({
          ruleId: 'K8S-001',
          filePath,
          lineNumber: findLineNumberRegex(content, /privileged:\s*true/),
          detail: 'Container runs in privileged mode.',
        });
      }
      return violations;
    },
  },
  {
    id: 'K8S-002',
    title: 'Host Network Enabled',
    severity: 'HIGH',
    description: 'Pod uses host network, bypassing network isolation.',
    nistControls: ['SC-7', 'AC-4'],
    cisBenchmarkRef: 'CIS Kubernetes 5.2.4',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/hostNetwork:\s*true/.test(content)) {
        violations.push({
          ruleId: 'K8S-002',
          filePath,
          lineNumber: findLineNumberRegex(content, /hostNetwork:\s*true/),
          detail: 'Pod uses host network namespace.',
        });
      }
      return violations;
    },
  },
  {
    id: 'K8S-003',
    title: 'Missing Resource Limits',
    severity: 'MEDIUM',
    description: 'Container does not define resource limits, risking denial-of-service.',
    nistControls: ['SC-5'],
    cisBenchmarkRef: 'CIS Kubernetes 5.4.1',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      // Check for containers without resource limits
      if (/containers:/.test(content) && !/limits:/.test(content)) {
        violations.push({
          ruleId: 'K8S-003',
          filePath,
          lineNumber: findLineNumberRegex(content, /containers:/),
          detail: 'Container does not define resource limits (CPU/memory).',
        });
      }
      return violations;
    },
  },
  {
    id: 'K8S-004',
    title: 'Container Uses Latest Tag',
    severity: 'MEDIUM',
    description: 'Container image uses :latest tag, making deployments non-reproducible.',
    nistControls: ['CM-7', 'CM-2'],
    cisBenchmarkRef: 'CIS Kubernetes 5.5.1',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const imageRegex = /image:\s*['"]?([^'":\s]+):latest['"]?/g;
      let match;
      while ((match = imageRegex.exec(content)) !== null) {
        violations.push({
          ruleId: 'K8S-004',
          filePath,
          lineNumber: findLineNumber(content, match[0]),
          detail: `Container image "${match[1]}:latest" uses mutable tag.`,
        });
      }
      // Also flag images without any tag
      const noTagRegex = /image:\s*['"]?([a-zA-Z0-9./_-]+)['"]?\s*$/gm;
      while ((match = noTagRegex.exec(content)) !== null) {
        if (!match[1].includes(':') && !match[1].includes('@')) {
          violations.push({
            ruleId: 'K8S-004',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `Container image "${match[1]}" has no version tag (defaults to :latest).`,
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'K8S-005',
    title: 'Missing readOnlyRootFilesystem',
    severity: 'MEDIUM',
    description: 'Container does not set readOnlyRootFilesystem, allowing filesystem writes.',
    nistControls: ['CM-7'],
    cisBenchmarkRef: 'CIS Kubernetes 5.2.4',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/containers:/.test(content) && !/readOnlyRootFilesystem:\s*true/.test(content)) {
        violations.push({
          ruleId: 'K8S-005',
          filePath,
          lineNumber: findLineNumberRegex(content, /containers:/),
          detail: 'Container does not set readOnlyRootFilesystem: true.',
        });
      }
      return violations;
    },
  },
  {
    id: 'K8S-006',
    title: 'Container Runs as Root',
    severity: 'HIGH',
    description: 'Container runs as root user (UID 0).',
    nistControls: ['AC-6'],
    cisBenchmarkRef: 'CIS Kubernetes 5.2.6',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/runAsUser:\s*0/.test(content)) {
        violations.push({
          ruleId: 'K8S-006',
          filePath,
          lineNumber: findLineNumberRegex(content, /runAsUser:\s*0/),
          detail: 'Container explicitly runs as root (UID 0).',
        });
      }
      if (/runAsNonRoot:\s*false/.test(content)) {
        violations.push({
          ruleId: 'K8S-006',
          filePath,
          lineNumber: findLineNumberRegex(content, /runAsNonRoot:\s*false/),
          detail: 'runAsNonRoot is set to false.',
        });
      }
      return violations;
    },
  },
  {
    id: 'K8S-007',
    title: 'Host PID Namespace Enabled',
    severity: 'HIGH',
    description: 'Pod shares the host PID namespace, allowing process visibility.',
    nistControls: ['AC-6', 'SC-7'],
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/hostPID:\s*true/.test(content)) {
        violations.push({
          ruleId: 'K8S-007',
          filePath,
          lineNumber: findLineNumberRegex(content, /hostPID:\s*true/),
          detail: 'Pod shares host PID namespace.',
        });
      }
      return violations;
    },
  },
  {
    id: 'K8S-008',
    title: 'Capability Added: SYS_ADMIN',
    severity: 'CRITICAL',
    description: 'Container adds SYS_ADMIN capability, equivalent to privileged mode.',
    nistControls: ['AC-6'],
    cisBenchmarkRef: 'CIS Kubernetes 5.2.8',
    fileTypes: ['kubernetes'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/SYS_ADMIN/.test(content) && /add:/.test(content)) {
        violations.push({
          ruleId: 'K8S-008',
          filePath,
          lineNumber: findLineNumberRegex(content, /SYS_ADMIN/),
          detail: 'Container adds SYS_ADMIN capability.',
        });
      }
      return violations;
    },
  },
];

// ---------------------------------------------------------------------------
// Dockerfile Rules
// ---------------------------------------------------------------------------

const dockerfileRules: IacRule[] = [
  {
    id: 'DOCKER-001',
    title: 'Dockerfile Running as Root',
    severity: 'HIGH',
    description: 'Dockerfile does not specify a non-root USER, container will run as root.',
    nistControls: ['AC-6'],
    cisBenchmarkRef: 'CIS Docker 4.1',
    fileTypes: ['dockerfile'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      // Check if USER directive exists (not root)
      const userLines = content.match(/^USER\s+(.+)$/gm);
      if (!userLines) {
        violations.push({
          ruleId: 'DOCKER-001',
          filePath,
          lineNumber: 1,
          detail: 'No USER directive found; container will run as root.',
        });
      } else {
        // Check if last USER is root
        const lastUser = userLines[userLines.length - 1];
        if (/USER\s+root/i.test(lastUser)) {
          violations.push({
            ruleId: 'DOCKER-001',
            filePath,
            lineNumber: findLineNumber(content, lastUser),
            detail: 'Last USER directive sets root user.',
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'DOCKER-002',
    title: 'Using ADD Instead of COPY',
    severity: 'LOW',
    description: 'ADD instruction used instead of COPY. ADD has implicit tar extraction and URL fetching which can be unexpected.',
    nistControls: ['CM-7'],
    cisBenchmarkRef: 'CIS Docker 4.9',
    fileTypes: ['dockerfile'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const addRegex = /^ADD\s+(?!--chown)/gm;
      let match: RegExpExecArray | null;
      while ((match = addRegex.exec(content)) !== null) {
        // Skip if it's adding a URL (sometimes intentional)
        const matchStr = match[0];
        const line = content.split('\n').find((l) => l.startsWith(matchStr));
        if (line && !line.includes('http://') && !line.includes('https://')) {
          violations.push({
            ruleId: 'DOCKER-002',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: 'Use COPY instead of ADD for local file copies.',
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'DOCKER-003',
    title: 'Missing HEALTHCHECK',
    severity: 'LOW',
    description: 'Dockerfile does not define a HEALTHCHECK instruction.',
    nistControls: ['SI-4'],
    cisBenchmarkRef: 'CIS Docker 4.6',
    fileTypes: ['dockerfile'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (!/^HEALTHCHECK\s/m.test(content)) {
        violations.push({
          ruleId: 'DOCKER-003',
          filePath,
          lineNumber: 1,
          detail: 'No HEALTHCHECK instruction defined.',
        });
      }
      return violations;
    },
  },
  {
    id: 'DOCKER-004',
    title: 'Using Latest Base Image Tag',
    severity: 'MEDIUM',
    description: 'FROM uses :latest or no tag, making builds non-reproducible.',
    nistControls: ['CM-2', 'CM-7'],
    fileTypes: ['dockerfile'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const fromRegex = /^FROM\s+(\S+)/gm;
      let match;
      while ((match = fromRegex.exec(content)) !== null) {
        const image = match[1];
        if (image === 'scratch') continue; // scratch is fine
        if (image.includes(':latest') || (!image.includes(':') && !image.includes('@'))) {
          violations.push({
            ruleId: 'DOCKER-004',
            filePath,
            lineNumber: findLineNumber(content, match[0]),
            detail: `Base image "${image}" uses no version pin or :latest.`,
          });
        }
      }
      return violations;
    },
  },
  {
    id: 'DOCKER-005',
    title: 'Secrets in ENV or ARG',
    severity: 'HIGH',
    description: 'Potential secret value passed via ENV or ARG instruction.',
    nistControls: ['IA-5', 'SC-28'],
    fileTypes: ['dockerfile'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      const envRegex = /^(?:ENV|ARG)\s+(\S+)/gm;
      const secretKeywords = ['PASSWORD', 'SECRET', 'TOKEN', 'KEY', 'CREDENTIAL', 'PRIVATE'];
      let match;
      while ((match = envRegex.exec(content)) !== null) {
        const varName = match[1].toUpperCase();
        if (secretKeywords.some((kw) => varName.includes(kw))) {
          // Check if it has a default value (ARG NAME=value)
          const fullLine = content.split('\n').find((l) => l.includes(match![0])) ?? '';
          if (fullLine.includes('=') && !fullLine.trim().endsWith('=')) {
            violations.push({
              ruleId: 'DOCKER-005',
              filePath,
              lineNumber: findLineNumber(content, match[0]),
              detail: `Secret-like variable "${match[1]}" has a default value in Dockerfile.`,
            });
          }
        }
      }
      return violations;
    },
  },
  {
    id: 'DOCKER-006',
    title: 'Using sudo in RUN',
    severity: 'MEDIUM',
    description: 'Using sudo in Dockerfile RUN instructions is unnecessary and adds attack surface.',
    nistControls: ['AC-6', 'CM-7'],
    fileTypes: ['dockerfile'],
    check(content, filePath) {
      const violations: IacViolation[] = [];
      if (/^RUN\s+.*\bsudo\b/m.test(content)) {
        violations.push({
          ruleId: 'DOCKER-006',
          filePath,
          lineNumber: findLineNumberRegex(content, /^RUN\s+.*\bsudo\b/m),
          detail: 'Dockerfile uses sudo in RUN instruction.',
        });
      }
      return violations;
    },
  },
];

// ---------------------------------------------------------------------------
// All Rules Registry
// ---------------------------------------------------------------------------

const ALL_RULES: IacRule[] = [
  ...terraformRules,
  ...cloudFormationRules,
  ...kubernetesRules,
  ...dockerfileRules,
];

// ---------------------------------------------------------------------------
// File Walking
// ---------------------------------------------------------------------------

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  '.next',
  'dist',
  'build',
  '.cache',
  '.turbo',
  'vendor',
  '__pycache__',
]);

async function* walkIacFiles(dir: string): AsyncGenerator<string> {
  let entries: fs.Dirent[];
  try {
    entries = await fs.promises.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (EXCLUDED_DIRS.has(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      yield* walkIacFiles(fullPath);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      const basename = entry.name.toLowerCase();
      if (
        ext === '.tf' ||
        ext === '.yaml' ||
        ext === '.yml' ||
        ext === '.json' ||
        basename === 'dockerfile' ||
        basename.startsWith('dockerfile.')
      ) {
        yield fullPath;
      }
    }
  }
}

// ---------------------------------------------------------------------------
// CWE Mapping for IaC Rules
// ---------------------------------------------------------------------------

const NIST_TO_CWE: Record<string, string> = {
  'AC-3': 'CWE-284',
  'AC-4': 'CWE-284',
  'AC-6': 'CWE-269',
  'AU-2': 'CWE-778',
  'AU-3': 'CWE-778',
  'AU-12': 'CWE-778',
  'CM-2': 'CWE-16',
  'CM-7': 'CWE-16',
  'IA-5': 'CWE-798',
  'SC-5': 'CWE-400',
  'SC-7': 'CWE-284',
  'SC-28': 'CWE-311',
  'SI-4': 'CWE-778',
  'SI-7': 'CWE-345',
};

function nistToCweIds(nistControls: string[]): string[] {
  const cwes = new Set<string>();
  for (const ctrl of nistControls) {
    const cwe = NIST_TO_CWE[ctrl];
    if (cwe) cwes.add(cwe);
  }
  return cwes.size > 0 ? Array.from(cwes) : ['CWE-16'];
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function scanIaC(projectDir: string): Promise<IacScanResult> {
  const allViolations: IacViolation[] = [];
  let filesScanned = 0;
  const ruleHits = new Set<string>();
  const now = new Date();

  for await (const filePath of walkIacFiles(projectDir)) {
    let content: string;
    try {
      const stat = await fs.promises.stat(filePath);
      if (stat.size > 2_097_152) continue; // Skip files > 2MB
      content = await fs.promises.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    const fileType = detectFileType(filePath, content);
    if (!fileType) continue;

    filesScanned++;

    for (const rule of ALL_RULES) {
      if (!rule.fileTypes.includes(fileType)) continue;
      try {
        const violations = rule.check(content, filePath);
        if (violations.length > 0) {
          ruleHits.add(rule.id);
          allViolations.push(...violations);
        }
      } catch {
        // Skip rules that error on specific content
      }
    }
  }

  const ruleMap = new Map(ALL_RULES.map((r) => [r.id, r]));

  const findings: CanonicalFinding[] = allViolations.map((v) => {
    const rule = ruleMap.get(v.ruleId)!;
    const relativePath = path.relative(projectDir, v.filePath);
    return {
      title: rule.title,
      description: `${rule.description}\n\nNIST Controls: ${rule.nistControls.join(', ')}${rule.cisBenchmarkRef ? `\nCIS Benchmark: ${rule.cisBenchmarkRef}` : ''}\n\nDetail: ${v.detail}`,
      cveIds: [],
      cweIds: nistToCweIds(rule.nistControls),
      severity: rule.severity,
      scannerType: 'iac',
      scannerName: 'cveriskpilot-scan/iac',
      assetName: projectDir,
      assetType: 'repository',
      filePath: relativePath,
      lineNumber: v.lineNumber,
      snippet: v.detail,
      rawObservations: {
        ruleId: rule.id,
        nistControls: rule.nistControls,
        cisBenchmarkRef: rule.cisBenchmarkRef ?? null,
      },
      discoveredAt: now,
    };
  });

  return {
    findings,
    violations: allViolations,
    filesScanned,
    rulesPassed: ALL_RULES.length - ruleHits.size,
    rulesFailed: ruleHits.size,
  };
}
