# KALAN Web — local proxy prototype

This is the first working-browser prototype for the separate KALAN Web service. It is not yet connected to the public KALANGAMER site.

## Run it on the Windows PC

1. Open **PowerShell**.
2. Run:

   ```powershell
   git clone --branch feature/kalan-web-foundation https://github.com/atockikalan-ctrl/kalan.git
   cd kalan\kalan-web-proxy
   docker compose up --build
   ```

   If you already cloned the repository, open that folder and run `git pull origin feature/kalan-web-foundation` first, then change into `kalan-web-proxy`.

3. Open **http://127.0.0.1:4173** in your browser.
4. Try a simple public website such as `https://example.com`.
5. Leave the PowerShell window open while testing. Stop the service with **Ctrl+C**.

To start it again later, run `docker compose up` from this folder. To stop and remove the container, run `docker compose down`.

## What's included

- Scramjet browser rewriting engine and its service worker.
- Wisp WebSocket transport hosted by this same local service.
- Search/address bar and browser frame.
- Pinned package versions so dependency updates do not silently change the engine.
- Docker isolation: loopback-only published port, no host-folder mounts, non-root user, read-only container filesystem, dropped Linux capabilities, and resource limits.

## Important limitations — do not expose this service publicly yet

This is a local prototype, not a finished shared service. It currently has **no user sign-in/access-code gate, no per-user session reporting, no admin ban/revoke controls, no configurable blocked-domain enforcement, and no integration with the KALANGAMER tab**. Keep the Docker port bound to `127.0.0.1`; do not change it to `0.0.0.0`, add a public tunnel, or share it with classmates.

Docker isolation is not an absolute security boundary. Before any public access, the next milestone must add server-enforced authentication, destination/IP protections against private-network access, domain blocking, usage limits, and admin session revocation, then security-test those controls. Scramjet itself is experimental upstream software; some websites may fail or behave differently from a normal browser.

The separate admin-only KALAN Cloud desktop feature is not part of this proxy container.
