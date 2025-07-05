import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ZodOpenApiMigrator } from "./migrator";
import * as fs from "fs";
import * as path from "path";
import { tmpdir } from "os";

describe("ZodOpenApiMigrator - Basic Tests", () => {
  let migrator: ZodOpenApiMigrator;
  let tempDir: string;

  beforeEach(() => {
    migrator = new ZodOpenApiMigrator();
    tempDir = fs.mkdtempSync(path.join(tmpdir(), "zod-migration-test-"));
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
  });

  const createTestFile = (filename: string, content: string): string => {
    const filePath = path.join(tempDir, filename);
    fs.writeFileSync(filePath, content);
    return filePath;
  };

  it("should remove side-effect imports from zod-openapi/extend", async () => {
    const content = `
import 'zod-openapi/extend';
import { z } from 'zod';

const schema = z.string().openapi({ description: 'test' });
`;

    const filePath = createTestFile("test.ts", content);
    const result = await migrator.migrate(filePath);

    const migratedContent = fs.readFileSync(filePath, "utf8");

    expect(result.importsRemoved).toBe(1);
    expect(migratedContent).not.toContain("import 'zod-openapi/extend'");
    expect(migratedContent).toContain('import * as z from "zod/v4"');
    expect(migratedContent).toContain(".meta(");
  });

  it("should remove extendZodWithOpenApi from imports", async () => {
    const content = `
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);
`;

    const filePath = createTestFile("test.ts", content);
    const result = await migrator.migrate(filePath);

    const migratedContent = fs.readFileSync(filePath, "utf8");

    expect(result.importsRemoved).toBe(1);
    expect(result.extendCallsRemoved).toBe(1);
    expect(migratedContent).not.toContain("extendZodWithOpenApi");
  });

  it("should convert .openapi() to .meta()", async () => {
    const content = `
import { z } from 'zod';

const schema = z.string().openapi({ description: 'test' });
`;

    const filePath = createTestFile("test.ts", content);
    const result = await migrator.migrate(filePath);

    const migratedContent = fs.readFileSync(filePath, "utf8");

    expect(result.openapiToMetaChanges).toBe(1);
    expect(migratedContent).toContain(".meta(");
    expect(migratedContent).not.toContain(".openapi(");
  });

  it("should migrate zod imports", async () => {
    const content = `
import { z } from 'zod';
const schema = z.string();
`;

    const filePath = createTestFile("test.ts", content);
    const result = await migrator.migrate(filePath);

    const migratedContent = fs.readFileSync(filePath, "utf8");

    expect(result.zodImportsMigrated).toBe(1);
    expect(migratedContent).toContain('import * as z from "zod/v4"');
  });

  it("should handle comprehensive migration", async () => {
    const content = `
import 'zod-openapi/extend';
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const schema = z.string().openapi({ 
  ref: 'TestSchema', 
  description: 'A test schema',
  refType: 'input'
});
`;

    const filePath = createTestFile("test.ts", content);
    const result = await migrator.migrate(filePath);

    const migratedContent = fs.readFileSync(filePath, "utf8");

    expect(result.importsRemoved).toBe(2); // side-effect + named import
    expect(result.extendCallsRemoved).toBe(1);
    expect(result.zodImportsMigrated).toBe(1);
    expect(result.openapiToMetaChanges).toBe(1);
    expect(result.refToIdChanges).toBe(1);
    expect(result.refTypeToUnusedIOChanges).toBe(1);

    expect(migratedContent).not.toContain("import 'zod-openapi/extend'");
    expect(migratedContent).not.toContain("extendZodWithOpenApi");
    expect(migratedContent).toContain('import * as z from "zod/v4"');
    expect(migratedContent).toContain(".meta(");
    expect(migratedContent).toContain("id: 'TestSchema'");
    expect(migratedContent).toContain("unusedIO: 'input'");
  });

  it("should not modify files in dry run mode", async () => {
    const content = `
import 'zod-openapi/extend';
import { z } from 'zod';

const schema = z.string().openapi({ ref: 'Test' });
`;

    const filePath = createTestFile("test.ts", content);
    const dryRunMigrator = new ZodOpenApiMigrator({ dryRun: true });

    const result = await dryRunMigrator.migrate(filePath);

    const contentAfter = fs.readFileSync(filePath, "utf8");

    expect(contentAfter).toBe(content);
    expect(result.filesModified).toBe(0);
  });

  describe("createSchema transformations", () => {
    it("should change schemaType to io", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.string(), {
  schemaType: 'input'
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.schemaTypeToIOChanges).toBe(1);
      expect(migratedContent).toContain("io: 'input'");
      expect(migratedContent).not.toContain("schemaType:");
    });

    it("should change componentRefPath to schemaComponentRefPath", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.string(), {
  componentRefPath: '#/components/schemas/{name}'
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.componentRefPathChanges).toBe(1);
      expect(migratedContent).toContain(
        "schemaComponentRefPath: '#/components/schemas/{name}'"
      );
      expect(migratedContent).not.toContain("componentRefPath:");
    });

    it("should change components to schemaComponents", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.string(), {
  components: { schemas: {} }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.componentsToSchemaComponentsChanges).toBe(1);
      expect(migratedContent).toContain("schemaComponents: { schemas: {} }");
      expect(migratedContent).not.toContain("components:");
    });

    it("should transform unionOneOf to override function in createSchema", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.union([z.string(), z.number()]), {
  unionOneOf: true
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.createSchemaUnionOneOfToOverrideChanges).toBe(1);
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain('if (def.type === "union") {');
      expect(migratedContent).toContain("jsonSchema.oneOf = jsonSchema.anyOf;");
      expect(migratedContent).toContain("return;");
      expect(migratedContent).not.toContain("unionOneOf:");
    });

    it("should transform defaultDateSchema to override function in createSchema", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.string(), {
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.createSchemaDefaultDateSchemaToOverrideChanges).toBe(1);
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain('if (def.type === "date") {');
      expect(migratedContent).toContain("type = 'string';");
      expect(migratedContent).toContain("return;");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });

    it("should handle multiple createSchema transformations", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.union([z.string(), z.number()]), {
  schemaType: 'input',
  componentRefPath: '#/components/schemas/{name}',
  components: { schemas: {} },
  unionOneOf: true,
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.schemaTypeToIOChanges).toBe(1);
      expect(result.componentRefPathChanges).toBe(1);
      expect(result.componentsToSchemaComponentsChanges).toBe(1);
      expect(result.createSchemaUnionOneOfToOverrideChanges).toBe(1);
      expect(result.createSchemaDefaultDateSchemaToOverrideChanges).toBe(1);

      expect(migratedContent).toContain("io: 'input'");
      expect(migratedContent).toContain(
        "schemaComponentRefPath: '#/components/schemas/{name}'"
      );
      expect(migratedContent).toContain("schemaComponents: { schemas: {} }");
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain('if (def.type === "union") {');
      expect(migratedContent).toContain('if (def.type === "date") {');
      expect(migratedContent).toContain("jsonSchema.oneOf = jsonSchema.anyOf;");
      expect(migratedContent).toContain("type = 'string';");
      expect(migratedContent).toContain("return;");

      expect(migratedContent).not.toContain("schemaType:");
      expect(migratedContent).not.toContain("componentRefPath:");
      expect(migratedContent).not.toContain("components:");
      expect(migratedContent).not.toContain("unionOneOf:");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });

    it("should handle createSchema with merged unionOneOf and defaultDateSchema override", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.union([z.string(), z.number()]), {
  unionOneOf: true,
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.createSchemaUnionOneOfToOverrideChanges).toBe(1);
      expect(result.createSchemaDefaultDateSchemaToOverrideChanges).toBe(1);

      // Should have a single override function that handles both transformations
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain('if (def.type === "union") {');
      expect(migratedContent).toContain("jsonSchema.oneOf = jsonSchema.anyOf;");
      expect(migratedContent).toContain('if (def.type === "date") {');
      expect(migratedContent).toContain("type = 'string';");
      expect(migratedContent).toContain("return;");

      expect(migratedContent).not.toContain("unionOneOf:");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });
  });

  describe("createDocument transformations", () => {
    it("should transform unionOneOf to override function in createDocument", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {}
}, {
  unionOneOf: true
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.unionOneOfToOverrideChanges).toBe(1);
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain("jsonSchema.oneOf = jsonSchema.anyOf;");
      expect(migratedContent).toContain("delete jsonSchema.anyOf;");
      expect(migratedContent).not.toContain("unionOneOf:");
    });

    it("should transform defaultDateSchema to override function in createDocument", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {}
}, {
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.defaultDateSchemaToOverrideChanges).toBe(1);
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain("type = 'string';");
      expect(migratedContent).toContain("format = 'date';");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });

    it("should handle createDocument with merged unionOneOf and defaultDateSchema override", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test API', version: '1.0.0' },
  paths: {}
}, {
  unionOneOf: true,
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.unionOneOfToOverrideChanges).toBe(1);
      expect(result.defaultDateSchemaToOverrideChanges).toBe(1);

      // Should have a single override function that handles both transformations
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {"
      );
      expect(migratedContent).toContain("jsonSchema.oneOf = jsonSchema.anyOf;");
      expect(migratedContent).toContain("delete jsonSchema.anyOf;");
      expect(migratedContent).toContain("type = 'string';");
      expect(migratedContent).toContain("format = 'date';");

      expect(migratedContent).not.toContain("unionOneOf:");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });
  });
});
