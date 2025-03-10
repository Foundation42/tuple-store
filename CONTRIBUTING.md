# Contributing to tuple-store

Thank you for considering contributing to tuple-store! This document outlines some guidelines to help you get started.

## Development Workflow

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YourUsername/tuple-store.git`
3. Install dependencies: `bun install`
4. Make your changes
5. Run tests: `bun test`
6. Commit your changes
7. Push to your fork
8. Open a pull request

## Project Structure

- `src/`: Source code
  - `CoreTupleStore.ts`: Core implementation
  - `JournaledTupleStore.ts`: Journaling decorator
  - `ObservableTupleStore.ts`: Subscription decorator
  - `TupleStore.ts`: Interface definitions
  - `factory.ts`: Factory functions
  - `tests/`: Test cases

## Coding Standards

- Use TypeScript with strict mode
- Document public methods with JSDoc comments
- Write tests for new functionality
- Follow existing code style and patterns
- Use decorator pattern for extending functionality

## Testing

Run tests with:

```bash
bun test
```

For debugging tests:

```bash
bun --inspect-brk --test
```

## Pull Request Guidelines

- Keep PRs focused on a single change
- Add tests for new functionality
- Update documentation as needed
- Describe your changes in the PR description
- Reference any relevant issues

## License

By contributing to tuple-store, you agree that your contributions will be licensed under the project's MIT license.