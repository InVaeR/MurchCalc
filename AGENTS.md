# MurchCalc AGENTS.md

## Build and Verification

### Required Commands

- `npm install` – Install dependencies
- `npm run dev` – Start Vite development server
- `npm run build` – Build TypeScript and Vite production bundle
- `npm run lint` – Run ESLint on TypeScript source files
- `npm run typecheck` – Run TypeScript type checking (for strict type safety)
- `npm run test:run` – Run Vitest unit tests

### Build Order

When running quality checks, execute them in this order:

1. `npm run lint` – Static code analysis
2. `npm run typecheck` – Type safety verification
3. `npm run test:run` – Unit test execution

## Architecture

### Core Structure

The application follows a modular, plugin architecture:

- **src/core/engine/** – Core mathematical engine (lexer, parser, evaluator)
- **src/core/ModeRegistry.ts** – Mode registration system for plugins
- **src/core/types.ts** – Type definitions shared across all modules
- **src/modes/** – (PLANNED, not yet implemented) Pluggable calculator modes:
  - `text/` – Text mode calculator with multiline expressions and variables
  - `spreadsheet/` – Spreadsheet mode with cell formulas and dependency tracking
  - `basic/` – Basic calculator with button interface
- **src/ui/** – (PLANNED) UI components and layouts

### Key Modules

- **src/core/engine/** – Lexer, Parser, Evaluator, FunctionRegistry
- Evaluation context lives inside Evaluator for now.
- NOTE: src/modes/, src/ui/, src/storage/ are planned, not yet implemented.

### Mode Interface (for extension)

```typescript
interface CalculatorMode {
  id: string;
  title: string;
  icon: string;
  mount(container: HTMLElement, engine: Engine): void;
  unmount(): void;
  serialize(): unknown;
  deserialize(data: unknown): void;
}
```

New modes are registered via `ModeRegistry.register()` without modifying core code.

## Technical Details

### Core Engine Stack

- Uses `decimal.js` for precise decimal arithmetic (avoids floating-point errors)
- Custom recursive-descent parser with correct operator precedence
- Character-scanning lexer for tokenizing mathematical expressions
- Function registry for extendable operations (`sin`, `cos`, `sqrt`, etc.)

### Development Server

- Uses Vite with TypeScript module support
- No UI framework yet (vanilla DOM); Preact considered for later
- GitHub Pages deployment via CI/CD

## Development Workflow

### Running Tests

- All unit tests run with Vitest
- Tests focus on Lexer, Parser, Evaluator, and dependency resolution

### Technical Considerations

- The core engine is completely independent of UI (DOM-agnostic)
- All modes use the same core engine for calculations
- Strict TypeScript with no `any` type usage
- Components in `src/ui/components/` with one component per file
- Themes in `src/ui/theme/` as CSS modules

## Key Constraints

- Client-side only (GitHub Pages hosting, no server)
- Modular architecture allows easy addition of new modes
- Persistent storage via LocalStorage → IndexedDB migration path
- Timezone-independent development environment (no scheduled tasks)
- Built with ES2022+ JavaScript features
