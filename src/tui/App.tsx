import React, { useEffect, useMemo, useState } from "react";
import { Box, Text, useApp, useInput } from "ink";
import { formatMemory, pad, truncate } from "../core/format.js";
import {
  openInBrowser,
  openInEditor,
  terminateProcess,
} from "../core/processActions.js";
import { scanPorts } from "../core/scanPorts.js";
import type { PortProcess } from "../core/types.js";

const REFRESH_INTERVAL_MS = 3000;
const PORT_PILOT_BLUE = "#008ae6";
const PORT_PILOT_BLUE_SELECTED = "#008ae6";
const PORT_PILOT_GRAY = "#4f6a6d";
const PORT_PILOT_GRAY_SELECTED = "#0a0a0a";
const PORT_PILOT_HEADING = "#0a0a0c";
const PORT_PILOT_RULE = "#0a0a0c";
const PORT_PILOT_FOOTER = "#000000";

const columns = [
  { key: "port", label: "PORT", width: 7 },
  { key: "projectName", label: "PROJECT", width: 20 },
  { key: "framework", label: "FRAMEWORK", width: 12 },
  { key: "pid", label: "PID", width: 8 },
  { key: "memory", label: "MEMORY", width: 10 },
  { key: "uptime", label: "UPTIME", width: 10 },
  { key: "command", label: "COMMAND", width: 20 },
] as const;

const sortModes = ["port", "memory", "uptime", "project"] as const;
const filterModes = ["all", "dev", "node"] as const;

type SortMode = (typeof sortModes)[number];
type FilterMode = (typeof filterModes)[number];

export function App() {
  const { exit } = useApp();
  const [rows, setRows] = useState<PortProcess[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [sortMode, setSortMode] = useState<SortMode>("port");
  const [filterMode, setFilterMode] = useState<FilterMode>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [pendingKill, setPendingKill] = useState<PortProcess | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("Scanning ports...");
  const [isBusy, setIsBusy] = useState(false);

  const applyRows = (nextRows: PortProcess[]) => {
    setRows(nextRows);
    setSelectedIndex((currentIndex) => {
      if (!nextRows.length) {
        return 0;
      }

      return Math.min(currentIndex, nextRows.length - 1);
    });
    setError(null);
    setMessage(
      `Watching ${nextRows.length} listening port${nextRows.length === 1 ? "" : "s"} · refreshes every 3s`,
    );
  };

  useEffect(() => {
    let cancelled = false;

    const refresh = async () => {
      try {
        const nextRows = await scanPorts();
        if (cancelled) {
          return;
        }

        applyRows(nextRows);
      } catch (refreshError) {
        if (!cancelled) {
          setError(
            refreshError instanceof Error
              ? refreshError.message
              : "Failed to scan ports",
          );
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

  const filteredRows = useMemo(() => {
    return rows.filter((row) => matchesFilter(row, filterMode));
  }, [filterMode, rows]);

  const searchedRows = useMemo(() => {
    return filteredRows.filter((row) => matchesSearch(row, searchQuery));
  }, [filteredRows, searchQuery]);

  const sortedRows = useMemo(() => {
    return [...searchedRows].sort((left, right) =>
      compareRows(left, right, sortMode),
    );
  }, [searchedRows, sortMode]);

  useEffect(() => {
    setSelectedIndex((currentIndex) => {
      if (!sortedRows.length) {
        return 0;
      }

      return Math.min(currentIndex, sortedRows.length - 1);
    });
  }, [sortedRows]);

  const selectedRow = sortedRows[selectedIndex] ?? null;
  const canOpenEditor = Boolean(selectedRow?.projectRoot);

  useInput(async (input, key) => {
    if (pendingKill) {
      if (input === "y" || input === "Y") {
        setIsBusy(true);
        try {
          await terminateProcess(pendingKill.pid);
          const nextRows = await scanPorts();
          applyRows(nextRows);
          setMessage(
            `Stopped PID ${pendingKill.pid} on port ${pendingKill.port}`,
          );
        } catch (killError) {
          setError(
            killError instanceof Error
              ? killError.message
              : "Failed to stop process",
          );
        } finally {
          setPendingKill(null);
          setIsBusy(false);
        }
        return;
      }

      if (input === "n" || input === "N" || key.escape) {
        setPendingKill(null);
        setMessage("Kill cancelled");
        return;
      }

      return;
    }

    if (isSearching) {
      if (key.escape || key.return) {
        setIsSearching(false);
        return;
      }

      if (key.backspace || key.delete) {
        setSearchQuery((currentQuery) => currentQuery.slice(0, -1));
        setSelectedIndex(0);
        return;
      }

      if (!key.ctrl && !key.meta && input.length === 1) {
        setSearchQuery((currentQuery) => `${currentQuery}${input}`);
        setSelectedIndex(0);
      }
      return;
    }

    if (key.upArrow || input === "k") {
      setSelectedIndex((currentIndex) => Math.max(0, currentIndex - 1));
      return;
    }

    if (key.downArrow || input === "j") {
      setSelectedIndex((currentIndex) =>
        Math.min(sortedRows.length - 1, currentIndex + 1),
      );
      return;
    }

    if (input === "s") {
      setSortMode((currentMode) => getNextSortMode(currentMode));
      return;
    }

    if (input === "f") {
      setFilterMode((currentMode) => getNextFilterMode(currentMode));
      setSelectedIndex(0);
      return;
    }

    if (input === "/") {
      setIsSearching(true);
      setSelectedIndex(0);
      return;
    }

    if (input === "r") {
      setIsBusy(true);
      try {
        setIsSearching(false);
        setSearchQuery("");
        setSelectedIndex(0);
        const nextRows = await scanPorts();
        applyRows(nextRows);
        setMessage(
          `Refreshed ${nextRows.length} listening port${nextRows.length === 1 ? "" : "s"} and cleared search`,
        );
      } catch (refreshError) {
        setError(
          refreshError instanceof Error
            ? refreshError.message
            : "Failed to refresh ports",
        );
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (input === "q") {
      exit();
      return;
    }

    if (!selectedRow || isBusy) {
      return;
    }

    if (input === "K") {
      setPendingKill(selectedRow);
      setMessage(
        `Confirm kill for PID ${selectedRow.pid} on port ${selectedRow.port}`,
      );
      return;
    }

    if (input === "o") {
      setIsBusy(true);
      try {
        await openInBrowser(selectedRow.port);
        setMessage(`Opened ${selectedRow.url}`);
      } catch (openError) {
        setError(
          openError instanceof Error
            ? openError.message
            : "Failed to open browser",
        );
      } finally {
        setIsBusy(false);
      }
      return;
    }

    if (input === "e") {
      if (!selectedRow.projectRoot) {
        setError(
          `No project root detected for port ${selectedRow.port}. Port Pilot only opens folders when it finds a package.json.`,
        );
        return;
      }

      setIsBusy(true);
      try {
        const editor = await openInEditor(selectedRow.projectRoot);
        setMessage(`Opened ${selectedRow.projectRoot} in ${editor}`);
      } catch (editorError) {
        setError(
          editorError instanceof Error
            ? editorError.message
            : "Failed to open editor",
        );
      } finally {
        setIsBusy(false);
      }
    }
  });

  const tableLines = useMemo(() => {
    return sortedRows.map((row, index) => ({
      key: `${row.pid}-${row.port}`,
      text: renderRow(row, index === selectedIndex),
      color: getRowColor(row, index === selectedIndex),
    }));
  }, [selectedIndex, sortedRows]);

  return (
    <Box flexDirection="column" paddingX={1}>
      <Box>
        <Box flexGrow={1}>
          <Text color={PORT_PILOT_HEADING} bold>
            Port Pilot
          </Text>
        </Box>
        <Box marginRight={4}>
          <Text color={PORT_PILOT_GRAY_SELECTED} bold>
            Filter: {getFilterLabel(filterMode)}   Sort: {getSortLabel(sortMode)}
          </Text>
        </Box>
      </Box>
      <Text color="gray">{message}</Text>
      <Text> </Text>
      {error ? <Text color="red">Error: {error}</Text> : null}
      <Box marginTop={1} flexDirection="column">
        <Text color={PORT_PILOT_HEADING} bold>
          USAGE
        </Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>
          {" "}
          Use ↑/↓ or j/k to move through listening ports.
        </Text>
        <Text color={PORT_PILOT_HEADING} bold>
          FLAGS
        </Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>  -h, --help        help for ports</Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>  -v, --version     version for ports</Text>
        <Text color={PORT_PILOT_RULE}>{"─".repeat(78)}</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={PORT_PILOT_HEADING} bold>
          SEARCH
        </Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>
          {getSearchPrompt(searchQuery, isSearching)}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={PORT_PILOT_HEADING} bold>
          {columns.map((column) => pad(column.label, column.width)).join(" ")}
        </Text>
        <Text color={PORT_PILOT_RULE}>
          {columns.map((column) => "─".repeat(column.width)).join(" ")}
        </Text>
        {tableLines.length ? (
          tableLines.map((line) => (
            <Text key={line.key} color={line.color}>
              {line.text}
            </Text>
          ))
        ) : (
          <Text color="yellow">
            {searchQuery
              ? "No listening TCP ports match the current search."
              : "No listening TCP ports found."}
          </Text>
        )}
      </Box>
      <Box marginTop={1} flexDirection="column">
        {selectedRow ? (
          <>
            <Text color="green">
              Selected {selectedRow.port} ·{" "}
              {truncate(
                selectedRow.projectRoot ??
                  selectedRow.cwd ??
                  "No working directory found",
                80,
              )}
            </Text>
            <Text
              color={
                canOpenEditor
                  ? PORT_PILOT_BLUE_SELECTED
                  : PORT_PILOT_GRAY_SELECTED
              }
            >
              {canOpenEditor
                ? `Project detected · e opens ${truncate(selectedRow.projectRoot ?? "", 70)}`
                : "No project root detected · e is unavailable for this process"}
            </Text>
          </>
        ) : null}
        {pendingKill ? (
          <Text color={PORT_PILOT_GRAY_SELECTED}>
            Confirm kill for port {pendingKill.port} ({pendingKill.command}, PID {pendingKill.pid})? [y/N]
          </Text>
        ) : null}
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text color={PORT_PILOT_RULE}>{"─".repeat(78)}</Text>
        <Text color={PORT_PILOT_GRAY_SELECTED}>
          <Text color={PORT_PILOT_HEADING} bold>
            [K]
          </Text>
          <Text color={PORT_PILOT_FOOTER}> Kill </Text>
          <Text color={PORT_PILOT_HEADING} bold>
            [o]
          </Text>
          <Text color={PORT_PILOT_FOOTER}> Browser </Text>
          <Text
            color={
              canOpenEditor ? PORT_PILOT_BLUE_SELECTED : PORT_PILOT_HEADING
            }
            bold
          >
            [e]
          </Text>
          <Text color={PORT_PILOT_FOOTER}> Editor </Text>
          <Text color={PORT_PILOT_HEADING} bold>
            [f]
          </Text>
          <Text color={PORT_PILOT_FOOTER}>
            {" "}
            Filter:{getFilterLabel(filterMode)}{" "}
          </Text>
          <Text color={PORT_PILOT_HEADING} bold>
            [s]
          </Text>
          <Text color={PORT_PILOT_FOOTER}>
            {" "}
            Sort:{getSortLabel(sortMode)}{" "}
          </Text>
          <Text color={PORT_PILOT_HEADING} bold>
            [/]
          </Text>
          <Text color={PORT_PILOT_FOOTER}> Search </Text>
          <Text color={PORT_PILOT_HEADING} bold>
            [r]
          </Text>
          <Text color={PORT_PILOT_FOOTER}> Refresh </Text>
          <Text color={PORT_PILOT_HEADING} bold>
            [q]
          </Text>
          <Text color={PORT_PILOT_FOOTER}> Quit</Text>
        </Text>
      </Box>
    </Box>
  );
}

function renderRow(row: PortProcess, selected: boolean): string {
  const prefix = selected ? "›" : " ";
  const values = [
    pad(String(row.port), 7),
    pad(row.projectName, 20),
    pad(row.framework, 12),
    pad(String(row.pid), 8),
    pad(formatMemory(row.memoryKb), 10),
    pad(row.uptime ?? "n/a", 10),
    pad(row.command, 20),
  ];

  return `${prefix} ${values.join(" ")}`;
}

function getRowColor(row: PortProcess, selected: boolean): string {
  if (selected) {
    return row.projectRoot
      ? PORT_PILOT_BLUE_SELECTED
      : PORT_PILOT_GRAY_SELECTED;
  }

  return row.projectRoot ? PORT_PILOT_BLUE : PORT_PILOT_GRAY;
}

function getNextSortMode(currentMode: SortMode): SortMode {
  const currentIndex = sortModes.indexOf(currentMode);
  return sortModes[(currentIndex + 1) % sortModes.length];
}

function getNextFilterMode(currentMode: FilterMode): FilterMode {
  const currentIndex = filterModes.indexOf(currentMode);
  return filterModes[(currentIndex + 1) % filterModes.length];
}

function getSortLabel(sortMode: SortMode): string {
  switch (sortMode) {
    case "memory":
      return "Memory";
    case "uptime":
      return "Uptime";
    case "project":
      return "Project";
    case "port":
    default:
      return "Port";
  }
}

function getFilterLabel(filterMode: FilterMode): string {
  switch (filterMode) {
    case "dev":
      return "Dev Ports";
    case "node":
      return "Node Only";
    case "all":
    default:
      return "All Ports";
  }
}

function getSearchPrompt(searchQuery: string, isSearching: boolean): string {
  if (isSearching && !searchQuery) {
    return "/ Type to search ports, project, framework, or command";
  }

  if (searchQuery) {
    return `/ ${searchQuery}`;
  }

  return "  Type / to search ports, project, framework, or command";
}

function matchesFilter(row: PortProcess, filterMode: FilterMode): boolean {
  switch (filterMode) {
    case "dev":
      return row.port >= 3000 && row.port <= 9999;
    case "node":
      return row.framework !== "Unknown" || isNodeLikeCommand(row.command);
    case "all":
    default:
      return true;
  }
}

function matchesSearch(row: PortProcess, searchQuery: string): boolean {
  const normalizedQuery = searchQuery.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  const haystack = [
    String(row.port),
    row.projectName,
    row.framework,
    row.command,
    row.cwd ?? "",
    row.projectRoot ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return haystack.includes(normalizedQuery);
}

function isNodeLikeCommand(command: string): boolean {
  const normalizedCommand = command.trim().toLowerCase();
  return ["node", "deno", "bun"].some(
    (runtime) =>
      normalizedCommand === runtime || normalizedCommand.startsWith(`${runtime} `),
  );
}

function compareRows(
  left: PortProcess,
  right: PortProcess,
  sortMode: SortMode,
): number {
  switch (sortMode) {
    case "memory":
      return (
        compareNumbers(right.memoryKb ?? -1, left.memoryKb ?? -1) ||
        compareNumbers(left.port, right.port)
      );
    case "uptime":
      return (
        compareNumbers(
          parseElapsedTimeToSeconds(right.uptime),
          parseElapsedTimeToSeconds(left.uptime),
        ) || compareNumbers(left.port, right.port)
      );
    case "project":
      return (
        left.projectName.localeCompare(right.projectName, undefined, {
          sensitivity: "base",
        }) || compareNumbers(left.port, right.port)
      );
    case "port":
    default:
      return compareNumbers(left.port, right.port);
  }
}

function compareNumbers(left: number, right: number): number {
  return left - right;
}

function parseElapsedTimeToSeconds(value: string | null): number {
  if (!value) {
    return -1;
  }

  const [dayPart, timePart] = value.includes("-")
    ? value.split("-", 2)
    : [null, value];
  const timeSegments = timePart.split(":").map((segment) => Number(segment));

  if (timeSegments.some((segment) => Number.isNaN(segment))) {
    return -1;
  }

  let seconds = 0;

  if (dayPart !== null) {
    const days = Number(dayPart);
    if (Number.isNaN(days)) {
      return -1;
    }

    seconds += days * 24 * 60 * 60;
  }

  if (timeSegments.length === 3) {
    const [hours, minutes, secs] = timeSegments;
    seconds += hours * 60 * 60 + minutes * 60 + secs;
    return seconds;
  }

  if (timeSegments.length === 2) {
    const [minutes, secs] = timeSegments;
    seconds += minutes * 60 + secs;
    return seconds;
  }

  return -1;
}
