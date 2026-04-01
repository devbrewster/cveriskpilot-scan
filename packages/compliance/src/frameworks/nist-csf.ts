/**
 * NIST Cybersecurity Framework (CSF) 2.0
 * Vulnerability-relevant subcategories from the 6 core functions
 */

import type {
  ComplianceFramework,
  ComplianceEvidence,
  ComplianceAssessmentInput,
} from './types';

export const NIST_CSF_FRAMEWORK: ComplianceFramework = {
  id: 'nist-csf',
  name: 'NIST CSF 2.0',
  version: '2.0',
  description:
    'NIST Cybersecurity Framework 2.0 — voluntary guidance for managing cybersecurity risk across six core functions: Govern, Identify, Protect, Detect, Respond, Recover',
  controls: [
    // Govern (GV)
    {
      id: 'GV.OC-01',
      title: 'Organizational Context — Mission Understanding',
      description:
        'The organizational mission is understood and informs cybersecurity risk management. The organization determines its risk appetite and tolerance relevant to its mission and stakeholder expectations.',
      category: 'Govern',
      evidenceRequirements: [
        'Organizational mission documented and communicated',
        'Risk appetite statement defined',
        'Cybersecurity aligned with business objectives',
      ],
    },
    {
      id: 'GV.OC-03',
      title: 'Organizational Context — Legal and Regulatory Requirements',
      description:
        'Legal, regulatory, and contractual requirements regarding cybersecurity — including privacy and civil liberties obligations — are understood and managed.',
      category: 'Govern',
      evidenceRequirements: [
        'Applicable regulations identified and tracked',
        'Compliance obligations mapped to controls',
        'Regulatory change management process',
      ],
    },
    {
      id: 'GV.RM-01',
      title: 'Risk Management Strategy — Established and Communicated',
      description:
        'Risk management objectives are established and used to support operational risk decisions. The strategy addresses how the organization intends to assess, respond to, and monitor risk.',
      category: 'Govern',
      evidenceRequirements: [
        'Risk management strategy documented',
        'Risk assessment methodology defined',
        'Risk tolerance levels established',
      ],
    },
    {
      id: 'GV.RM-03',
      title: 'Risk Management Strategy — Risk Appetite Determined',
      description:
        'Strategic direction describing acceptable risk levels for the organization is established and used for risk-based decision making.',
      category: 'Govern',
      evidenceRequirements: [
        'Risk appetite statement formalized',
        'Risk exceptions documented and approved',
      ],
    },
    {
      id: 'GV.SC-01',
      title: 'Supply Chain Risk Management — Program Established',
      description:
        'A cybersecurity supply chain risk management program, strategy, objectives, policies, and processes are established and agreed to by organizational stakeholders.',
      category: 'Govern',
      evidenceRequirements: [
        'Supply chain risk management program documented',
        'Third-party risk assessment process defined',
        'SBOM tracking for software dependencies',
      ],
    },

    // Identify (ID)
    {
      id: 'ID.AM-01',
      title: 'Asset Management — Hardware Inventory',
      description:
        'Inventories of hardware managed by the organization are maintained, including devices, systems, and endpoints that may contain or process data.',
      category: 'Identify',
      evidenceRequirements: [
        'Hardware asset inventory maintained',
        'Asset discovery and tracking automated',
        'Asset ownership assigned',
      ],
    },
    {
      id: 'ID.AM-02',
      title: 'Asset Management — Software Inventory',
      description:
        'Inventories of software, services, and systems managed by the organization are maintained, including versions, patches, and configurations.',
      category: 'Identify',
      evidenceRequirements: [
        'Software asset inventory maintained',
        'Software version tracking active',
        'SBOM generated for applications',
      ],
    },
    {
      id: 'ID.AM-07',
      title: 'Asset Management — Data Inventory',
      description:
        'Inventories of data and corresponding metadata for designated data types are maintained.',
      category: 'Identify',
      evidenceRequirements: [
        'Data classification scheme established',
        'Data inventory maintained',
        'Data flow mapping documented',
      ],
    },
    {
      id: 'ID.RA-01',
      title: 'Risk Assessment — Vulnerability Identification',
      description:
        'Vulnerabilities in assets are identified, validated, and recorded. The organization uses threat intelligence and vulnerability disclosures to maintain awareness.',
      category: 'Identify',
      evidenceRequirements: [
        'Vulnerability scanning performed regularly',
        'Vulnerabilities tracked and prioritized',
        'Threat intelligence feeds integrated',
      ],
    },
    {
      id: 'ID.RA-02',
      title: 'Risk Assessment — Threat Intelligence',
      description:
        'Cyber threat intelligence is received from information sharing forums and sources, analyzed, and used to understand the threat landscape.',
      category: 'Identify',
      evidenceRequirements: [
        'Threat intelligence feeds configured',
        'KEV catalog integration',
        'EPSS scoring utilized',
      ],
    },
    {
      id: 'ID.RA-03',
      title: 'Risk Assessment — Threat Identification',
      description:
        'Internal and external threats to the organization are identified and recorded, including threat actors, tactics, techniques, and procedures.',
      category: 'Identify',
      evidenceRequirements: [
        'Threat landscape documented',
        'Threat modeling performed',
        'Attack surface analysis completed',
      ],
    },
    {
      id: 'ID.RA-05',
      title: 'Risk Assessment — Risk Determination',
      description:
        'Risks are assessed by considering likelihood and impact, including the vulnerability severity, threat exploitation probability, and potential business impact.',
      category: 'Identify',
      evidenceRequirements: [
        'Risk scoring methodology defined',
        'CVSS/EPSS risk scoring active',
        'Business impact analysis performed',
      ],
    },
    {
      id: 'ID.RA-06',
      title: 'Risk Assessment — Risk Response',
      description:
        'Risk responses are chosen, prioritized, planned, tracked, and communicated. Options include mitigation, transfer, avoidance, and acceptance.',
      category: 'Identify',
      evidenceRequirements: [
        'Risk response plans documented',
        'POAM generated for remediation tracking',
        'Risk acceptance documented via exceptions',
      ],
    },

    // Protect (PR)
    {
      id: 'PR.AA-01',
      title: 'Identity Management — Identities and Credentials',
      description:
        'Identities and credentials for authorized users, services, and hardware are managed by the organization.',
      category: 'Protect',
      evidenceRequirements: [
        'Identity management system active',
        'Credential policies enforced',
        'Multi-factor authentication implemented',
      ],
    },
    {
      id: 'PR.AA-03',
      title: 'Access Control — Remote Access',
      description:
        'Remote access is managed through secure mechanisms and monitored.',
      category: 'Protect',
      evidenceRequirements: [
        'Remote access secured via VPN or zero-trust',
        'Remote access sessions logged',
        'Session management controls enforced',
      ],
    },
    {
      id: 'PR.AA-05',
      title: 'Access Control — Least Privilege',
      description:
        'Access permissions and authorizations are defined and managed using the principles of least privilege and separation of duties.',
      category: 'Protect',
      evidenceRequirements: [
        'RBAC or ABAC enforced',
        'Least privilege principle applied',
        'Access reviews conducted periodically',
      ],
    },
    {
      id: 'PR.DS-01',
      title: 'Data Security — Data at Rest',
      description:
        'The confidentiality, integrity, and availability of data-at-rest are protected through encryption and access controls.',
      category: 'Protect',
      evidenceRequirements: [
        'Encryption at rest implemented (AES-256)',
        'Key management procedures documented',
        'Data classification enforced',
      ],
    },
    {
      id: 'PR.DS-02',
      title: 'Data Security — Data in Transit',
      description:
        'The confidentiality, integrity, and availability of data-in-transit are protected through encryption and secure protocols.',
      category: 'Protect',
      evidenceRequirements: [
        'TLS 1.2+ enforced for all connections',
        'Certificate management active',
        'Secure communication protocols used',
      ],
    },
    {
      id: 'PR.PS-01',
      title: 'Platform Security — Configuration Management',
      description:
        'Configuration management practices are established and applied to maintain the security of platforms and infrastructure.',
      category: 'Protect',
      evidenceRequirements: [
        'Configuration baselines established',
        'Configuration changes tracked',
        'Hardening standards applied',
      ],
    },
    {
      id: 'PR.PS-02',
      title: 'Platform Security — Software Maintenance',
      description:
        'Software is maintained, replaced, and removed with the associated risks managed, including timely patching of known vulnerabilities.',
      category: 'Protect',
      evidenceRequirements: [
        'Patch management process defined',
        'Vulnerability remediation SLAs enforced',
        'End-of-life software tracked',
      ],
    },
    {
      id: 'PR.PS-05',
      title: 'Platform Security — Installation and Execution Policies',
      description:
        'Installation and execution of unauthorized software are prevented through technical controls and policies.',
      category: 'Protect',
      evidenceRequirements: [
        'Software installation policies enforced',
        'Application allowlisting implemented',
        'Unauthorized software detected and blocked',
      ],
    },
    {
      id: 'PR.IR-01',
      title: 'Technology Infrastructure Resilience — Networks Protected',
      description:
        'Networks and environments are protected from unauthorized logical access and usage through segmentation, firewalls, and monitoring.',
      category: 'Protect',
      evidenceRequirements: [
        'Network segmentation implemented',
        'Firewall rules reviewed regularly',
        'WAF deployed for web applications',
      ],
    },

    // Detect (DE)
    {
      id: 'DE.CM-01',
      title: 'Continuous Monitoring — Network Monitoring',
      description:
        'Networks and network services are monitored to find potentially adverse events and indicators of compromise.',
      category: 'Detect',
      evidenceRequirements: [
        'Network monitoring tools deployed',
        'Anomaly detection active',
        'Monitoring alerts configured',
      ],
    },
    {
      id: 'DE.CM-06',
      title: 'Continuous Monitoring — External Service Provider Activity',
      description:
        'External service provider activities and services are monitored to find potentially adverse events.',
      category: 'Detect',
      evidenceRequirements: [
        'Third-party service monitoring active',
        'Integration health checks configured',
        'Vendor security posture tracked',
      ],
    },
    {
      id: 'DE.CM-09',
      title: 'Continuous Monitoring — Vulnerability Scanning',
      description:
        'Computing hardware, software, and services are assessed for vulnerabilities on a regular basis to identify and remediate known weaknesses.',
      category: 'Detect',
      evidenceRequirements: [
        'Regular vulnerability scanning scheduled',
        'Scan coverage includes all assets',
        'Scan results triaged and tracked',
      ],
    },
    {
      id: 'DE.AE-02',
      title: 'Adverse Event Analysis — Event Correlation',
      description:
        'Potentially adverse events are analyzed to better understand associated activities, including correlating events from multiple sources.',
      category: 'Detect',
      evidenceRequirements: [
        'Event correlation across sources',
        'Security event analysis performed',
        'Root cause analysis for significant events',
      ],
    },
    {
      id: 'DE.AE-06',
      title: 'Adverse Event Analysis — Incident Declaration',
      description:
        'Information on adverse events is provided to authorized staff and tools for incident declaration and response.',
      category: 'Detect',
      evidenceRequirements: [
        'Incident declaration criteria defined',
        'Alerting and escalation procedures',
        'Incident notification workflow active',
      ],
    },

    // Respond (RS)
    {
      id: 'RS.MA-01',
      title: 'Incident Management — Response Plan Executed',
      description:
        'The incident response plan is executed in coordination with relevant third parties once an incident is declared.',
      category: 'Respond',
      evidenceRequirements: [
        'Incident response plan documented',
        'Response team roles assigned',
        'Incident tracking and workflow active',
      ],
    },
    {
      id: 'RS.AN-03',
      title: 'Incident Analysis — Root Cause Determined',
      description:
        'Analysis is performed to determine the root cause of an incident and establish recovery actions.',
      category: 'Respond',
      evidenceRequirements: [
        'Root cause analysis procedures defined',
        'Incident investigation documented',
        'Remediation actions tracked via cases',
      ],
    },
    {
      id: 'RS.AN-06',
      title: 'Incident Analysis — Actions Documented',
      description:
        'Actions performed during an investigation are recorded and the integrity of the investigation is preserved.',
      category: 'Respond',
      evidenceRequirements: [
        'Investigation actions logged in audit trail',
        'Evidence preservation procedures defined',
        'Case comments and timeline maintained',
      ],
    },

    // Recover (RC)
    {
      id: 'RC.RP-01',
      title: 'Incident Recovery — Recovery Plan Executed',
      description:
        'The recovery portion of the incident response plan is executed once initiated from the incident response process.',
      category: 'Recover',
      evidenceRequirements: [
        'Recovery plan documented and tested',
        'Backup and restore procedures active',
        'Recovery time objectives defined',
      ],
    },
    {
      id: 'RC.RP-04',
      title: 'Incident Recovery — Public Updates Shared',
      description:
        'Public updates on incident recovery are shared using approved methods and messaging.',
      category: 'Recover',
      evidenceRequirements: [
        'Communications plan for incident recovery',
        'Stakeholder notification procedures',
        'Status update cadence defined',
      ],
    },
  ],
};

export function assessNISTCSF(input: ComplianceAssessmentInput): ComplianceEvidence[] {
  const evidences: ComplianceEvidence[] = [];
  const now = new Date().toISOString();

  const hasScanning = input.totalFindings > 0;
  const recentScan = input.lastScanDate
    ? (Date.now() - new Date(input.lastScanDate).getTime()) / (1000 * 60 * 60 * 24) < 30
    : false;
  const hasWorkflow = input.totalOpenCases > 0 || input.totalClosedCases > 0;

  // GV.OC-01 — Organizational Context
  evidences.push({
    controlId: 'GV.OC-01',
    status: 'partial',
    evidence:
      'Platform provides risk management capabilities aligned with organizational mission. Risk appetite and tolerance configuration require organizational policy documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // GV.OC-03 — Legal and Regulatory Requirements
  evidences.push({
    controlId: 'GV.OC-03',
    status: 'partial',
    evidence:
      'Platform maps findings to 10+ compliance frameworks (NIST 800-53, CMMC, SOC 2, GDPR, HIPAA, PCI DSS, etc.). Regulatory change management requires organizational process.',
    lastVerified: now,
    autoAssessed: true,
  });

  // GV.RM-01 — Risk Management Strategy
  {
    const hasRiskMgmt = hasScanning && input.hasSlaPolicies;
    evidences.push({
      controlId: 'GV.RM-01',
      status: hasRiskMgmt ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? 'Vulnerability risk assessment active with CVSS/EPSS scoring' : 'No risk assessment data available',
        input.hasSlaPolicies ? 'SLA policies enforce remediation timelines' : 'No SLA policies configured',
        'Formal risk management strategy requires organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // GV.RM-03 — Risk Appetite Determined
  evidences.push({
    controlId: 'GV.RM-03',
    status: input.hasRiskExceptions ? 'partial' : 'not_met',
    evidence: [
      input.hasRiskExceptions ? 'Risk exceptions documented with justifications' : 'No risk exceptions configured',
      'Formal risk appetite statement requires organizational documentation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // GV.SC-01 — Supply Chain Risk Management
  evidences.push({
    controlId: 'GV.SC-01',
    status: hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? 'Platform supports SBOM parsing (CycloneDX, SPDX) for dependency tracking' : 'No SBOM data ingested',
      'Supply chain risk management program requires organizational documentation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.AM-01 — Hardware Inventory
  evidences.push({
    controlId: 'ID.AM-01',
    status: hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? 'Asset inventory populated from scan data' : 'No asset inventory data',
      'Hardware asset discovery requires scanner integration or manual entry',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.AM-02 — Software Inventory
  evidences.push({
    controlId: 'ID.AM-02',
    status: hasScanning ? 'met' : 'not_met',
    evidence: [
      hasScanning
        ? `Software inventory tracked via scan findings. ${input.totalFindings} findings across managed assets`
        : 'No software inventory data from scans',
      'SBOM import supported for CycloneDX and SPDX formats',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.AM-07 — Data Inventory
  evidences.push({
    controlId: 'ID.AM-07',
    status: 'partial',
    evidence:
      'Platform manages vulnerability and compliance data with classification. Full data inventory and flow mapping require organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.RA-01 — Vulnerability Identification
  {
    const status = hasScanning && recentScan ? 'met' : hasScanning ? 'partial' : 'not_met';
    evidences.push({
      controlId: 'ID.RA-01',
      status,
      evidence: [
        hasScanning ? `${input.totalFindings} vulnerabilities identified and tracked` : 'No vulnerability scan data',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent scan activity',
        `${input.criticalOpenCount} critical and ${input.highOpenCount} high open findings`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // ID.RA-02 — Threat Intelligence
  evidences.push({
    controlId: 'ID.RA-02',
    status: hasScanning ? 'met' : 'not_met',
    evidence: [
      hasScanning
        ? 'Threat intelligence integrated: NVD enrichment, EPSS exploitation probability, CISA KEV catalog'
        : 'No threat intelligence data available',
      input.kevOpenCount > 0
        ? `${input.kevOpenCount} Known Exploited Vulnerabilities require immediate attention`
        : 'No open KEV findings',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.RA-03 — Threat Identification
  evidences.push({
    controlId: 'ID.RA-03',
    status: hasScanning ? 'partial' : 'not_met',
    evidence: [
      hasScanning ? 'Vulnerability data provides insight into attack surface' : 'No threat identification data',
      'Formal threat modeling and TTP analysis require organizational process',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.RA-05 — Risk Determination
  evidences.push({
    controlId: 'ID.RA-05',
    status: hasScanning ? 'met' : 'not_met',
    evidence: [
      hasScanning
        ? 'Risk scoring active: CVSS base scores, EPSS exploitation probability, KEV boost, environmental context factors'
        : 'No risk scoring data available',
      'AI-powered triage provides confidence-scored risk determinations',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // ID.RA-06 — Risk Response
  {
    const hasResponse = hasWorkflow || input.hasRiskExceptions;
    evidences.push({
      controlId: 'ID.RA-06',
      status: hasResponse ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? `Case workflow active: ${input.totalOpenCases} open, ${input.totalClosedCases} closed` : 'No remediation cases',
        input.hasRiskExceptions ? 'Risk exceptions documented for accepted risks' : 'No risk exception process',
        'POAM generation available for tracking risk responses',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // PR.AA-01 — Identity Management
  evidences.push({
    controlId: 'PR.AA-01',
    status: 'met',
    evidence:
      'Identity management active with OAuth providers (Google, GitHub), SSO (SAML/OIDC via WorkOS), MFA (TOTP + backup codes), and session management with revocation.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.AA-03 — Remote Access
  evidences.push({
    controlId: 'PR.AA-03',
    status: 'met',
    evidence:
      'Platform is cloud-native with TLS-encrypted access. Session management with timeout and revocation. IP allowlist supported for access restriction. Audit logs track all access.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.AA-05 — Least Privilege
  evidences.push({
    controlId: 'PR.AA-05',
    status: 'met',
    evidence:
      'RBAC enforced on all API routes with 10 roles and granular permissions. Org-scoped tenant isolation on all queries. Least privilege by default.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.DS-01 — Data at Rest
  evidences.push({
    controlId: 'PR.DS-01',
    status: 'met',
    evidence:
      'AES-256-GCM encryption at rest for secrets and sensitive data. KMS-backed key management. Cloud SQL encrypted storage.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.DS-02 — Data in Transit
  evidences.push({
    controlId: 'PR.DS-02',
    status: 'met',
    evidence:
      'TLS 1.3 enforced for all connections. HTTPS-only external redirects. Cloud Run terminates TLS at edge with managed certificates.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.PS-01 — Configuration Management
  evidences.push({
    controlId: 'PR.PS-01',
    status: 'partial',
    evidence:
      'Infrastructure as Code (Terraform) provides configuration baselines. Cloud Armor WAF deployed. Full configuration change tracking requires organizational process.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.PS-02 — Software Maintenance
  {
    const hasSla = input.hasSlaPolicies;
    evidences.push({
      controlId: 'PR.PS-02',
      status: hasScanning && hasSla ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? 'Vulnerability tracking active for software maintenance assessment' : 'No vulnerability data for patch tracking',
        hasSla
          ? `SLA-enforced remediation with ${input.slaComplianceRate}% compliance rate`
          : 'No SLA policies for patching timelines',
        `Average remediation: ${input.averageRemediationDays} days`,
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // PR.PS-05 — Installation and Execution Policies
  evidences.push({
    controlId: 'PR.PS-05',
    status: 'partial',
    evidence:
      'SBOM analysis identifies installed software components. Installation and execution policies require organizational enforcement through endpoint management tools.',
    lastVerified: now,
    autoAssessed: true,
  });

  // PR.IR-01 — Networks Protected
  evidences.push({
    controlId: 'PR.IR-01',
    status: 'met',
    evidence:
      'Cloud Armor WAF deployed. VPC Service Controls for network segmentation. IP allowlist for access restriction. Cloud Run provides isolated compute environments.',
    lastVerified: now,
    autoAssessed: true,
  });

  // DE.CM-01 — Network Monitoring
  evidences.push({
    controlId: 'DE.CM-01',
    status: 'partial',
    evidence: [
      'Cloud Logging and OpenTelemetry provide application-level monitoring',
      input.hasIntegrations ? 'SIEM integrations configured for event forwarding' : 'No SIEM integration for network event correlation',
      'Full network monitoring requires organizational infrastructure controls',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // DE.CM-06 — External Service Provider Activity
  evidences.push({
    controlId: 'DE.CM-06',
    status: input.hasIntegrations ? 'partial' : 'not_met',
    evidence: [
      input.hasIntegrations ? 'External integrations monitored via health checks and sync status' : 'No external service provider integrations configured',
      'Vendor security posture tracking requires organizational process',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // DE.CM-09 — Vulnerability Scanning
  {
    const scanFreqOk = input.scanFrequencyDays > 0 && input.scanFrequencyDays <= 30;
    evidences.push({
      controlId: 'DE.CM-09',
      status: hasScanning && recentScan && scanFreqOk ? 'met' : hasScanning ? 'partial' : 'not_met',
      evidence: [
        hasScanning ? `${input.totalFindings} findings from vulnerability scans` : 'No vulnerability scanning data',
        recentScan ? `Last scan: ${input.lastScanDate}` : 'No recent scan activity',
        scanFreqOk ? `Scan frequency: every ${input.scanFrequencyDays} days` : 'Scan frequency does not meet 30-day threshold',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // DE.AE-02 — Event Correlation
  evidences.push({
    controlId: 'DE.AE-02',
    status: input.hasIntegrations ? 'partial' : 'not_met',
    evidence: [
      'AI-powered triage correlates vulnerability data across NVD, EPSS, and KEV sources',
      input.hasIntegrations ? 'Integrations enable cross-source event correlation' : 'No integrations for event correlation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // DE.AE-06 — Incident Declaration
  evidences.push({
    controlId: 'DE.AE-06',
    status: hasWorkflow ? 'partial' : 'not_met',
    evidence: [
      hasWorkflow ? 'Case workflow provides incident tracking and escalation' : 'No incident workflow configured',
      'Formal incident declaration criteria and notification procedures require organizational documentation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // RS.MA-01 — Incident Management
  {
    const hasActive = hasWorkflow && input.hasSlaPolicies;
    evidences.push({
      controlId: 'RS.MA-01',
      status: hasActive ? 'partial' : hasWorkflow ? 'partial' : 'not_met',
      evidence: [
        hasWorkflow ? `Case management active: ${input.totalOpenCases} open, ${input.totalClosedCases} resolved` : 'No incident cases tracked',
        input.hasSlaPolicies ? 'SLA policies enforce response timelines' : 'No SLA policies for incident response',
        'Formal incident response plan requires organizational documentation',
      ].join('. '),
      lastVerified: now,
      autoAssessed: true,
    });
  }

  // RS.AN-03 — Root Cause Determined
  evidences.push({
    controlId: 'RS.AN-03',
    status: hasWorkflow ? 'partial' : 'not_met',
    evidence: [
      hasWorkflow ? 'AI-powered triage provides root cause analysis with CVE correlation and remediation guidance' : 'No incident analysis workflow',
      `Average remediation: ${input.averageRemediationDays} days`,
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // RS.AN-06 — Actions Documented
  evidences.push({
    controlId: 'RS.AN-06',
    status: input.hasAuditLogs ? 'met' : 'not_met',
    evidence: [
      input.hasAuditLogs ? 'Audit trail with tamper-evident hash chain records all investigation actions' : 'No audit logging configured',
      'Case comments and timeline provide investigation documentation',
    ].join('. '),
    lastVerified: now,
    autoAssessed: true,
  });

  // RC.RP-01 — Recovery Plan Executed
  evidences.push({
    controlId: 'RC.RP-01',
    status: 'partial',
    evidence:
      'Platform supports backup and restore with configurable retention policies. Recovery time objectives and formal recovery plan testing require organizational process.',
    lastVerified: now,
    autoAssessed: true,
  });

  // RC.RP-04 — Public Updates Shared
  evidences.push({
    controlId: 'RC.RP-04',
    status: 'partial',
    evidence:
      'Notification system supports stakeholder communications. Formal incident recovery communications plan requires organizational documentation.',
    lastVerified: now,
    autoAssessed: true,
  });

  return evidences;
}
