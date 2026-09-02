# Print Menu Renderer Desktop

Desktop wrapper for the existing `local-renderer` service.

This package is intentionally additive: it does not replace or change the existing renderer workflow. The current command-line renderer still works:

```bash
cd local-renderer
npm install
npm start
```

The desktop app starts the same renderer API on `http://localhost:3020`, so the web app keeps using the same endpoints:

- `GET /health`
- `POST /jobs`
- `GET /jobs/:id`
- `GET /jobs/:id/file`
- `POST /api/promo-render`
- `GET /drive-media/:fileId`
- `POST /convert-gif`

## Development

From the repository root:

```bash
cd local-renderer
npm install
npm run setup

cd ../local-renderer-desktop
npm install
npm start
```

The desktop app will start `../local-renderer/server.js` through `npm start` unless another renderer is already running on `localhost:3020`.

## Packaging

Windows:

```bash
cd local-renderer-desktop
npm install
npm run package:win
```

macOS:

```bash
cd local-renderer-desktop
npm install
npm run package:mac
```

Packaged builds include `../local-renderer` as an extra resource and launch it inside the desktop shell.

## Safety notes

- The desktop app preserves the existing renderer contract.
- The web app does not need to change and continues to call `http://localhost:3020`.
- If a renderer is already running on port `3020`, the desktop app uses that instance instead of starting a second one.
- Code signing and notarization are not configured yet.
