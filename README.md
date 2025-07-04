# codegen-zod-openapi-v5

A command-line tool to help migrate codebases from zod-openapi v4 to v5.

## Features

This tool performs th// ZodOpenApi type objects
const response: ZodOpenApiResponseObject = {
description: '200 OK',
content: {
'application/json': {
schema: z.object({ a: z.string() }),
},
},
id: 'some-response',
};

// createDocument calls
const document = createDocument({
openapi: '3.1.0',
paths: {
'/users': {
id: 'registeredPath',
get: {
requestBody: {
id: 'registeredRequestBody',
content: {
'application/json': {
schema: z.object({ name: z.string() }).meta({ id: 'UserSchema' })
}
}
}
}
}
}
});

````migrations:

1. **Removes `extendZodWithOpenApi` imports and calls**

   - Removes `extendZodWithOpenApi` from import statements
   - Removes calls to `extendZodWithOpenApi(z)`

2. **Converts `.openapi()` to `.meta()`**

   - Changes all `.openapi()` method calls to `.meta()`
   - Works with all Zod types (string, object, array, etc.)

3. **Converts `ref` to `id` in metadata**
   - Changes `ref: 'some-ref'` to `id: 'some-ref'` within `.meta()` calls
   - Handles nested `ref` properties in `header` and `param` objects
   - Recursively processes deeply nested objects

4. **Converts `refType` to `unusedIO` in metadata**
   - Changes `refType: 'input'` to `unusedIO: 'input'` within `.meta()` calls
   - Supports all refType values: 'input', 'output', 'both'

## Installation

```bash
# Install dependencies
pnpm install

# Build the project
pnpm build
````

## Usage

```bash
# Basic usage - migrate all TypeScript files in src directory
npx tsx src/index.ts "src/**/*.ts"

# Or after building
node dist/index.js "src/**/*.ts"

# Dry run (preview changes without modifying files)
npx tsx src/index.ts "src/**/*.ts" --dry-run

# Verbose output
npx tsx src/index.ts "src/**/*.ts" --verbose

# Ignore specific patterns
npx tsx src/index.ts "src/**/*.ts" --ignore "src/test/**,src/generated/**"
```

4. **Converts `refType` to `unusedIO` in metadata**
   - Changes `refType: 'input'` to `unusedIO: 'input'` within `.meta()` calls
   - Supports all refType values: 'input', 'output', 'both'

5. **Converts `ref` to `id` in `ZodOpenApi*` type objects**

   - Changes `ref` to `id` in `ZodOpenApiResponseObject`, `ZodOpenApiCallbackObject`, etc.
   - Only transforms top-level `ref` properties in these type-annotated objects

5. **Converts `ref` to `id` in `createDocument` calls**
   - Transforms `ref` properties in object literals passed to `createDocument`
   - Handles deeply nested OpenAPI specification objects
   - Works with paths, requestBody, responses, callbacks, etc.

## Migration Examples

### Before Migration

```typescript
import { z } from "zod";
import { extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

const UserSchema = z
  .object({
    name: z.string().openapi({ description: "User name" }),
    age: z.number().openapi({ description: "User age" }),
  })
  .openapi({ ref: "User" });

const UserListSchema = z.array(UserSchema).openapi({
  description: "List of users",
  ref: "UserList",
});

// Nested refs in header/param objects
const headerSchema = z.string().openapi({
  header: { ref: "registeredHeader" },
  description: "Header with registered ref",
});

const paramSchema = z.string().openapi({
  param: { ref: "registeredParam" },
  description: "Param with registered ref",
});

// ZodOpenApi type objects
const response: ZodOpenApiResponseObject = {
  description: "200 OK",
  content: {
    "application/json": {
      schema: z.object({ a: z.string() }),
    },
  },
  ref: "some-response",
};
```

### After Migration

```typescript
import { z } from "zod";

const UserSchema = z
  .object({
    name: z.string().meta({ description: "User name" }),
    age: z.number().meta({ description: "User age" }),
  })
  .meta({ id: "User" });

const UserListSchema = z.array(UserSchema).meta({
  description: "List of users",
  id: "UserList",
});

// Nested refs in header/param objects
const headerSchema = z.string().meta({
  header: { id: "registeredHeader" },
  description: "Header with registered ref",
});

const paramSchema = z.string().meta({
  param: { id: "registeredParam" },
  description: "Param with registered ref",
});

// ZodOpenApi type objects
const response: ZodOpenApiResponseObject = {
  description: "200 OK",
  content: {
    "application/json": {
      schema: z.object({ a: z.string() }),
    },
  },
  id: "some-response",
};
```

## Options

- `--dry-run`, `-d`: Preview changes without modifying files
- `--verbose`, `-v`: Show detailed output for each file processed
- `--ignore <patterns>`: Comma-separated glob patterns to ignore

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

## License

MIT
