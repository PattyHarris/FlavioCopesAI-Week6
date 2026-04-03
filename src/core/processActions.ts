import {constants} from 'node:fs';
import {access} from 'node:fs/promises';
import {execa} from 'execa';

export async function terminateProcess(pid: number): Promise<void> {
  process.kill(pid, 'SIGTERM');

  const stopped = await waitForExit(pid, 1000);
  if (!stopped) {
    process.kill(pid, 'SIGKILL');
  }
}

async function waitForExit(pid: number, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (!isRunning(pid)) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  return !isRunning(pid);
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export async function openInBrowser(port: number): Promise<void> {
  await execa('open', [`http://localhost:${port}`]);
}

export async function openInEditor(path: string): Promise<'cursor' | 'code'> {
  if (await isCommandAvailable('cursor')) {
    await execa('cursor', ['--reuse-window', path]);
    return 'cursor';
  }

  if (await isCommandAvailable('code')) {
    await execa('code', ['--reuse-window', path]);
    return 'code';
  }

  if (await canOpenApplication('Cursor')) {
    await execa('open', ['-a', 'Cursor', '--args', '--reuse-window', path]);
    return 'cursor';
  }

  if (await canOpenApplication('Visual Studio Code')) {
    await execa('open', ['-a', 'Visual Studio Code', '--args', '--reuse-window', path]);
    return 'code';
  }

  throw new Error(
    'Could not find Cursor or Visual Studio Code. Install one of them, or enable the `cursor` / `code` shell command.'
  );
}

async function isCommandAvailable(command: string): Promise<boolean> {
  try {
    await execa('which', [command], {stdio: 'ignore'});
    return true;
  } catch {
    try {
      await access(`/usr/local/bin/${command}`, constants.X_OK);
      return true;
    } catch {
      return false;
    }
  }
}

async function canOpenApplication(applicationName: string): Promise<boolean> {
  try {
    await execa('open', ['-Ra', applicationName]);
    return true;
  } catch {
    return false;
  }
}
