const PREFIX = 'murchcalc:';
const VERSION = 1;

interface Envelope<T> {
  version: number;
  data: T;
}

export const LocalStore = {
  save<T>(key: string, data: T): void {
    try {
      const env: Envelope<T> = { version: VERSION, data };
      localStorage.setItem(PREFIX + key, JSON.stringify(env));
    } catch {
    }
  },

  load<T>(key: string): T | undefined {
    try {
      const raw = localStorage.getItem(PREFIX + key);
      if (!raw) return undefined;
      const env = JSON.parse(raw) as Envelope<T>;
      if (env.version !== VERSION) return undefined;
      return env.data;
    } catch {
      return undefined;
    }
  },
};
