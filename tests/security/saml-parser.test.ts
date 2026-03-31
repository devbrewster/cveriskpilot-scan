import { describe, it, expect } from 'vitest';
import { parseSAMLResponse, extractSAMLProfile, generateSPMetadata } from '@cveriskpilot/auth';

// Minimal SAML response for testing (unsigned — signature validation disabled)
function createTestSAMLResponse(overrides?: {
  issuer?: string;
  nameId?: string;
  audience?: string;
  notBefore?: string;
  notOnOrAfter?: string;
  attributes?: Record<string, string>;
}): string {
  const now = new Date();
  const notBefore = overrides?.notBefore ?? new Date(now.getTime() - 60000).toISOString();
  const notOnOrAfter = overrides?.notOnOrAfter ?? new Date(now.getTime() + 300000).toISOString();
  const issuer = overrides?.issuer ?? 'https://idp.example.com';
  const nameId = overrides?.nameId ?? 'user@example.com';
  const audience = overrides?.audience ?? 'https://cveriskpilot.com/api/auth/saml/metadata';

  const attributeStatements = overrides?.attributes
    ? Object.entries(overrides.attributes)
        .map(([name, value]) => `
          <saml:Attribute Name="${name}">
            <saml:AttributeValue>${value}</saml:AttributeValue>
          </saml:Attribute>`)
        .join('')
    : `
          <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress">
            <saml:AttributeValue>${nameId}</saml:AttributeValue>
          </saml:Attribute>
          <saml:Attribute Name="http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name">
            <saml:AttributeValue>Test User</saml:AttributeValue>
          </saml:Attribute>
          <saml:Attribute Name="http://schemas.xmlsoap.org/claims/Group">
            <saml:AttributeValue>admin</saml:AttributeValue>
          </saml:Attribute>`;

  const xml = `
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol"
                xmlns:saml="urn:oasis:names:tc:SAML:2.0:assertion"
                ID="_response_123"
                Version="2.0"
                IssueInstant="${now.toISOString()}"
                Destination="https://cveriskpilot.com/api/auth/saml/acs">
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Success"/>
  </samlp:Status>
  <saml:Assertion ID="_assertion_456" Version="2.0" IssueInstant="${now.toISOString()}">
    <saml:Issuer>${issuer}</saml:Issuer>
    <saml:Subject>
      <saml:NameID Format="urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress">${nameId}</saml:NameID>
    </saml:Subject>
    <saml:Conditions NotBefore="${notBefore}" NotOnOrAfter="${notOnOrAfter}">
      <saml:AudienceRestriction>
        <saml:Audience>${audience}</saml:Audience>
      </saml:AudienceRestriction>
    </saml:Conditions>
    <saml:AuthnStatement SessionIndex="_session_789">
      <saml:AuthnContext>
        <saml:AuthnContextClassRef>urn:oasis:names:tc:SAML:2.0:ac:classes:PasswordProtectedTransport</saml:AuthnContextClassRef>
      </saml:AuthnContext>
    </saml:AuthnStatement>
    <saml:AttributeStatement>${attributeStatements}
    </saml:AttributeStatement>
  </saml:Assertion>
</samlp:Response>`;

  return Buffer.from(xml).toString('base64');
}

describe('SAML Parser', () => {
  describe('parseSAMLResponse', () => {
    it('parses a valid SAML response', async () => {
      const response = createTestSAMLResponse();
      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
      });

      expect(result.valid).toBe(true);
      expect(result.assertion).toBeDefined();
      expect(result.assertion!.issuer).toBe('https://idp.example.com');
      expect(result.assertion!.nameId).toBe('user@example.com');
      expect(result.assertion!.sessionIndex).toBe('_session_789');
    });

    it('extracts attributes from assertion', async () => {
      const response = createTestSAMLResponse();
      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
      });

      expect(result.valid).toBe(true);
      const attrs = result.assertion!.attributes;
      expect(attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress']).toBe('user@example.com');
      expect(attrs['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name']).toBe('Test User');
    });

    it('validates timing — rejects expired assertion', async () => {
      const expired = createTestSAMLResponse({
        notOnOrAfter: new Date(Date.now() - 600000).toISOString(), // 10 min ago
      });

      const result = await parseSAMLResponse(expired, {
        idpCertificate: '',
        validateSignature: false,
        clockSkewSeconds: 60,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('expired');
    });

    it('validates timing — rejects not-yet-valid assertion', async () => {
      const future = createTestSAMLResponse({
        notBefore: new Date(Date.now() + 600000).toISOString(), // 10 min from now
      });

      const result = await parseSAMLResponse(future, {
        idpCertificate: '',
        validateSignature: false,
        clockSkewSeconds: 60,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('not yet valid');
    });

    it('validates audience restriction', async () => {
      const response = createTestSAMLResponse({
        audience: 'https://wrong-audience.com',
      });

      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
        expectedAudience: 'https://cveriskpilot.com/api/auth/saml/metadata',
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('Audience mismatch');
    });

    it('accepts matching audience', async () => {
      const response = createTestSAMLResponse({
        audience: 'https://cveriskpilot.com/api/auth/saml/metadata',
      });

      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
        expectedAudience: 'https://cveriskpilot.com/api/auth/saml/metadata',
      });

      expect(result.valid).toBe(true);
    });

    it('rejects non-success status', async () => {
      const xml = `
<samlp:Response xmlns:samlp="urn:oasis:names:tc:SAML:2.0:protocol">
  <samlp:Status>
    <samlp:StatusCode Value="urn:oasis:names:tc:SAML:2.0:status:Requester"/>
  </samlp:Status>
</samlp:Response>`;
      const encoded = Buffer.from(xml).toString('base64');

      const result = await parseSAMLResponse(encoded, {
        idpCertificate: '',
        validateSignature: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('status');
    });

    it('rejects invalid base64', async () => {
      const result = await parseSAMLResponse('not-valid-base64!!!', {
        idpCertificate: '',
        validateSignature: false,
      });

      expect(result.valid).toBe(false);
      expect(result.error).toContain('parsing error');
    });

    it('respects clock skew tolerance', async () => {
      // Assertion expired 1 minute ago, but we allow 2 minutes of skew
      const slightlyExpired = createTestSAMLResponse({
        notOnOrAfter: new Date(Date.now() - 60000).toISOString(),
      });

      const result = await parseSAMLResponse(slightlyExpired, {
        idpCertificate: '',
        validateSignature: false,
        clockSkewSeconds: 120,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('extractSAMLProfile', () => {
    it('extracts email from standard OIDC claim names', async () => {
      const response = createTestSAMLResponse();
      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
      });

      const profile = extractSAMLProfile(result.assertion!);
      expect(profile.email).toBe('user@example.com');
      expect(profile.name).toBe('Test User');
      expect(profile.groups).toContain('admin');
    });

    it('falls back to NameID for email if attributes missing', async () => {
      const response = createTestSAMLResponse({
        nameId: 'fallback@example.com',
        attributes: { 'displayName': 'Fallback User' },
      });

      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
      });

      const profile = extractSAMLProfile(result.assertion!);
      expect(profile.email).toBe('fallback@example.com');
    });

    it('constructs name from first + last if display name missing', async () => {
      const response = createTestSAMLResponse({
        attributes: {
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname': 'John',
          'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname': 'Doe',
        },
      });

      const result = await parseSAMLResponse(response, {
        idpCertificate: '',
        validateSignature: false,
      });

      const profile = extractSAMLProfile(result.assertion!);
      expect(profile.name).toBe('John Doe');
    });
  });

  describe('generateSPMetadata', () => {
    it('generates valid SP metadata XML', () => {
      const metadata = generateSPMetadata({
        entityId: 'https://cveriskpilot.com/api/auth/saml/metadata',
        acsUrl: 'https://cveriskpilot.com/api/auth/saml/acs',
      });

      expect(metadata).toContain('EntityDescriptor');
      expect(metadata).toContain('SPSSODescriptor');
      expect(metadata).toContain('AssertionConsumerService');
      expect(metadata).toContain('https://cveriskpilot.com/api/auth/saml/acs');
      expect(metadata).toContain('CVERiskPilot');
    });

    it('includes SLO endpoint when provided', () => {
      const metadata = generateSPMetadata({
        entityId: 'https://cveriskpilot.com/api/auth/saml/metadata',
        acsUrl: 'https://cveriskpilot.com/api/auth/saml/acs',
        sloUrl: 'https://cveriskpilot.com/api/auth/logout',
      });

      expect(metadata).toContain('SingleLogoutService');
      expect(metadata).toContain('https://cveriskpilot.com/api/auth/logout');
    });

    it('omits SLO when not provided', () => {
      const metadata = generateSPMetadata({
        entityId: 'https://cveriskpilot.com/api/auth/saml/metadata',
        acsUrl: 'https://cveriskpilot.com/api/auth/saml/acs',
      });

      expect(metadata).not.toContain('SingleLogoutService');
    });

    it('escapes XML special characters in URLs', () => {
      const metadata = generateSPMetadata({
        entityId: 'https://cveriskpilot.com/api/auth/saml/metadata?foo=1&bar=2',
        acsUrl: 'https://cveriskpilot.com/api/auth/saml/acs',
      });

      expect(metadata).toContain('&amp;');
      expect(metadata).not.toContain('&bar');
    });
  });
});
