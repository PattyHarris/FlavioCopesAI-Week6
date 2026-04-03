export type FrameworkName =
  | 'Next.js'
  | 'Astro'
  | 'Vite'
  | 'Remix'
  | 'Nuxt'
  | 'SvelteKit'
  | 'Angular'
  | 'Unknown';

export interface PortProcess {
  port: number;
  pid: number;
  command: string;
  cwd: string | null;
  projectRoot: string | null;
  projectName: string;
  framework: FrameworkName;
  memoryKb: number | null;
  uptime: string | null;
  url: string;
}

export interface PortDetails extends PortProcess {
  isFree: boolean;
}
