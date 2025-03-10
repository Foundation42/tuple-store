# CLAUDE.md - Development Guide for Tuple-Store

## Build Commands
- Run tests: `bun test`
- Run single test: `bun test src/tests/tuple-store.test.ts --test="test name"`
- Debug tests: `bun --inspect-brk --test`
- Run example: `bun src/example.ts`

## Style Guidelines
- **TypeScript**: Use strict mode with explicit return types
- **Naming**: Classes in PascalCase, methods/variables in camelCase
- **Interfaces**: Located in TupleStore.ts, extended through inheritance 
- **Code Structure**: Core functionality in base classes, extended through composition
- **Documentation**: JSDoc comments for all public methods and classes
- **Modules**: ESM format (import/export) with TypeScript
- **Error Handling**: Return boolean success status from operations, undefined for missing values

## Import Style
```typescript
import { TupleStore, TupleStoreOptions } from './TupleStore.ts';
```

## Project Structure
- Core implementations in src/ directory
- Tests in src/tests/ directory
- Interfaces in TupleStore.ts