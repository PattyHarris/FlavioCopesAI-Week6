import chalk from 'chalk';
import {Command} from 'commander';
import {formatMemory, pad} from './core/format.js';
import {openInBrowser, openInEditor, terminateProcess} from './core/processActions.js';
import {findPort, scanPorts} from './core/scanPorts.js';
import type {PortProcess} from './core/types.js';

const TABLE_COLUMNS = [
  {key: 'port', label: 'PORT', width: 7},
  {key: 'projectName', label: 'PROJECT', width: 20},
  {key: 'framework', label: 'FRAMEWORK', width: 12},
  {key: 'pid', label: 'PID', width: 8},
  {key: 'memory', label: 'MEMORY', width: 10},
  {key: 'uptime', label: 'UPTIME', width: 10},
  {key: 'command', label: 'COMMAND', width: 18},
] as const;

export function createProgram(startTui: () => Promise<void>): Command {
  const program = new Command();

  program
    .name('ports')
    .description('Port Pilot keeps track of the processes listening on your machine.')
    .version('0.1.0');

  program
    .command('list')
    .description('Print a static table of all listening ports')
    .action(async () => {
      const ports = await scanPorts();
      if (!ports.length) {
        console.log(chalk.yellow('No listening TCP ports found.'));
        return;
      }

      console.log(renderTable(ports));
    });

  program
    .command('check')
    .description('Show detailed information about a single port')
    .argument('<port>', 'Port number to inspect')
    .action(async (portValue: string) => {
      const port = parsePort(portValue);
      const details = await findPort(port);

      if (details.isFree) {
        console.log(chalk.green(`Port ${port} is free.`));
        return;
      }

      console.log(chalk.bold(`Port ${details.port}`));
      console.log(`Project:   ${details.projectName}`);
      console.log(`Framework: ${details.framework}`);
      console.log(`PID:       ${details.pid}`);
      console.log(`Memory:    ${formatMemory(details.memoryKb)}`);
      console.log(`Uptime:    ${details.uptime ?? 'n/a'}`);
      console.log(`Command:   ${details.command}`);
      console.log(`Folder:    ${details.projectRoot ?? details.cwd ?? 'n/a'}`);
      console.log(`URL:       ${details.url}`);
    });

  program
    .command('kill')
    .description('Kill whatever is listening on a port')
    .argument('<port>', 'Port number to kill')
    .action(async (portValue: string) => {
      const port = parsePort(portValue);
      const details = await findPort(port);

      if (details.isFree) {
        console.log(chalk.green(`Port ${port} is already free.`));
        return;
      }

      await terminateProcess(details.pid);
      console.log(chalk.green(`Stopped PID ${details.pid} on port ${port}.`));
    });

  program
    .command('open')
    .description('Open localhost for a port in the default browser')
    .argument('<port>', 'Port number to open')
    .action(async (portValue: string) => {
      const port = parsePort(portValue);
      await openInBrowser(port);
      console.log(chalk.green(`Opened http://localhost:${port}`));
    });

  program
    .command('edit')
    .description('Open the project folder for a port in Cursor or VS Code')
    .argument('<port>', 'Port number to open in the editor')
    .action(async (portValue: string) => {
      const port = parsePort(portValue);
      const details = await findPort(port);

      if (details.isFree || !details.projectRoot) {
        console.log(chalk.yellow(`Could not find a project folder for port ${port}.`));
        return;
      }

      const editor = await openInEditor(details.projectRoot);
      console.log(chalk.green(`Opened ${details.projectRoot} in ${editor}.`));
    });

  program.action(async () => {
    await startTui();
  });

  return program;
}

function parsePort(value: string): number {
  const port = Number(value);

  if (!Number.isInteger(port) || port <= 0) {
    throw new Error(`Invalid port: ${value}`);
  }

  return port;
}

export function renderTable(rows: PortProcess[]): string {
  const header = TABLE_COLUMNS.map((column) => chalk.bold(pad(column.label, column.width))).join(' ');
  const separator = TABLE_COLUMNS.map((column) => '-'.repeat(column.width)).join(' ');
  const body = rows.map(renderRow).join('\n');

  return [header, chalk.gray(separator), body].filter(Boolean).join('\n');
}

function renderRow(row: PortProcess): string {
  const values = {
    port: String(row.port),
    projectName: row.projectName,
    framework: row.framework,
    pid: String(row.pid),
    memory: formatMemory(row.memoryKb),
    uptime: row.uptime ?? 'n/a',
    command: row.command,
  };

  return TABLE_COLUMNS.map((column) => {
    const value = values[column.key as keyof typeof values];
    return pad(value, column.width);
  }).join(' ');
}
