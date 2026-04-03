# Initial Prompt

Build me a CLI tool called "ports" that shows what's running on my machine's ports. The application name is "Port Pilot" whereas the command itself is "ports". It should have two modes:

1. An interactive TUI (terminal user interface) that opens when I run `ports` with no arguments. It shows a live table of all listening ports with columns for: port number, project name, framework, PID, memory usage, uptime, and command name. It auto-refreshes every 3 seconds. I navigate with arrow keys and can take actions with keyboard shortcuts.

2. Direct commands for quick actions:
   - `ports list` — print a static table of all listening ports
   - `ports check <port>` — show detailed info about what's on that port (or say it's free)
   - `ports kill <port>` — kill whatever is on that port

3. Keyboard Shortcuts
   Add keyboard shortcuts to the TUI: K to kill the selected process (SIGTERM first, wait 1 second, then SIGKILL if still alive), o to open localhost:PORT in the default browser, e to open the project folder in Cursor (fall back to VS Code). Show the available shortcuts in a bar at the bottom of the screen.

How it works:

- Use `lsof -iTCP -sTCP:LISTEN -P -n` to find all listening TCP ports
- For each process, get the working directory with `lsof -d cwd`, and memory/uptime with `ps -o rss=,etime=`
- Walk up from the working directory to find `package.json`, read the project name, and detect the framework from dependencies
- Detect frameworks: Next.js, Astro, Vite, Remix, Nuxt, SvelteKit, Angular

Use TypeScript. Use Commander.js for CLI argument parsing. Use Ink (React for terminals) for the TUI. Use chalk for colored output. Use execa for running system commands. Build with tsup.

Add a `bin` field to package.json so I can run `ports` from anywhere after `npm link`.

Make it useful. This is a developer tool I'll use every day.

## Tech Stack

- Typescript
- Ink + React for the terminal
- Commander.js for the CLI prompts
- chalk for colors
- execa for system commands
- tsup for bundler
