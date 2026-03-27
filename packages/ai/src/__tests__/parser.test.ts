import { describe, it, expect } from 'vitest';
import { parseRemediationResponse } from '../parser';

const VALID_JSON = JSON.stringify({
  riskAssessment: 'This is a critical RCE vulnerability.',
  immediateActions: ['Block port 8080', 'Disable affected service'],
  permanentFix: {
    description: 'Upgrade to version 2.0.1',
    codeExample: 'npm install package@2.0.1',
    configChange: 'Set allowRemote=false',
  },
  verificationSteps: ['Run vulnerability scan', 'Check service version'],
  references: ['https://nvd.nist.gov/vuln/detail/CVE-2024-1234'],
  estimatedEffort: 'low',
  priority: 'immediate',
});

describe('parseRemediationResponse', () => {
  it('parses valid JSON response', () => {
    const result = parseRemediationResponse(VALID_JSON, 'claude-sonnet-4-20250514');

    expect(result.riskAssessment).toBe('This is a critical RCE vulnerability.');
    expect(result.immediateActions).toHaveLength(2);
    expect(result.immediateActions[0]).toBe('Block port 8080');
    expect(result.permanentFix.description).toBe('Upgrade to version 2.0.1');
    expect(result.permanentFix.codeExample).toBe('npm install package@2.0.1');
    expect(result.permanentFix.configChange).toBe('Set allowRemote=false');
    expect(result.verificationSteps).toHaveLength(2);
    expect(result.references).toHaveLength(1);
    expect(result.estimatedEffort).toBe('low');
    expect(result.priority).toBe('immediate');
    expect(result.model).toBe('claude-sonnet-4-20250514');
    expect(result.raw).toBe(VALID_JSON);
    expect(result.generatedAt).toBeInstanceOf(Date);
  });

  it('parses JSON wrapped in markdown code fences', () => {
    const wrapped = '```json\n' + VALID_JSON + '\n```';
    const result = parseRemediationResponse(wrapped);

    expect(result.riskAssessment).toBe('This is a critical RCE vulnerability.');
    expect(result.immediateActions).toHaveLength(2);
  });

  it('parses JSON wrapped in plain code fences', () => {
    const wrapped = '```\n' + VALID_JSON + '\n```';
    const result = parseRemediationResponse(wrapped);

    expect(result.riskAssessment).toBe('This is a critical RCE vulnerability.');
  });

  it('handles JSON with extra text around it', () => {
    const withText = 'Here is my analysis:\n' + VALID_JSON + '\nHope this helps!';
    const result = parseRemediationResponse(withText);

    expect(result.riskAssessment).toBe('This is a critical RCE vulnerability.');
  });

  it('falls back when riskAssessment is missing', () => {
    const incomplete = JSON.stringify({ immediateActions: ['do something'] });
    const result = parseRemediationResponse(incomplete);

    // Should fall back — raw text in riskAssessment
    expect(result.riskAssessment).toBe(incomplete);
    expect(result.immediateActions).toEqual([]);
    expect(result.permanentFix.description).toBe('See risk assessment above for details.');
  });

  it('falls back when permanentFix is missing', () => {
    const noFix = JSON.stringify({
      riskAssessment: 'Bad vuln',
      immediateActions: ['block it'],
    });
    const result = parseRemediationResponse(noFix);

    // Should fall back
    expect(result.riskAssessment).toBe(noFix);
    expect(result.immediateActions).toEqual([]);
  });

  it('falls back on completely invalid response', () => {
    const garbage = 'I cannot help with that request.';
    const result = parseRemediationResponse(garbage, 'claude-sonnet-4-20250514');

    expect(result.riskAssessment).toBe(garbage);
    expect(result.immediateActions).toEqual([]);
    expect(result.permanentFix.description).toBe('See risk assessment above for details.');
    expect(result.estimatedEffort).toBe('medium');
    expect(result.priority).toBe('short-term');
    expect(result.raw).toBe(garbage);
    expect(result.model).toBe('claude-sonnet-4-20250514');
  });

  it('defaults invalid estimatedEffort to medium', () => {
    const badEffort = JSON.stringify({
      riskAssessment: 'test',
      immediateActions: ['a'],
      permanentFix: { description: 'fix' },
      verificationSteps: [],
      references: [],
      estimatedEffort: 'extreme',
      priority: 'immediate',
    });
    const result = parseRemediationResponse(badEffort);
    expect(result.estimatedEffort).toBe('medium');
  });

  it('defaults invalid priority to short-term', () => {
    const badPriority = JSON.stringify({
      riskAssessment: 'test',
      immediateActions: ['a'],
      permanentFix: { description: 'fix' },
      verificationSteps: [],
      references: [],
      estimatedEffort: 'low',
      priority: 'urgent',
    });
    const result = parseRemediationResponse(badPriority);
    expect(result.priority).toBe('short-term');
  });

  it('handles optional permanentFix fields being absent', () => {
    const minimalFix = JSON.stringify({
      riskAssessment: 'test',
      immediateActions: ['a'],
      permanentFix: { description: 'upgrade' },
      verificationSteps: [],
      references: [],
      estimatedEffort: 'low',
      priority: 'immediate',
    });
    const result = parseRemediationResponse(minimalFix);
    expect(result.permanentFix.codeExample).toBeUndefined();
    expect(result.permanentFix.configChange).toBeUndefined();
  });
});
