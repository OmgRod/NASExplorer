# NAS Explorer deployment

NAS Explorer is packaged as one container: Express serves the API and the built Vite application from port `5000`.

## OpenMediaVault

1. Copy `.env.example` to `.env` and set `OMV_PASS` to the OMV account password.
2. Set `NAS_STORAGE_PATH` to the host path that contains the storage you want to manage. The container sees it as `/srv`.
3. Start the service from the project directory:

```sh
docker compose up -d --build
```

Open `http://<omv-host>:5000`. The OMV account used to log in must have permission to enumerate disks and shared folders. The file manager supports browsing, upload, download, new folders, rename, and recursive delete within `/srv`.

## Reverse proxy

For an OMV Nginx Proxy Manager or other reverse proxy, forward both HTTP and WebSocket traffic to `nas-explorer:5000`. Keep the container port private when the proxy is on the same Docker network.

## Safety

Filesystem operations are restricted to `DEFAULT_STORAGE_ROOT`; traversal outside that root is rejected. Set `ALLOW_ANONYMOUS=true` only on an isolated development network.