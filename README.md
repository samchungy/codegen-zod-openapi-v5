# codegen-zod-openapi-v5

A comprehensive command-line tool to help migrate codebases from zod-openapi v4 to v5.

## Features

This tool performs the following migrations automatically:

### 1. **Removes `extendZodWithOpenApi` imports and calls**

- Removes `extendZodWithOpenApi` from import statements
- Removes calls to `extendZodWithOpenApi(z)`

### 2. **Converts `.openapi()` to `.meta()`**

- Changes all `.openapi()` method calls to `.meta()`
- Works with all Zod types (string, object, array, union, etc.)

### 3. **Converts `ref` to `id` in metadata**

- Changes `ref: 'some-ref'` to `id: 'some-ref'` within `.meta()` calls
- Handles nested `ref` properties in `header` and `param` objects
- Recursively processes deeply nested objects
- Works with `ZodOpenApi*` type objects and `createDocument` calls

### 4. **Converts `refType` to `unusedIO` in metadata**

- Changes `refType: 'input'` to `unusedIO: 'input'` within `.meta()` calls
- Supports all refType values: 'input', 'output', 'both'

### 5. **Transforms `unionOneOf: true` to `override` function**

- Converts `unionOneOf: true` in `.meta()` calls to an `override` function
- Converts `unionOneOf: true` in `createDocument` options to an `override` function
- Converts `unionOneOf: true` in `createSchema` options to an `opts.override` function
- Merges with existing `defaultDateSchema` transformations when both are present

### 6. **Comments out `effectType` in `.meta()` calls**

- Adds `// TODO: effectType is not supported in v5` comment
- Preserves the original property for manual review

### 7. **Migrates `createSchema` options**

- Changes `schemaType` to `io`
- Changes `componentRefPath` to `schemaComponentRefPath`
- Changes `components` to `schemaComponents`
- Converts `defaultDateSchema` to `opts.override` function

### 8. **Migrates `createDocument` options**

- Converts `defaultDateSchema` to `override` function
- Merges with `unionOneOf` transformations when both are present

### 9. **Adds `return;` statements to override functions**

- Ensures all generated override functions have proper return statements

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
```

## Usage

```bash
# Basic usage - migrate all TypeScript files in src directory
node dist/index.js "src/**/*.ts"

# Dry run (preview changes without modifying files)
node dist/index.js "src/**/*.ts" --dry-run

# Verbose output
node dist/index.js "src/**/*.ts" --verbose

# Ignore specific patterns
node dist/index.js "src/**/*.ts" --ignore "src/test/**,src/generated/**"

# Combine options
node dist/index.js "src/**/*.ts" --dry-run --verbose --ignore "*.test.ts"
```

## Migration Examples

### Before Migration

```typescript
import { z } from "zod";
import {
  extendZodWithOpenApi,
  createDocument,
  createSchema,
} from "zod-openapi";

extendZodWithOpenApi(z);

// Basic schema transformations
const UserSchema = z
  .object({
    name: z.string().openapi({
      description: "User name",
      refType: "input",
    }),
    age: z.number().openapi({
      description: "User age",
      effectType: "input",
    }),
  })
  .openapi({
    ref: "User",
    unionOneOf: true,
  });

// Nested refs in header/param objects
const headerSchema = z.string().openapi({
  header: { ref: "registeredHeader" },
  param: { ref: "registeredParam" },
  description: "Complex nested refs",
});

// createSchema with various options
const schema = createSchema(z.date(), {
  schemaType: "input",
  componentRefPath: "#/components/schemas",
  components: { schemas: {} },
  defaultDateSchema: {
    type: "string",
    format: "date-time",
  },
  unionOneOf: true,
});

// createDocument with options
const document = createDocument(
  {
    openapi: "3.1.0",
    info: { title: "API", version: "1.0.0" },
    paths: {
      "/users": {
        ref: "registeredPath",
        get: {
          requestBody: {
            ref: "registeredRequestBody",
          },
        },
      },
    },
  },
  {
    unionOneOf: true,
    defaultDateSchema: {
      type: "string",
      format: "date-time",
    },
  }
);
```

### After Migration

```typescript
import { z } from "zod";
import { createDocument, createSchema } from "zod-openapi";

// Basic schema transformations
const UserSchema = z
  .object({
    name: z.string().meta({
      description: "User name",
      unusedIO: "input",
    }),
    age: z.number().meta({
      description: "User age",
      // TODO: effectType is not supported in v5
      // effectType: "input"
    }),
  })
  .meta({
    id: "User",
    override: ({ jsonSchema, zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
        return;
      }
    },
  });

// Nested refs in header/param objects
const headerSchema = z.string().meta({
  header: { id: "registeredHeader" },
  param: { id: "registeredParam" },
  description: "Complex nested refs",
});

// createSchema with various options
const schema = createSchema(z.date(), {
  io: "input",
  schemaComponentRefPath: "#/components/schemas",
  schemaComponents: { schemas: {} },
  opts: {
    override: ({ jsonSchema, zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
        return;
      }
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
        return;
      }
    },
  },
});

// createDocument with options
const document = createDocument(
  {
    openapi: "3.1.0",
    info: { title: "API", version: "1.0.0" },
    paths: {
      "/users": {
        id: "registeredPath",
        get: {
          requestBody: {
            id: "registeredRequestBody",
          },
        },
      },
    },
  },
  {
    override: ({ jsonSchema, zodSchema }) => {
      const def = zodSchema._zod.def;
      if (def.type === "union") {
        jsonSchema.oneOf = jsonSchema.anyOf;
        delete jsonSchema.anyOf;
        return;
      }
      if (def.type === "date") {
        jsonSchema.type = "string";
        jsonSchema.format = "date-time";
        return;
      }
    },
  }
);
```

## Options

- `--dry-run`, `-d`: Preview changes without modifying files
- `--verbose`, `-v`: Show detailed output for each file processed
- `--ignore <patterns>`: Comma-separated glob patterns to ignore

### Default Ignored Directories

The tool automatically ignores these common directories:

- `node_modules/`
- `dist/`
- `build/`
- `.git/`
- `.next/`
- `.nuxt/`
- `coverage/`

You can add additional patterns with the `--ignore` option.

## Output Statistics

The tool provides detailed statistics on all transformations:

```
📊 Summary:
  - Files processed: 5
  - Files modified: 3
  - Imports removed: 3
  - Extend calls removed: 3
  - openapi() → meta(): 15
  - ref → id changes: 8
  - refType → unusedIO changes: 4
  - unionOneOf → override changes: 2
  - effectType commented: 1
  - schemaType → io changes: 2
  - componentRefPath → schemaComponentRefPath changes: 1
  - components → schemaComponents changes: 1
  - createSchema unionOneOf → opts.override changes: 1
  - createSchema defaultDateSchema → opts.override changes: 2
  - defaultDateSchema → override changes: 1
```

## Supported File Types

- TypeScript (`.ts`, `.tsx`)
- JavaScript (`.js`, `.jsx`)

## Requirements

- Node.js 22+
- pnpm (recommended) or npm

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev "path/to/files/**/*.ts"

# Build
pnpm build

# Run tests
pnpm test
```

## Edge Cases Handled

- **Merging transformations**: When both `unionOneOf` and `defaultDateSchema` are present, they're merged into a single override function
- **Nested objects**: Recursively processes deeply nested `ref` properties
- **Mixed scenarios**: Handles files with multiple different transformation types
- **Existing overrides**: Preserves existing override functions when possible
- **Return statements**: Ensures all generated override functions have proper return statements

## License

MIT
