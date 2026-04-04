# BUILD A CLI TOOL - Port Pilot

You're building a tool that runs in the terminal, the place where you spend most of your development time. No HTML, no CSS, no DOM. Just text, colors, and keyboard input.

Port Pilot is a CLI and TUI (terminal user interface) for managing everything running on your machine's ports. Run `ports` with no arguments to see a live, interactive dashboard of every process listening on a port. It shows the port number, PID, project name, framework, memory usage, and uptime. You can kill a process, open it in the browser, or open its project folder in your editor, all with a single keystroke.
The tool also has direct subcommands for quick actions: `ports check 4321` tells you exactly what's running on that port. `ports kill 4321` kills it. `ports list` prints a static table.

This project teaches you several new concepts. First, CLI architecture: how terminal tools are structured with commands, subcommands, flags, and arguments. Libraries like Commander.js handle argument parsing so you don't have to parse `process.argv` yourself. Second, system programming: querying the operating system for process information using tools like `lsof` and `ps`, then parsing their text output into structured data. Third, TUI development: building an interactive interface in the terminal using Ink (React for the terminal), with keyboard navigation, auto-refresh, and multiple display modes. Fourth, project structure: separating data collection, CLI commands, and TUI rendering into distinct layers so the same `scanPorts()` function serves both the one-off commands and the live dashboard.

## Initial Prompt

## Tech Stack

Flavio uses the following tech stack:

For the app I built (Port Pilot), I used TypeScript with Commander.js for CLI parsing, Ink + React for the TUI, chalk for colored output, and execa for running system commands. The tool reads process information from `lsof` (listening TCP ports) and `ps` (memory, uptime), then enriches each entry by walking up from the process working directory to find `package.json` and detect the framework.

## Minimum Requirements

- A binary command (e.g. `ports`) that you can run from anywhere in your terminal
- An interactive TUI dashboard that opens when running with no arguments
- Subcommands for quick actions: at least `list`, `check <port>`, `kill <port>`
- Port scanning that finds all listening TCP ports on the machine
- Process enrichment: PID, command name, memory usage, and uptime for each port
- Project detection by finding package.json in the process working directory
- Framework detection by reading dependencies (Next.js, Astro, Vite, etc.)
- Keyboard navigation in the TUI (arrow keys or j/k to move, q to quit)
- Auto-refresh so the TUI updates every few seconds

## Adding Sort

The s sort command is live in src/tui/App.tsx. It now cycles through:

port number ascending
memory highest first
uptime longest first
project name alphabetical

I also added the active sort label to the header on the right, and uptime sorting now parses the elapsed-time string into seconds so it sorts correctly instead of comparing text.

## Colors

It looks like one of the packages being used here mucks around with any hex codes used for colors. So, after a bit of experimentation, the colors suck, but so be it.

## Adding Filter

The filter command is live in App.tsx.

Pressing f now cycles through:

All Ports
Dev Ports for ports 3000-9999
Node Only for recognized frameworks or node / deno / bun commands
The current filter now appears in the header next to the sort label, and switching filters resets selection to the first row as requested.

## Readme Improvements

I updated README.md to match the current app state.

It now includes:

the live TUI f filter cycle
the live s sort cycle
a TUI Behavior section describing the header labels, filter reset behavior, dev-port filtering, node-only filtering, and proper uptime sorting

If you want, I can also do one final README polish pass later to make it read a little more like release docs instead of an evolving project log.

## Other Improvements

A few strong next improvements stand out:

Add r refresh as a manual refresh shortcut. Even with auto-refresh, it’s useful right after killing a process or starting a server.

Implement / search to filter the visible list by port, project name, framework, or command. That would make the TUI much faster on busy machines.

Add f and s indicators in the footer, like Filter: Dev Ports and Sort: Memory, so the current state is visible in two places.

Make check richer by showing cwd, detected project root, whether e is available, and maybe the exact framework match source.

Add a confirmation step before K for non-dev ports or system-looking processes, to reduce accidental kills.
Highlight stale or missing metadata better. For example, show a subtle marker when memory/uptime couldn’t be read.

Add tests for the tricky logic:
uptime parsing
sort ordering
filter matching
framework detection

Add ports doctor or ports debug to help troubleshoot cases where lsof, ps, or editor launching behaves differently on a machine.

Consider a --json output mode for list or check, which would make the tool scriptable.

Add a small empty-state message for filters, like “No node-related ports match the current filter.”

If I were picking the highest-value next step, I’d do / search and r refresh first. Those would make the TUI feel much more complete very quickly.

### Adding Search and Filter

/ now opens an inline search mode that filters by port, project name, framework, command, cwd, or project root. It updates live as you type, resets selection to the first match, and exits with Enter or Esc. I also added the current search state to the header and a small search section when search is active.

r now performs an immediate refresh of the port list, separate from the 3-second auto-refresh.

I also tightened selection handling so it stays valid when filtering or searching changes the visible rows.

### Adding K Confirmation

Yes, it’s now a y/n confirmation.

I added a pending-kill confirmation flow in App.tsx:

Press K to open a confirmation prompt for the selected process
Press y to confirm the kill
Press n or Esc to cancel
While that prompt is active, the other TUI shortcuts are ignored so the interaction stays safe and predictable.

### Adding a Single Page Documentation 

I added a standalone product-style HTML page at [product-page.html](/Users/pattyharris/Documents/FlavioCopesBootcamp/AIBootcamp/week6/product-page.html).

It’s a single-page launch/docs style page with:

- a hero section and terminal mockup
- quick-start setup
- CLI command summaries
- TUI feature highlights
- a short “how it works” section

I kept the content aligned with the current Port Pilot feature set rather than making it generic. I didn’t wire it into any app server, so you can just open the file directly in a browser to review it.