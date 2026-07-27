/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config';

export default defineConfig({
  base: '/MurchCalc/',
  test: {
    globals: true,
    environment: 'node',
  },
});
