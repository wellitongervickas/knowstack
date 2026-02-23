# Security Policy

## Reporting a Vulnerability

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, open a [private issue on GitHub](https://github.com/wellitongervickas/knowstack/issues) and clearly mark it as a security vulnerability. This ensures that security issues are handled confidentially before public disclosure.

When reporting, please include:

- Description of the vulnerability
- Steps to reproduce the issue
- Potential impact and severity assessment
- Any suggested fixes (optional)

## Supported Versions

| Version | Supported |
| ------- | --------- |
| latest  | Yes       |

As a self-hosted platform, users are responsible for keeping their deployments up to date. We recommend always running the latest version.

## Response Process

1. **Acknowledgment** -- We will acknowledge your report within 48 hours
2. **Assessment** -- We will investigate and determine severity and impact
3. **Fix** -- A fix will be developed privately
4. **Disclosure** -- A security advisory will be published alongside the fix release

## Scope

The following are in scope for security reports:

- Authentication and authorization bypasses
- Data exposure across tenant boundaries
- API key or credential leakage
- Injection vulnerabilities (SQL, command, etc.)
- Cryptographic weaknesses

The following are generally out of scope:

- Denial of service from misconfiguration
- Vulnerabilities in dependencies already reported upstream
- Issues requiring physical access to the host
