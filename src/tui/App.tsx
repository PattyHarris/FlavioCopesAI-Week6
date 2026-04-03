import React, {useEffect, useMemo, useState} from 'react';
import {Box, Text, useApp, useInput} from 'ink';
import {formatMemory, pad, truncate} from '../core/format.js';
import {openInBrowser, openInEditor, terminateProcess} from '../core/processActions.js';
import {scanPorts} from '../core/scanPorts.js';
import type {PortProcess} from '../core/types.js';

const REFRESH_INTERVAL_MS = 3000;
const PORT_PILOT_BLUE = '#4A9FD6';
const PORT_PILOT_BLUE_SELECTED = '#2F6F96';
const PORT_PILOT_GRAY = '#B1B2B2';
const PORT_PILOT_GRAY_SELECTED = '#3D3F43';
const PORT_PILOT_HEADING = '#1F2937';
const PORT_PILOT_RULE = '#D1D5DB';

const columns = [
  {key: 'port', label: 'PORT', width: 7},
  {key: 'projectName', label: 'PROJECT', width: 20},
  {key: 'framework', label: 'FRAMEWORK', width: 12},
  {key: 'pid', label: 'PID', width: 8},
  {key: 'memory', label: 'MEMORY', width: 10},
  {key: 'uptime', label: 'UPTIME', width: 10},
  {key: 'command', label: 'COMMAND', width: 20},
] as const;

export function App() {
  const {exit} = useApp();
  const [rows, setRows] = useState<PortProcess[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState('Scanning ports...');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const nextRows = await scanPorts();
        if (cancelled) {
          return;
        }

        setRows(nextRows);
        setSelectedIndex((currentIndex) => {
          if (!nextRows.length) {
            return 0;
          }

          return Math.min(currentIndex, nextRows.length - 1);
        });
        setError(null);
        setMessage(`Watching ${nextRows.length} listening port${nextRows.length === 1 ? '' : 's'} · refreshes every 3s`);
      } catch (refreshError) {
        if (!cancelled) {
          setError(refreshError instanceof Error ? refreshError.message : 'Failed to scan ports');
        }
      }
    };

    void refresh();
    const interval = setInterval(() => {
      void refresh();
    }, REFRESH_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const selectedRow = rows[selectedIndex] ?? null;
  const canOpenEditor = Boolean(selectedRow?.projectRoot);

  useInput(async (input, key) => {
    if (key.upArrow || input === 'k') {
      setSelectedIndex((currentIndex) => Math.max(0, currentIndex - 1));
      return;
    }

    if (key.downArrow || input === 'j') {
      setSelectedIndex((currentIndex) => Math.min(rows.length - 1, currentIndex + 1));
      return;
    }

    if (input === 'q') {
      exit();
      return;
    }

    if (!selectedRow || isBusy) {
      return;
    }

    if (input === 'K') {
      setIsBusy(true);
      try {
        await terminateProcess(selectedRow.pid);
        setMessage(`Stopped PID ${selectedRow.pid} on port ${selectedRow.port}`);
        const nextRows = await scanPorts();
        setRows(nextRows);
        setSelectedIndex((currentIndex) => Math.min(currentIndex, Math.max(0, nextRows.length - 1)));
      } catch (killError) {
        setError(killError instanceof Error ? killError.message : 'Failed to stop process');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (input === 'o') {
      setIsBusy(true);
      try {
        await openInBrowser(selectedRow.port);
        setMessage(`Opened ${selectedRow.url}`);
      } catch (openError) {
        setError(openError instanceof Error ? openError.message : 'Failed to open browser');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (input === 'e') {
      if (!selectedRow.projectRoot) {
        setError(`No project root detected for port ${selectedRow.port}. Port Pilot only opens folders when it finds a package.json.`);
        return;
      }

      setIsBusy(true);
      try {
        const editor = await openInEditor(selectedRow.projectRoot);
        setMessage(`Opened ${selectedRow.projectRoot} in ${editor}`);
      } catch (editorError) {
        setError(editorError instanceof Error ? editorError.message : 'Failed to open editor');
      } finally {
        setIsBusy(false);
      }
    }
  });

  const tableLines = useMemo(() => {
    return rows.map((row, index) => ({
      key: `${row.pid}-${row.port}`,
      text: renderRow(row, index === selectedIndex),
      color: getRowColor(row, index === selectedIndex),
    }));
  }, [rows, selectedIndex]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Text color={PORT_PILOT_HEADING} bold>
        Port Pilot
      </Text>
      <Text color="gray">{message}</Text>
      {error ? <Text color="red">Error: {error}</Text> : null}
      <Box marginTop={1} flexDirection="column">
        <Text color={PORT_PILOT_HEADING} bold>
          USAGE
        </Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>  Use ↑/↓ or j/k to move through listening ports.</Text>
        <Text color={PORT_PILOT_HEADING} bold>
          AVAILABLE COMMANDS
        </Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>  K kill process   o open localhost   e open project folder   q quit</Text>
        <Text color={PORT_PILOT_HEADING} bold>
          FLAGS
        </Text>
        <Text>
          <Text color={PORT_PILOT_BLUE} bold>
             Blue
          </Text>
          <Text color={PORT_PILOT_GRAY_SELECTED}> rows support </Text>
          <Text color={PORT_PILOT_BLUE_SELECTED} bold>
            e
          </Text>
          <Text color={PORT_PILOT_GRAY_SELECTED}>   Selected rows use a darker highlight</Text>
        </Text>
        <Text color={PORT_PILOT_RULE}>{'─'.repeat(78)}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={PORT_PILOT_HEADING} bold>
          {columns.map((column) => pad(column.label, column.width)).join(' ')}
        </Text>
        <Text color={PORT_PILOT_RULE}>{columns.map((column) => '─'.repeat(column.width)).join(' ')}</Text>
        {tableLines.length ? (
          tableLines.map((line) => (
            <Text key={line.key} color={line.color}>
              {line.text}
            </Text>
          ))
        ) : (
          <Text color="yellow">No listening TCP ports found.</Text>
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        {selectedRow ? (
          <>
            <Text color="green">
              Selected {selectedRow.port} · {truncate(selectedRow.projectRoot ?? selectedRow.cwd ?? 'No working directory found', 80)}
            </Text>
            <Text color={canOpenEditor ? PORT_PILOT_BLUE_SELECTED : PORT_PILOT_GRAY_SELECTED}>
              {canOpenEditor
                ? `Project detected · e opens ${truncate(selectedRow.projectRoot ?? '', 70)}`
                : 'No project root detected · e is unavailable for this process'}
            </Text>
          </>
        ) : null}
      </Box>
    </Box>
  );
}

function renderRow(row: PortProcess, selected: boolean): string {
  const prefix = selected ? '›' : ' ';
  const values = [
    pad(String(row.port), 7),
    pad(row.projectName, 20),
    pad(row.framework, 12),
    pad(String(row.pid), 8),
    pad(formatMemory(row.memoryKb), 10),
    pad(row.uptime ?? 'n/a', 10),
    pad(row.command, 20),
  ];

  return `${prefix} ${values.join(' ')}`;
}

function getRowColor(row: PortProcess, selected: boolean): string {
  if (selected) {
    return row.projectRoot ? PORT_PILOT_BLUE_SELECTED : PORT_PILOT_GRAY_SELECTED;
  }

  return row.projectRoot ? PORT_PILOT_BLUE : PORT_PILOT_GRAY;
}
