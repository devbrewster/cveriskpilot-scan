/**
 * SAML 2.0 Assertion Parser & Validator
 *
 * Parses SAML responses, verifies XML signatures against IdP certificates,
 * validates timing conditions, and extracts user attributes.
 *
 * Security: Signature verification uses Node's native crypto module.
 * XML parsing uses xml2js (no eval, no external entity expansion).
 */

import crypto from 'node:crypto';
import { parseStringPromise, processors } from 'xml2js';

const stripPrefix = processors.stripPrefix;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SAMLAssertion {
  issuer: string;
  nameId: string;
  nameIdFormat?: string;
  sessionIndex?: string;
  attributes: Record<string, string | string[]>;
  conditions?: {
    notBefore?: string;
    notOnOrAfter?: string;
    audience?: string;
  };
  authnContext?: string;
}

export interface SAMLValidationOptions {
  /** PEM-encoded IdP signing certificate */
  idpCertificate: string;
  /** Expected audience (our SP entity ID) */
  expectedAudience?: string;
  /** Clock skew tolerance in seconds (default: 120) */
  clockSkewSeconds?: number;
  /** Whether to enforce signature validation (default: true) */
  validateSignature?: boolean;
}

export interface SAMLValidationResult {
  valid: boolean;
  assertion?: SAMLAssertion;
  error?: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SAML_NS = 'urn:oasis:names:tc:SAML:2.0:assertion';
const SAMLP_NS = 'urn:oasis:names:tc:SAML:2.0:protocol';
const DSIG_NS = 'http://www.w3.org/2000/09/xmldsig#';

// Default clock skew tolerance (2 minutes)
const DEFAULT_CLOCK_SKEW_SECONDS = 120;

// ---------------------------------------------------------------------------
// Main parser
// ---------------------------------------------------------------------------

/**
 * Decode and parse a SAML response from Base64-encoded form POST body.
 */
export async function parseSAMLResponse(
  samlResponseBase64: string,
  options: SAMLValidationOptions,
): Promise<SAMLValidationResult> {
  try {
    // 1. Base64 decode
    const xml = Buffer.from(samlResponseBase64, 'base64').toString('utf-8');

    // 2. Parse XML (xml2js with strict options — no external entities)
    const parsed = await parseStringPromise(xml, {
      tagNameProcessors: [stripPrefix],
      explicitArray: true,
      strict: true,
    });

    // 3. Extract the root Response element
    const responseKey = findKey(parsed, 'Response');
    if (!responseKey) {
      return { valid: false, error: 'No SAML Response element found' };
    }
    const response = parsed[responseKey];

    // 4. Check response status
    const statusKey = findNestedKey(response, 'Status');
    if (statusKey) {
      const statusEl = response[statusKey]?.[0];
      const statusCodeKey = findNestedKey(statusEl, 'StatusCode');
      if (statusCodeKey) {
        const statusCodeEl = statusEl[statusCodeKey]?.[0];
        const statusCode: string = statusCodeEl?.$?.Value ?? '';
        if (!statusCode.includes('Success')) {
          return { valid: false, error: `SAML response status: ${statusCode}` };
        }
      }
    }

    // 5. Validate signature if certificate provided and validation enabled
    if (options.validateSignature !== false && options.idpCertificate) {
      const signatureValid = verifyXMLSignature(xml, options.idpCertificate);
      if (!signatureValid) {
        return { valid: false, error: 'SAML response signature verification failed' };
      }
    }

    // 6. Extract assertion
    const assertionKey = findNestedKey(response, 'Assertion');
    if (!assertionKey) {
      return { valid: false, error: 'No Assertion element found in SAML response' };
    }
    const assertionEl = response[assertionKey]?.[0];
    if (!assertionEl) {
      return { valid: false, error: 'Empty Assertion element' };
    }

    // 7. Extract issuer
    const issuerKey = findNestedKey(assertionEl, 'Issuer');
    const issuer = extractTextValue(assertionEl, issuerKey);
    if (!issuer) {
      return { valid: false, error: 'No Issuer found in assertion' };
    }

    // 8. Extract Subject / NameID
    const subjectKey = findNestedKey(assertionEl, 'Subject');
    const subjectEl = assertionEl[subjectKey!]?.[0];
    const nameIdKey = subjectEl ? findNestedKey(subjectEl, 'NameID') : null;
    const nameId = subjectEl && nameIdKey ? extractTextValue(subjectEl, nameIdKey) : null;
    if (!nameId) {
      return { valid: false, error: 'No NameID found in assertion Subject' };
    }

    const nameIdFormat = subjectEl?.[nameIdKey!]?.[0]?.$?.Format ?? undefined;

    // 9. Extract Conditions and validate timing
    const conditionsKey = findNestedKey(assertionEl, 'Conditions');
    const conditionsEl = assertionEl[conditionsKey!]?.[0];
    let conditions: SAMLAssertion['conditions'];

    if (conditionsEl) {
      const notBefore = conditionsEl.$?.NotBefore;
      const notOnOrAfter = conditionsEl.$?.NotOnOrAfter;

      // Extract audience
      const audienceKey = findNestedKey(conditionsEl, 'AudienceRestriction');
      const audienceEl = conditionsEl[audienceKey!]?.[0];
      const audienceValueKey = audienceEl ? findNestedKey(audienceEl, 'Audience') : null;
      const audience = audienceEl && audienceValueKey ? extractTextValue(audienceEl, audienceValueKey) : undefined;

      conditions = { notBefore, notOnOrAfter, audience: audience ?? undefined };

      // Validate timing
      const clockSkew = (options.clockSkewSeconds ?? DEFAULT_CLOCK_SKEW_SECONDS) * 1000;
      const now = Date.now();

      if (notBefore) {
        const notBeforeMs = new Date(notBefore).getTime();
        if (now < notBeforeMs - clockSkew) {
          return { valid: false, error: `Assertion not yet valid (NotBefore: ${notBefore})` };
        }
      }

      if (notOnOrAfter) {
        const notOnOrAfterMs = new Date(notOnOrAfter).getTime();
        if (now > notOnOrAfterMs + clockSkew) {
          return { valid: false, error: `Assertion has expired (NotOnOrAfter: ${notOnOrAfter})` };
        }
      }

      // Validate audience
      if (options.expectedAudience && audience && audience !== options.expectedAudience) {
        return {
          valid: false,
          error: `Audience mismatch: expected ${options.expectedAudience}, got ${audience}`,
        };
      }
    }

    // 10. Extract SessionIndex from AuthnStatement
    const authnStatementKey = findNestedKey(assertionEl, 'AuthnStatement');
    const authnStatement = assertionEl[authnStatementKey!]?.[0];
    const sessionIndex = authnStatement?.$?.SessionIndex ?? undefined;

    // Extract AuthnContext
    const authnContextKey = authnStatement ? findNestedKey(authnStatement, 'AuthnContext') : null;
    const authnContextEl = authnStatement?.[authnContextKey!]?.[0];
    const authnContextRefKey = authnContextEl ? findNestedKey(authnContextEl, 'AuthnContextClassRef') : null;
    const authnContext = authnContextEl && authnContextRefKey
      ? extractTextValue(authnContextEl, authnContextRefKey)
      : undefined;

    // 11. Extract AttributeStatement attributes
    const attributes: Record<string, string | string[]> = {};
    const attrStatementKey = findNestedKey(assertionEl, 'AttributeStatement');
    const attrStatement = assertionEl[attrStatementKey!]?.[0];

    if (attrStatement) {
      const attrKey = findNestedKey(attrStatement, 'Attribute');
      const attrElements = attrStatement[attrKey!] ?? [];

      for (const attr of attrElements) {
        const name = attr.$?.Name ?? attr.$?.FriendlyName;
        if (!name) continue;

        const valueKey = findNestedKey(attr, 'AttributeValue');
        const values = attr[valueKey!] ?? [];
        const stringValues = values.map((v: unknown) => {
          if (typeof v === 'string') return v;
          if (typeof v === 'object' && v !== null && '_' in v) return (v as { _: string })._;
          return String(v);
        });

        attributes[name] = stringValues.length === 1 ? stringValues[0] : stringValues;
      }
    }

    const assertion: SAMLAssertion = {
      issuer,
      nameId,
      nameIdFormat,
      sessionIndex,
      attributes,
      conditions,
      authnContext: authnContext ?? undefined,
    };

    return { valid: true, assertion };
  } catch (err) {
    return {
      valid: false,
      error: `SAML parsing error: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
}

// ---------------------------------------------------------------------------
// XML Signature Verification
// ---------------------------------------------------------------------------

/**
 * Verify XML digital signature using the IdP certificate.
 *
 * Extracts the SignedInfo element, canonicalizes it, and verifies
 * the SignatureValue against the IdP's public key.
 */
function verifyXMLSignature(xml: string, certPem: string): boolean {
  try {
    // Extract SignatureValue from the XML
    const sigValueMatch = xml.match(
      /<(?:ds:)?SignatureValue[^>]*>([\s\S]*?)<\/(?:ds:)?SignatureValue>/,
    );
    if (!sigValueMatch) return false;

    const signatureValue = sigValueMatch[1].replace(/\s/g, '');

    // Extract SignedInfo block for verification
    const signedInfoMatch = xml.match(
      /<(?:ds:)?SignedInfo[^>]*>([\s\S]*?)<\/(?:ds:)?SignedInfo>/,
    );
    if (!signedInfoMatch) return false;

    // Reconstruct SignedInfo with namespace for verification
    let signedInfo = signedInfoMatch[0];
    // If SignedInfo doesn't have xmlns:ds, add it for canonical form
    if (!signedInfo.includes('xmlns:ds=') && !signedInfo.includes(`xmlns="${DSIG_NS}"`)) {
      signedInfo = signedInfo.replace(
        /(<(?:ds:)?SignedInfo)/,
        `$1 xmlns:ds="${DSIG_NS}"`,
      );
    }

    // Determine signature algorithm from SignatureMethod
    const algMatch = signedInfo.match(
      /Algorithm="([^"]+)"/,
    );
    const algorithm = algMatch?.[1] ?? '';

    let nodeAlgorithm: string;
    if (algorithm.includes('rsa-sha256') || algorithm.includes('RSA-SHA256')) {
      nodeAlgorithm = 'RSA-SHA256';
    } else if (algorithm.includes('rsa-sha1') || algorithm.includes('RSA-SHA1')) {
      nodeAlgorithm = 'RSA-SHA1';
    } else if (algorithm.includes('rsa-sha512') || algorithm.includes('RSA-SHA512')) {
      nodeAlgorithm = 'RSA-SHA512';
    } else {
      // Default to SHA-256
      nodeAlgorithm = 'RSA-SHA256';
    }

    // Normalize certificate PEM
    const cert = normalizeCertPem(certPem);

    const verifier = crypto.createVerify(nodeAlgorithm);
    verifier.update(signedInfo);

    return verifier.verify(cert, signatureValue, 'base64');
  } catch {
    return false;
  }
}

/**
 * Ensure the certificate is in proper PEM format.
 */
function normalizeCertPem(cert: string): string {
  // Remove existing headers/footers and whitespace
  const raw = cert
    .replace(/-----BEGIN CERTIFICATE-----/g, '')
    .replace(/-----END CERTIFICATE-----/g, '')
    .replace(/\s/g, '');

  // Re-wrap in PEM format
  const lines: string[] = [];
  for (let i = 0; i < raw.length; i += 64) {
    lines.push(raw.substring(i, i + 64));
  }

  return `-----BEGIN CERTIFICATE-----\n${lines.join('\n')}\n-----END CERTIFICATE-----`;
}

// ---------------------------------------------------------------------------
// SP Metadata Generation
// ---------------------------------------------------------------------------

export interface SPMetadataOptions {
  entityId: string;
  acsUrl: string;
  sloUrl?: string;
  nameIdFormat?: string;
  signingCert?: string;
}

/**
 * Generate SAML 2.0 Service Provider metadata XML.
 */
export function generateSPMetadata(options: SPMetadataOptions): string {
  const nameIdFormat = options.nameIdFormat ??
    'urn:oasis:names:tc:SAML:1.1:nameid-format:emailAddress';

  const signingKeyDescriptor = options.signingCert
    ? `
    <md:KeyDescriptor use="signing">
      <ds:KeyInfo xmlns:ds="${DSIG_NS}">
        <ds:X509Data>
          <ds:X509Certificate>${options.signingCert.replace(/-----BEGIN CERTIFICATE-----/g, '').replace(/-----END CERTIFICATE-----/g, '').replace(/\s/g, '')}</ds:X509Certificate>
        </ds:X509Data>
      </ds:KeyInfo>
    </md:KeyDescriptor>`
    : '';

  const sloDescriptor = options.sloUrl
    ? `
    <md:SingleLogoutService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      Location="${escapeXml(options.sloUrl)}"/>`
    : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<md:EntityDescriptor
  xmlns:md="urn:oasis:names:tc:SAML:2.0:metadata"
  entityID="${escapeXml(options.entityId)}">
  <md:SPSSODescriptor
    AuthnRequestsSigned="false"
    WantAssertionsSigned="true"
    protocolSupportEnumeration="${SAMLP_NS}">${signingKeyDescriptor}
    <md:NameIDFormat>${escapeXml(nameIdFormat)}</md:NameIDFormat>
    <md:AssertionConsumerService
      Binding="urn:oasis:names:tc:SAML:2.0:bindings:HTTP-POST"
      Location="${escapeXml(options.acsUrl)}"
      index="0"
      isDefault="true"/>${sloDescriptor}
  </md:SPSSODescriptor>
  <md:Organization>
    <md:OrganizationName xml:lang="en">CVERiskPilot</md:OrganizationName>
    <md:OrganizationDisplayName xml:lang="en">CVERiskPilot</md:OrganizationDisplayName>
    <md:OrganizationURL xml:lang="en">https://cveriskpilot.com</md:OrganizationURL>
  </md:Organization>
</md:EntityDescriptor>`;
}

// ---------------------------------------------------------------------------
// Attribute mapping helpers
// ---------------------------------------------------------------------------

/** Standard SAML attribute names across common IdPs */
const ATTRIBUTE_ALIASES: Record<string, string[]> = {
  email: [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress',
    'urn:oid:0.9.2342.19200300.100.1.3',
    'email',
    'Email',
    'mail',
  ],
  name: [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name',
    'urn:oid:2.16.840.1.113730.3.1.241',
    'displayName',
    'name',
  ],
  firstName: [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/givenname',
    'urn:oid:2.5.4.42',
    'firstName',
    'givenName',
  ],
  lastName: [
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/surname',
    'urn:oid:2.5.4.4',
    'lastName',
    'sn',
  ],
  groups: [
    'http://schemas.xmlsoap.org/claims/Group',
    'memberOf',
    'groups',
    'Group',
  ],
};

/**
 * Extract a normalized user profile from SAML attributes.
 * Handles attribute name differences across IdPs (Okta, Azure AD, OneLogin, etc).
 */
export function extractSAMLProfile(assertion: SAMLAssertion): {
  email: string;
  name: string;
  groups: string[];
} {
  const findAttr = (canonical: string): string | undefined => {
    const aliases = ATTRIBUTE_ALIASES[canonical] ?? [canonical];
    for (const alias of aliases) {
      const value = assertion.attributes[alias];
      if (value) {
        return Array.isArray(value) ? value[0] : value;
      }
    }
    return undefined;
  };

  const findAttrArray = (canonical: string): string[] => {
    const aliases = ATTRIBUTE_ALIASES[canonical] ?? [canonical];
    for (const alias of aliases) {
      const value = assertion.attributes[alias];
      if (value) {
        return Array.isArray(value) ? value : [value];
      }
    }
    return [];
  };

  // Email: try NameID first (many IdPs use email as NameID), then attributes
  const email = findAttr('email') ?? assertion.nameId;

  // Name: try display name, then construct from first+last
  const displayName = findAttr('name');
  const firstName = findAttr('firstName') ?? '';
  const lastName = findAttr('lastName') ?? '';
  const name = displayName || `${firstName} ${lastName}`.trim() || email.split('@')[0];

  const groups = findAttrArray('groups');

  return { email, name, groups };
}

// ---------------------------------------------------------------------------
// XML helpers
// ---------------------------------------------------------------------------

/** Find a key in an object matching the given local name (after stripPrefix, keys are already local) */
function findKey(obj: Record<string, unknown>, localName: string): string | null {
  if (localName in obj) return localName;
  // Fallback: check for namespace-prefixed keys (shouldn't happen with stripPrefix)
  for (const key of Object.keys(obj)) {
    if (key.endsWith(`:${localName}`)) return key;
  }
  return null;
}

/** Find a nested key matching a local name */
function findNestedKey(obj: Record<string, unknown> | undefined, localName: string): string | null {
  if (!obj) return null;
  return findKey(obj, localName);
}

/** Extract text value from a parsed XML element */
function extractTextValue(parent: Record<string, unknown>, key: string | null): string | null {
  if (!key) return null;
  const arr = parent[key] as unknown[];
  if (!arr?.length) return null;
  const first = arr[0];
  if (typeof first === 'string') return first;
  if (typeof first === 'object' && first !== null && '_' in first) {
    return (first as { _: string })._;
  }
  return null;
}

/** Escape XML special characters */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
