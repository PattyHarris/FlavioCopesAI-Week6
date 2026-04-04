# Port Pilot Usage Guide

Port Pilot is a TypeScript CLI and TUI for inspecting the processes listening on your machine's TCP ports.

## Setup

For first-time setup, you can do everything in one command:

```bash
npm run setup
```

That script installs dependencies, builds the CLI, and links the `ports` command globally.

If you prefer to run the steps manually:

```bash
npm install
npm run build
npm link
```

After linking, you can run `ports` from anywhere in your terminal.

## Usage

Run the interactive dashboard:

```bash
ports
```

Run one-off commands:

```bash
ports list
ports check 3000
ports kill 3000
ports open 3000
ports edit 3000
```

## Commands

- `ports` opens the live terminal dashboard
- `ports list` prints a static table
- `ports check <port>` shows one port in detail
- `ports kill <port>` stops the process on a port
- `ports open <port>` opens `http://localhost:<port>`
- `ports edit <port>` opens the project folder in Cursor or VS Code

## TUI Shortcuts

- `↑` / `↓` or `j` / `k` move between rows
- `f` cycles filters: `All Ports`, `Dev Ports`, `Node Only`
- `s` cycles sorting: `Port`, `Memory`, `Uptime`, `Project`
- `K` opens a `y/n` confirmation before killing the selected process
- `o` opens `http://localhost:PORT` in the default browser
- `e` opens the detected project folder in Cursor, with VS Code as a fallback
- `e` is only available when Port Pilot finds a real project root by walking up to a `package.json`
- `/` starts live search across port, project, framework, command, cwd, and project root
- `r` refreshes the list and clears the current search
- `q` quits the dashboard

## TUI Behavior

- The header shows the active filter and sort mode
- The footer repeats the current filter and sort mode
- Switching filters resets selection to the first visible row
- `Dev Ports` shows only ports `3000-9999`
- `Node Only` shows processes with a recognized framework or a `node`, `deno`, or `bun` command
- Uptime sorting parses elapsed time into seconds so longest-running processes sort correctly
- Pressing `Esc` exits search entry mode but keeps the current search results visible

## Testing The Editor Shortcut

The easiest way to test `e` is to start a small local server from a folder you control, then open Port Pilot and select that port:

```bash
node -e "require('node:http').createServer((_,res)=>res.end('ok')).listen(4321); setInterval(() => {}, 1 << 30)"
```

In another terminal:

```bash
ports
```

Select port `4321` and press `e`. Because that process was started from your project folder, Port Pilot can detect the project root and open it in your editor.

When Port Pilot opens a project in Cursor or VS Code, it asks the editor to reuse the current window when supported instead of always opening a brand-new one.

## Development

```bash
npm install
npm run build
npm run typecheck
npm run dev
```
