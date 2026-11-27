# KALAN Web Proxy (local development)

This service is developed separately from the KALANGAMER Pages frontend.

## Current milestone

This is a local-only service shell. It is **not yet a working web proxy** and must not be exposed to the public internet. The next milestone is integrating and testing a pinned Scramjet + transport stack, followed by server-side access control and destination protections.

## Run locally

From this directory:

```powershell
docker compose up --build
```

Open http://127.0.0.1:4173/ .

Stop it with Ctrl+C, then:

```powershell
docker compose down
```

## Isolation choices

- Binds the published port to loopback only.
- No host folders are mounted into the container.
- Runs as an unprivileged user.
- Read-only container filesystem, with only a temporary `/tmp`.
- Drops Linux capabilities and blocks privilege escalation.
- Applies memory, CPU, and process limits.

Docker containers are useful isolation, not an absolute security boundary. Keep this service local-only until authentication, SSRF protections, domain controls, and proxy-specific security tests are complete.
