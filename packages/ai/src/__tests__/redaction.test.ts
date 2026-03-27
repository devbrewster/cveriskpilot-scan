import { describe, it, expect } from 'vitest';
import {
  buildRedactionMap,
  applyRedaction,
  reverseRedaction,
  redactSensitiveData,
} from '../redaction';

describe('buildRedactionMap', () => {
  it('redacts IPv4 addresses with consistent numbering', () => {
    const map = buildRedactionMap('Server at 192.168.1.100 and 10.0.0.1 are affected');
    expect(map.get('192.168.1.100')).toBe('[REDACTED-IP-1]');
    expect(map.get('10.0.0.1')).toBe('[REDACTED-IP-2]');
  });

  it('assigns same placeholder for duplicate IPs', () => {
    const map = buildRedactionMap('192.168.1.1 was scanned. 192.168.1.1 is vulnerable.');
    expect(map.get('192.168.1.1')).toBe('[REDACTED-IP-1]');
    expect(map.size).toBeGreaterThanOrEqual(1);
  });

  it('redacts FQDNs', () => {
    const map = buildRedactionMap('Found on prod-db.internal.acme.com');
    const values = [...map.values()];
    expect(values.some((v) => v.startsWith('[REDACTED-HOST-'))).toBe(true);
  });

  it('redacts URLs', () => {
    const map = buildRedactionMap('Endpoint: https://api.internal.corp.example.com/v1/users');
    const values = [...map.values()];
    expect(values.some((v) => v.startsWith('[REDACTED-URL-'))).toBe(true);
  });

  it('redacts AWS account IDs (12 digits)', () => {
    const map = buildRedactionMap('Account 123456789012 is affected');
    expect(map.get('123456789012')).toBe('[REDACTED-AWS-ACCOUNT-1]');
  });

  it('redacts API keys and tokens', () => {
    const map = buildRedactionMap('Using key sk_live_abc123def456ghi');
    const values = [...map.values()];
    expect(values).toContain('[REDACTED-SECRET]');
  });

  it('redacts GitHub personal access tokens', () => {
    const map = buildRedactionMap('Token ghp_abcdefghijklmnopqrstuvwxyz1234567890');
    const values = [...map.values()];
    expect(values).toContain('[REDACTED-SECRET]');
  });

  it('preserves CVE IDs', () => {
    const map = buildRedactionMap('CVE-2024-1234 affects 192.168.1.1');
    expect(map.has('CVE-2024-1234')).toBe(false);
    expect(map.has('192.168.1.1')).toBe(true);
  });

  it('preserves CWE IDs', () => {
    const map = buildRedactionMap('CWE-79 on host 10.0.0.5');
    expect(map.has('CWE-79')).toBe(false);
    expect(map.has('10.0.0.5')).toBe(true);
  });

  it('redacts Unix file path usernames', () => {
    const map = buildRedactionMap('Path: /home/jsmith/.ssh/id_rsa');
    expect(map.get('jsmith')).toBe('[REDACTED-USER-1]');
  });

  it('redacts Windows file path usernames', () => {
    const map = buildRedactionMap('Path: C:\\Users\\admin_user\\Documents');
    expect(map.get('admin_user')).toBe('[REDACTED-USER-1]');
  });
});

describe('applyRedaction', () => {
  it('replaces all occurrences of mapped values', () => {
    const map = new Map([['192.168.1.1', '[REDACTED-IP-1]']]);
    const result = applyRedaction('Server 192.168.1.1 reached 192.168.1.1', map);
    expect(result).toBe('Server [REDACTED-IP-1] reached [REDACTED-IP-1]');
  });

  it('returns original text when map is empty', () => {
    const result = applyRedaction('no secrets here', new Map());
    expect(result).toBe('no secrets here');
  });

  it('replaces longer matches first to avoid partial replacement', () => {
    const map = new Map<string, string>([
      ['10.0.0.1', '[REDACTED-IP-1]'],
      ['https://10.0.0.1/api', '[REDACTED-URL-1]'],
    ]);
    const result = applyRedaction('Visit https://10.0.0.1/api now', map);
    expect(result).toBe('Visit [REDACTED-URL-1] now');
  });
});

describe('reverseRedaction', () => {
  it('restores original values from placeholders', () => {
    const map = new Map([
      ['192.168.1.1', '[REDACTED-IP-1]'],
      ['db.acme.com', '[REDACTED-HOST-1]'],
    ]);
    const redacted = 'Server [REDACTED-IP-1] at [REDACTED-HOST-1]';
    const restored = reverseRedaction(redacted, map);
    expect(restored).toBe('Server 192.168.1.1 at db.acme.com');
  });

  it('returns original text when map is empty', () => {
    const result = reverseRedaction('hello', new Map());
    expect(result).toBe('hello');
  });
});

describe('redactSensitiveData', () => {
  it('redacts title, description, observations, and asset names consistently', () => {
    const result = redactSensitiveData({
      title: 'Vuln on 192.168.1.1',
      description: 'Server 192.168.1.1 has CVE-2024-1234',
      observations: [{ host: '192.168.1.1', port: 443 }],
      assetNames: ['prod-db.acme.com'],
    });

    expect(result.title).toContain('[REDACTED-IP-');
    expect(result.title).not.toContain('192.168.1.1');
    expect(result.description).toContain('CVE-2024-1234');
    expect(result.description).not.toContain('192.168.1.1');
    expect(result.observations?.[0]).not.toContain('192.168.1.1');

    // Same IP gets same placeholder across all fields
    const ipPlaceholder = result.redactionMap.get('192.168.1.1');
    expect(ipPlaceholder).toBeDefined();
    expect(result.title).toContain(ipPlaceholder);
    expect(result.description).toContain(ipPlaceholder);
  });

  it('handles undefined optional fields', () => {
    const result = redactSensitiveData({ title: 'Simple title' });
    expect(result.title).toBe('Simple title');
    expect(result.description).toBeUndefined();
    expect(result.observations).toBeUndefined();
    expect(result.assetNames).toBeUndefined();
  });
});
