import {access, readFile} from 'node:fs/promises';
import path from 'node:path';
import {execa} from 'execa';
import type {FrameworkName, PortDetails, PortProcess} from './types.js';

interface PackageJson {
  name?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

const FRAMEWORK_MAP: Array<{packages: string[]; framework: FrameworkName}> = [
  {packages: ['next'], framework: 'Next.js'},
  {packages: ['astro'], framework: 'Astro'},
  {packages: ['vite'], framework: 'Vite'},
  {packages: ['@remix-run/dev', '@remix-run/react'], framework: 'Remix'},
  {packages: ['nuxt'], framework: 'Nuxt'},
  {packages: ['@sveltejs/kit'], framework: 'SvelteKit'},
  {packages: ['@angular/core', '@angular/cli'], framework: 'Angular'},
];

export async function scanPorts(): Promise<PortProcess[]> {
  const {stdout} = await execa('lsof', ['-iTCP', '-sTCP:LISTEN', '-P', '-n', '-Fpcn']);
  const rawRows = parseLsofRecords(stdout);

  const uniqueRows = dedupeRows(rawRows);
  const processes = await Promise.all(uniqueRows.map(enrichProcess));

  return processes.sort((left, right) => left.port - right.port);
}

export async function findPort(port: number): Promise<PortDetails> {
  const processes = await scanPorts();
  const match = processes.find((processItem) => processItem.port === port);

  if (!match) {
    return {
      isFree: true,
      port,
      pid: 0,
      command: 'n/a',
      cwd: null,
      projectRoot: null,
      projectName: 'Free',
      framework: 'Unknown',
      memoryKb: null,
      uptime: null,
      url: `http://localhost:${port}`,
    };
  }

  return {
    ...match,
    isFree: false,
  };
}

async function enrichProcess(item: {command: string; pid: number; port: number}): Promise<PortProcess> {
  const [cwd, metrics] = await Promise.all([getCwd(item.pid), getProcessMetrics(item.pid)]);
  const projectInfo = cwd ? await findProjectInfo(cwd) : null;

  return {
    port: item.port,
    pid: item.pid,
    command: item.command,
    cwd,
    projectRoot: projectInfo?.root ?? null,
    projectName: projectInfo?.name ?? inferProjectName(cwd, item.command),
    framework: projectInfo?.framework ?? 'Unknown',
    memoryKb: metrics.memoryKb,
    uptime: metrics.uptime,
    url: `http://localhost:${item.port}`,
  };
}

function parseLsofRecords(stdout: string): Array<{command: string; pid: number; port: number}> {
  const records: Array<{command: string; pid: number; port: number}> = [];
  let currentPid: number | null = null;
  let currentCommand: string | null = null;

  for (const line of stdout.split('\n')) {
    if (!line) {
      continue;
    }

    const field = line[0];
    const value = line.slice(1);

    if (field === 'p') {
      currentPid = Number(value);
      currentCommand = null;
      continue;
    }

    if (field === 'c') {
      currentCommand = decodeLsofValue(value);
      continue;
    }

    if (field === 'n' && currentPid !== null) {
      const portMatch = value.match(/:([0-9]+)$/);
      if (!portMatch) {
        continue;
      }

      records.push({
        command: currentCommand ?? 'unknown',
        pid: currentPid,
        port: Number(portMatch[1]),
      });
    }
  }

  return records;
}

function decodeLsofValue(value: string): string {
  return value.replace(/\\x([0-9a-fA-F]{2})/g, (_, hex: string) => {
    return String.fromCharCode(Number.parseInt(hex, 16));
  });
}

function dedupeRows(items: Array<{command: string; pid: number; port: number}>): Array<{command: string; pid: number; port: number}> {
  const seen = new Set<string>();

  return items.filter((item) => {
    const key = `${item.pid}:${item.port}`;
    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

async function getCwd(pid: number): Promise<string | null> {
  try {
    const {stdout} = await execa('lsof', ['-a', '-p', String(pid), '-d', 'cwd', '-Fn']);
    const line = stdout.split('\n').find((entry) => entry.startsWith('n'));
    return line ? line.slice(1) : null;
  } catch {
    return null;
  }
}

async function getProcessMetrics(pid: number): Promise<{memoryKb: number | null; uptime: string | null}> {
  try {
    const {stdout} = await execa('ps', ['-o', 'rss=,etime=', '-p', String(pid)]);
    const trimmed = stdout.trim();
    if (!trimmed) {
      return {memoryKb: null, uptime: null};
    }

    const match = trimmed.match(/^(\d+)\s+(.+)$/);
    if (!match) {
      return {memoryKb: null, uptime: trimmed};
    }

    return {
      memoryKb: Number(match[1]),
      uptime: match[2].trim(),
    };
  } catch {
    return {memoryKb: null, uptime: null};
  }
}

async function findProjectInfo(startDir: string): Promise<{root: string; name: string; framework: FrameworkName} | null> {
  let currentDir = startDir;

  while (true) {
    const packagePath = path.join(currentDir, 'package.json');

    if (await exists(packagePath)) {
      try {
        const contents = await readFile(packagePath, 'utf8');
        const packageJson = JSON.parse(contents) as PackageJson;
        return {
          root: currentDir,
          name: packageJson.name ?? path.basename(currentDir),
          framework: detectFramework(packageJson),
        };
      } catch {
        return {
          root: currentDir,
          name: path.basename(currentDir),
          framework: 'Unknown',
        };
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      return null;
    }

    currentDir = parentDir;
  }
}

function detectFramework(packageJson: PackageJson): FrameworkName {
  const deps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies,
  };

  for (const entry of FRAMEWORK_MAP) {
    if (entry.packages.some((packageName) => packageName in deps)) {
      return entry.framework;
    }
  }

  return 'Unknown';
}

function inferProjectName(cwd: string | null, command: string): string {
  if (cwd) {
    return path.basename(cwd) || cwd;
  }

  return command;
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}
