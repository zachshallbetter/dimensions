# Security Policy

## Reporting a vulnerability

If you find a security issue in dimensions, please report it privately rather than opening a public
issue. Use GitHub private vulnerability reporting:
<https://github.com/zachshallbetter/dimensions/security/advisories/new>

Include a description of the issue and its impact, steps to reproduce (a minimal example is
ideal), and the affected commit or version.

This project has a solo maintainer. Handling is best-effort with no SLA: there is no guaranteed
response time, and fixes are prioritized by severity as time allows.

## Scope

dimensions is a static, client-side WebGL page (a Three.js scene) with no server code. It loads
Three.js from a CDN (`esm.run`) at runtime and reads no user data beyond pointer input. The most
relevant surface is that third-party script load and the page's DOM handling. Reports about those
are in scope.

## Supported versions

Only the latest commit on `main` receives fixes. The project does not publish versioned releases.
