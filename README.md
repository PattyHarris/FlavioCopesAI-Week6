# Port Pilot

Port Pilot is a TypeScript CLI and TUI for inspecting the processes listening on your machine's TCP ports. It gives you a live terminal dashboard plus direct commands to inspect, stop, open, and jump into the projects behind local ports.

## Quick Start

```bash
npm run setup
ports
```

That installs dependencies, builds the CLI, links the `ports` command globally, and gets you ready to launch the dashboard.

## Commands

- `ports` opens the interactive TUI
- `ports list` prints a static table
- `ports check <port>` inspects one port
- `ports kill <port>` stops the process on that port
- `ports open <port>` opens `localhost:PORT`
- `ports edit <port>` opens the detected project in your editor

## Docs

- Full usage guide: [USAGE_GUIDE.md](./USAGE_GUIDE.md)
- Product page: [product-page.html](./product-page.html)

## Development

```bash
npm install
npm run build
npm run typecheck
npm run dev
```
