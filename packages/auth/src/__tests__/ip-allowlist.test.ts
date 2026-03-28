import { describe, it, expect } from 'vitest';
import { checkIpAllowlist, validateIpEntry } from '../security/ip-allowlist';

describe('IP Allowlist - checkIpAllowlist', () => {
  it('empty allowlist allows all IPs', () => {
    expect(checkIpAllowlist('192.168.1.1', [])).toBe(true);
    expect(checkIpAllowlist('10.0.0.1', [])).toBe(true);
  });

  it('exact IP match', () => {
    expect(checkIpAllowlist('10.0.0.1', ['10.0.0.1'])).toBe(true);
    expect(checkIpAllowlist('10.0.0.2', ['10.0.0.1'])).toBe(false);
  });

  it('CIDR /8 match', () => {
    expect(checkIpAllowlist('10.1.2.3', ['10.0.0.0/8'])).toBe(true);
    expect(checkIpAllowlist('10.255.255.255', ['10.0.0.0/8'])).toBe(true);
    expect(checkIpAllowlist('11.0.0.1', ['10.0.0.0/8'])).toBe(false);
  });

  it('CIDR /16 match', () => {
    expect(checkIpAllowlist('192.168.1.100', ['192.168.0.0/16'])).toBe(true);
    expect(checkIpAllowlist('192.169.0.1', ['192.168.0.0/16'])).toBe(false);
  });

  it('CIDR /24 match', () => {
    expect(checkIpAllowlist('192.168.1.100', ['192.168.1.0/24'])).toBe(true);
    expect(checkIpAllowlist('192.168.1.255', ['192.168.1.0/24'])).toBe(true);
    expect(checkIpAllowlist('192.168.2.1', ['192.168.1.0/24'])).toBe(false);
  });

  it('CIDR /32 is exact match', () => {
    expect(checkIpAllowlist('10.0.0.1', ['10.0.0.1/32'])).toBe(true);
    expect(checkIpAllowlist('10.0.0.2', ['10.0.0.1/32'])).toBe(false);
  });

  it('CIDR /0 matches everything', () => {
    expect(checkIpAllowlist('1.2.3.4', ['0.0.0.0/0'])).toBe(true);
    expect(checkIpAllowlist('255.255.255.255', ['0.0.0.0/0'])).toBe(true);
  });

  it('multiple entries — match any', () => {
    const list = ['10.0.0.0/8', '192.168.1.0/24', '203.0.113.5'];
    expect(checkIpAllowlist('10.5.5.5', list)).toBe(true);
    expect(checkIpAllowlist('192.168.1.50', list)).toBe(true);
    expect(checkIpAllowlist('203.0.113.5', list)).toBe(true);
    expect(checkIpAllowlist('8.8.8.8', list)).toBe(false);
  });

  it('IPv4-mapped IPv6 normalized', () => {
    expect(checkIpAllowlist('::ffff:10.0.0.1', ['10.0.0.1'])).toBe(true);
    expect(checkIpAllowlist('::ffff:10.0.0.1', ['10.0.0.0/8'])).toBe(true);
  });

  it('whitespace in entries is trimmed', () => {
    expect(checkIpAllowlist('10.0.0.1', [' 10.0.0.1 '])).toBe(true);
    expect(checkIpAllowlist('10.0.0.1', [' 10.0.0.0/8 '])).toBe(true);
  });

  it('empty string entries are skipped', () => {
    expect(checkIpAllowlist('10.0.0.1', ['', '10.0.0.1'])).toBe(true);
  });
});

describe('IP Allowlist - validateIpEntry', () => {
  it('valid IP returns null', () => {
    expect(validateIpEntry('10.0.0.1')).toBeNull();
    expect(validateIpEntry('192.168.1.0')).toBeNull();
  });

  it('valid CIDR returns null', () => {
    expect(validateIpEntry('10.0.0.0/8')).toBeNull();
    expect(validateIpEntry('192.168.1.0/24')).toBeNull();
    expect(validateIpEntry('0.0.0.0/0')).toBeNull();
  });

  it('invalid IP returns error', () => {
    expect(validateIpEntry('not-an-ip')).toBeTruthy();
    expect(validateIpEntry('256.0.0.1')).toBeTruthy();
    expect(validateIpEntry('10.0.0')).toBeTruthy();
  });

  it('invalid CIDR returns error', () => {
    expect(validateIpEntry('10.0.0.0/33')).toBeTruthy();
    expect(validateIpEntry('10.0.0.0/-1')).toBeTruthy();
    expect(validateIpEntry('not-valid/8')).toBeTruthy();
  });

  it('empty string returns error', () => {
    expect(validateIpEntry('')).toBeTruthy();
    expect(validateIpEntry('  ')).toBeTruthy();
  });
});
