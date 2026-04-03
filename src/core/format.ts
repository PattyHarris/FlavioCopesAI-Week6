const KB_IN_MB = 1024;
const KB_IN_GB = KB_IN_MB * 1024;

export function formatMemory(memoryKb: number | null): string {
  if (memoryKb === null || Number.isNaN(memoryKb)) {
    return 'n/a';
  }

  if (memoryKb >= KB_IN_GB) {
    return `${(memoryKb / KB_IN_GB).toFixed(1)} GB`;
  }

  if (memoryKb >= KB_IN_MB) {
    return `${(memoryKb / KB_IN_MB).toFixed(1)} MB`;
  }

  return `${memoryKb} KB`;
}

export function truncate(value: string, maxWidth: number): string {
  if (value.length <= maxWidth) {
    return value;
  }

  if (maxWidth <= 1) {
    return value.slice(0, maxWidth);
  }

  return `${value.slice(0, maxWidth - 1)}…`;
}

export function pad(value: string, width: number): string {
  return truncate(value, width).padEnd(width, ' ');
}
