import React from 'react';
import {render} from 'ink';
import {createProgram} from './cli.js';
import {App} from './tui/App.js';

async function main(): Promise<void> {
  const program = createProgram(startTui);

  try {
    await program.parseAsync(process.argv);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error(message);
    process.exitCode = 1;
  }
}

async function startTui(): Promise<void> {
  render(<App />);
}

void main();
