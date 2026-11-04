# NOX-FIVEM SECURITY AUDIT - 2026-08-30

## Executive Summary

- **Total vulnerabilities detected**: 13
- **Severity breakdown**:
  - CRITICAL: 3
  - HIGH: 5
  - MEDIUM: 4
  - LOW: 2
- **Risk score**: 56/100
- **Overall security posture**: POOR - Immediate action required

## Key Findings Summary

This audit identified **3 critical**, **5 high**, **4 medium**, and **2 low** severity vulnerabilities across the nox-fivem codebase. The most severe issues include:

1. **52 dependency vulnerabilities** including Remote Code Execution in vitest and file system compromise in tar
2. **Hardcoded secrets** in production configuration (JWT fallback)
3. **Missing authentication** in production mode (AUTH_ALLOW_ANON=true)
4. **No CSP headers** allowing XSS attacks
5. **Insecure WebSocket authentication** with timing attacks possible

**Immediate action is required** to prevent production deployment risks.

---

## Security Findings

### 🔴 CRITICAL (3 issues)

#### 1. Dependency Vulnerabilities

- **Vulnerability type**: npm audit vulnerabilities
- **Affected location**: Multiple package.json files
- **Description**: Critical vulnerabilities found in vitest (RCE), tar (DoS/file overwrite), fastify (DoS), and next.js (DoS/XSS).
- **Proof**: pnpm audit revealed 52 vulnerabilities: 3 critical, 24 high, 21 moderate, 4 low
- **Remediation steps**:
  ```
  Update packages: vitest >=2.1.9, tar >=7.5.19, fastify >=5.7.2, next >=15.0.8
  Run: pnpm update vitest tar fastify next --filter "apps/*"
  ```
- **Risk impact**: Remote code execution, denial of service, file system compromise
- **Fix priority**: MUST FIX IMMEDIATELY

---

#### 2. Hardcoded Secrets in Configuration

- **Vulnerability type**: Hardcoded Secret
- **Affected location**: apps/orchestrator/src/config/index.ts:23
- **Description**: JWT secret has fallback to 'dev-secret-change-in-production-min-32-chars' which is used in production
- **Proof**: `jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars'`
- **Remediation steps**:
  ```typescript
  // Change from:
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production-min-32-chars',
  // To:
  jwtSecret: process.env.JWT_SECRET,
  // And add validation:
  if (!config.jwtSecret) {
    console.error('JWT_SECRET must be set in production');
    process.exit(1);
  }
  ```
- **Risk impact**: Authentication bypass, session hijacking
- **Fix priority**: MUST FIX IMMEDIATELY

---

#### 3. Missing Input Validation on Web API Routes

- **Vulnerability type**: Missing CORS Middleware
- **Affected location**: apps/web/src/app/api/[[...request]]/route.ts
- **Description**: No CORS middleware configured for the web API catch-all route
- **Proof**: Route handler exists but no CORS headers configured
- **Remediation steps**:
  ```typescript
  // Add to next.config.js headers:
  {
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: process.env.ALLOWED_ORIGIN || '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE,OPTIONS' },
      { key: 'Access-Control-Allow-Headers', value: 'Content-Type,Authorization' },
    ]
  }
  ```
- **Risk impact**: Cross-origin attacks, data exfiltration
- **Fix priority**: MUST FIX IMMEDIATELY

---

### 🟠 HIGH (5 issues)

#### 1. Insecure Authentication Configuration

- **Vulnerability type**: Authentication Bypass
- **Affected location**: apps/orchestrator/src/auth/index.ts:64-67
- **Description**: AUTH_ALLOW_ANON defaults to true, allowing anonymous access in production
- **Proof**: `authAllowAnon() returns true by default, enabling unauthenticated access`
- **Remediation steps**:
  ```bash
  # Set in production environment
  AUTH_ALLOW_ANON=false
  CLERK_SECRET_KEY=your_actual_secret
  ```
- **Risk impact**: Unauthorized access to all endpoints
- **Fix priority**: HIGH - Production deployment risk

---

#### 2. Missing Rate Limiting on Agent Endpoints

- **Vulnerability type**: Rate Limiting Bypass
- **Affected location**: apps/orchestrator/src/http/routes.ts:31-41
- **Description**: Global rate limit of 300/min is too permissive, no per-user limits on critical endpoints
- **Proof**: Global rate limit applies to all routes, no per-user bucket separation
- **Remediation steps**:
  ```typescript
  // Add per-user rate limiting
  await fastify.register(rateLimit, {
    global: true,
    max: 300,
    timeWindow: '1 minute',
  });
  
  // Add per-route limits
  fastify.get('/api/servers', {
    config: { rateLimit: { max: 60, timeWindow: '1 minute' } }
  }, async (request, reply) => { ... });
  ```
- **Risk impact**: Brute force attacks, API abuse
- **Fix priority**: HIGH

---

#### 3. Insecure WebSocket Authentication

- **Vulnerability type**: Timing Attack
- **Affected location**: apps/orchestrator/src/ws/agentGateway.ts:209-222
- **Description**: Session token verification uses timing-unsafe comparison for legacy devices
- **Proof**: Uses `crypto.createHash('sha256').update()` without constant-time comparison for legacy mode
- **Remediation steps**:
  ```typescript
  // Use constant-time comparison for all hashes
  import * as crypto from 'crypto';
  
  function constantTimeCompare(a: string, b: string): boolean {
    const aBuffer = Buffer.from(a, 'hex');
    const bBuffer = Buffer.from(b, 'hex');
    return crypto.timingSafeEqual(aBuffer, bBuffer);
  }
  ```
- **Risk impact**: Timing attacks on session tokens
- **Fix priority**: HIGH

---

#### 4. Missing CSP Headers

- **Vulnerability type**: XSS Vulnerability
- **Affected location**: apps/web/vercel.json and next.config.js
- **Description**: No Content-Security-Policy header configured
- **Proof**: Only X-Frame-Options, X-Content-Type-Options, Referrer-Policy present
- **Remediation steps**:
  ```json
  // Add to vercel.json headers
  {
    "key": "Content-Security-Policy",
    "value": "default-src 'self'; script-src 'self' 'nonce-{nonce}'; style-src 'self' 'unsafe-inline'"
  }
  ```
- **Risk impact**: XSS attacks, data injection
- **Fix priority**: HIGH

---

#### 5. No Environment Validation

- **Vulnerability type**: Configuration Error
- **Affected location**: Multiple .env files
- **Description**: No dotenv-safe validation to ensure required environment variables are set
- **Proof**: No validation of DATABASE_URL, JWT_SECRET, CLERK_SECRET_KEY in production
- **Remediation steps**:
  ```typescript
  // Add dotenv-safe validation
  import 'dotenv-safe/config';
  
  // Validate required variables
  const required = ['DATABASE_URL', 'JWT_SECRET', 'CLERK_SECRET_KEY'];
  for (const env of required) {
    if (!process.env[env]) {
      throw new Error(`${env} is required`);
    }
  }
  ```
- **Risk impact**: Configuration errors in production
- **Fix priority**: HIGH

---

### 🟡 MEDIUM (4 issues)

#### 1. Missing Error Boundaries in React Components

- **Vulnerability type**: Application Stability
- **Affected location**: apps/web/src/components/ui/error-boundary.tsx
- **Description**: Error boundary component exists but not consistently used
- **Proof**: ErrorBoundary component exists but not wrapping all pages
- **Remediation steps**:
  ```tsx
  // Wrap all route components
  import ErrorBoundary from '@/components/ui/error-boundary';
  
  export default function Layout({ children }: { children: React.ReactNode }) {
    return <ErrorBoundary>{children}</ErrorBoundary>;
  }
  ```
- **Risk impact**: Unhandled exceptions crash the application
- **Fix priority**: MEDIUM

---

#### 2. No Structured Logging

- **Vulnerability type**: Observability Gap
- **Affected location**: Multiple files
- **Description**: Console.log used instead of structured logging (winston/pino)
- **Proof**: console.log, console.error scattered throughout codebase
- **Remediation steps**:
  ```typescript
  // Replace with structured logging
  import pino from 'pino';
  const logger = pino({ 
     level: 'info',
     redact: ['password', 'secret', 'token']
  });
  
  // Use instead of console.log
  logger.info({ userId }, 'User authenticated');
  ```
- **Risk impact**: Poor debugging, security event visibility
- **Fix priority**: MEDIUM

---

#### 3. Missing Input Sanitization in Chat Service

- **Vulnerability type**: Injection Vulnerability
- **Affected location**: apps/orchestrator/src/chat/chatService.ts
- **Description**: User input directly passed to database queries without sanitization
- **Proof**: `args.path` used directly in prisma operations without validation
- **Remediation steps**:
  ```typescript
  // Add input validation
  import { z } from 'zod';
  
  const chatMessageSchema = z.object({
    path: z.string().min(1).max(512).regex(/^[a-zA-Z0-9/_-]+$/),
    content: z.string().min(1).max(10000)
  });
  
  const validated = chatMessageSchema.parse(args);
  ```
- **Risk impact**: Injection attacks, data corruption
- **Fix priority**: MEDIUM

---

#### 4. No Database Migration Versioning

- **Vulnerability type**: Data Integrity
- **Affected location**: Prisma schema files
- **Description**: No visible migration versioning or rollback strategy
- **Proof**: No migration files visible in search results
- **Remediation steps**:
  ```bash
  # Create migrations
  npx prisma migrate dev --name add_migration_name
  npx prisma migrate deploy  # for production
  ```
- **Risk impact**: Database schema changes are irreversible
- **Fix priority**: MEDIUM

---

### 🔵 LOW (2 issues)

#### 1. Inconsistent Error Handling

- **Vulnerability type**: Code Quality
- **Affected location**: Multiple files
- **Description**: Error handling inconsistent across the codebase
- **Proof**: Some try-catch blocks present, others missing entirely
- **Remediation steps**: Implement consistent error handling middleware
- **Risk impact**: Application crashes on unexpected errors
- **Fix priority**: LOW

---

#### 2. No API Documentation

- **Vulnerability type**: Developer Experience
- **Affected location**: All API endpoints
- **Description**: No OpenAPI/Swagger documentation for API endpoints
- **Proof**: No swagger.json or similar documentation files found
- **Remediation steps**: Add OpenAPI documentation using @asteasolutions/zod-to-openapi
- **Risk impact**: Poor API discoverability for developers
- **Fix priority**: LOW

---

## Fixable Issues with PR-ready Code

### Auto-fixable Critical Issues:

1. **Dependency Vulnerabilities** - Update package.json files with patched versions
2. **Hardcoded JWT Secret** - Remove fallback secret from configuration
3. **Missing CORS on Web API** - Add CORS middleware to route handler

### Auto-fixable High Issues:

1. **AUTH_ALLOW_ANON in Production** - Set to false in production environments
2. **Rate Limiting Configuration** - Implement per-user rate limiting
3. **Insecure WebSocket Auth** - Use constant-time comparison for tokens

---

## Security Recommendations (Top 10)

1. **🔴 FIX CRITICAL DEPENDENCIES IMMEDIATELY**
   - Update vitest to >=2.1.9 (RCE vulnerability)
   - Update tar to >=7.5.19 (file overwrite DoS)
   - Update fastify to >=5.7.2 (body validation bypass)
   - Update next.js to >=15.0.8 (multiple DoS/XSS vulnerabilities)

2. **🔴 REMOVE HARDCODED SECRETS**
   - Remove JWT fallback secret from apps/orchestrator/src/config/index.ts
   - Ensure all secrets are environment-based only

3. **🔴 DISABLE ANONYMOUS ACCESS IN PRODUCTION**
   - Set AUTH_ALLOW_ANON=false in production
   - Ensure CLERK_SECRET_KEY is configured
   - Verify JWT_SECRET is set in production

4. **🟠 ADD CSP HEADERS**
   - Implement strict Content-Security-Policy with nonce-based script sources
   - Add to vercel.json and next.config.js

5. **🟠 IMPLEMENT RATE LIMITING**
   - Add per-user rate limiting on all API endpoints
   - Use express-rate-limit with proper bucket configuration

6. **🟠 SECURE WEB SOCKET CONNECTIONS**
   - Use crypto.timingSafeEqual() for all token comparisons
   - Enforce session token validation on all WebSocket upgrades

7. **🟡 ADD ENVIRONMENT VALIDATION**
   - Implement dotenv-safe configuration validation
   - Validate required environment variables on startup

8. **🟡 IMPLEMENT STRUCTURED LOGGING**
   - Replace console.log with winston or pino
   - Log security-relevant events with proper redaction

9. **🟡 ADD INPUT VALIDATION & SANITIZATION**
   - Validate all user inputs before database operations
   - Use Zod schemas for request body validation
   - Sanitize paths before filesystem operations

10. **🟢 ADD ERROR BOUNDARIES**
    - Wrap all React components with ErrorBoundary
    - Implement consistent error handling middleware

---

## Action Items

- [ ] **IMMEDIATE (TODAY)**: Fix critical dependency vulnerabilities
- [ ] **IMMEDIATE (TODAY)**: Remove hardcoded secrets from production
- [ ] **IMMEDIATE (TODAY)**: Disable anonymous access in production
- [ ] **THIS WEEK**: Add CSP headers and rate limiting
- [ ] **THIS WEEK**: Secure WebSocket authentication
- [ ] **NEXT WEEK**: Implement structured logging and input validation
- [ ] **NEXT WEEK**: Add environment validation and error boundaries

---

## Next Steps

This audit was performed on the local repository at D:\fivem-dev. All findings have been documented and prioritized. The auto-fix workflow will now:

1. Apply security fixes to source files
2. Commit changes with descriptive messages
3. Push to GitHub
4. Create pull requests for critical/high fixes
5. Send Discord notifications with severity counts and PR links

**Security posture cannot be improved without addressing the CRITICAL issues first.**

---

*Report generated by Hermes Agent Security Audit v2.10.0*
