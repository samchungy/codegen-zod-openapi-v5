import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ZodOpenApiMigrator } from "./migrator";
import * as fs from "fs";
import * as path from "path";
import { tmpdir } from "os";

describe("ZodOpenApiMigrator", () => {
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

  describe("Import handling", () => {
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

    it("should preserve other imports from zod-openapi", async () => {
      const content = `
import { z } from 'zod';
import { extendZodWithOpenApi, SomeOtherImport } from 'zod-openapi';

extendZodWithOpenApi(z);
`;

      const filePath = createTestFile("test.ts", content);
      await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(migratedContent).toContain("SomeOtherImport");
      expect(migratedContent).not.toContain("extendZodWithOpenApi");
    });

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

    it("should handle multiple side-effect imports", async () => {
      const content = `
import 'zod-openapi/extend';
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);
const schema = z.string().openapi({ ref: 'Test' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.importsRemoved).toBe(2); // side-effect + named import
      expect(result.extendCallsRemoved).toBe(1);
      expect(migratedContent).not.toContain("import 'zod-openapi/extend'");
      expect(migratedContent).not.toContain("extendZodWithOpenApi");
      expect(migratedContent).toContain('import * as z from "zod/v4"');
      expect(migratedContent).toContain(".meta(");
      expect(migratedContent).toContain("id: 'Test'");
    });
  });

  describe("Zod import migration", () => {
    it("should migrate named zod imports", async () => {
      const content = `
import { z } from 'zod';
const schema = z.string();
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.zodImportsMigrated).toBe(1);
      expect(migratedContent).toContain('import * as z from "zod/v4"');
      expect(migratedContent).not.toContain("import { z } from 'zod'");
    });

    it("should migrate default zod imports", async () => {
      const content = `
import z from 'zod';
const schema = z.string();
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.zodImportsMigrated).toBe(1);
      expect(migratedContent).toContain('import * as z from "zod/v4"');
      expect(migratedContent).not.toContain("import z from 'zod'");
    });

    it("should migrate namespace zod imports", async () => {
      const content = `
import * as z from 'zod';
const schema = z.string();
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.zodImportsMigrated).toBe(1);
      expect(migratedContent).toContain('import * as z from "zod/v4"');
      expect(migratedContent).not.toContain("import * as z from 'zod'");
    });

    it("should not migrate other zod imports", async () => {
      const content = `
import { ZodSchema, ZodString } from 'zod';
const schema: ZodString = ZodString.create();
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.zodImportsMigrated).toBe(0);
      expect(migratedContent).toContain(
        "import { ZodSchema, ZodString } from 'zod'"
      );
    });
  });

  describe("Method transformation", () => {
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

    it("should convert ref to id in metadata", async () => {
      const content = `
import { z } from 'zod';

const schema = z.string().openapi({ ref: 'TestSchema' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.refToIdChanges).toBe(1);
      expect(migratedContent).toContain("id: 'TestSchema'");
      expect(migratedContent).not.toContain("ref:");
    });

    it("should convert refType to unusedIO", async () => {
      const content = `
import { z } from 'zod';

const schema = z.string().openapi({ refType: 'input' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.refTypeToUnusedIOChanges).toBe(1);
      expect(migratedContent).toContain("unusedIO: 'input'");
      expect(migratedContent).not.toContain("refType:");
    });

    it("should comment out effectType with TODO", async () => {
      const content = `
import { z } from 'zod';

const schema = z.string().openapi({ effectType: 'input' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.effectTypeCommented).toBe(1);
      expect(migratedContent).toContain("// TODO: effectType is deprecated");
      expect(migratedContent).toContain("// effectType: 'input'");
    });

    it("should transform unionOneOf to override function", async () => {
      const content = `
import { z } from 'zod';

const schema = z.union([z.string(), z.number()]).openapi({ unionOneOf: true });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.unionOneOfToOverrideChanges).toBe(1);
      expect(migratedContent).toContain("override: (schema) => {");
      expect(migratedContent).toContain("if (schema.type === 'union') {");
      expect(migratedContent).toContain(
        "return { ...schema, oneOf: schema.anyOf };"
      );
      expect(migratedContent).toContain("return;");
      expect(migratedContent).not.toContain("unionOneOf:");
    });
  });

  describe("createDocument handling", () => {
    it("should transform unionOneOf in createDocument", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  unionOneOf: true
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.unionOneOfToOverrideChanges).toBe(1);
      expect(migratedContent).toContain("override: (schema) => {");
      expect(migratedContent).toContain("if (schema.type === 'union') {");
      expect(migratedContent).toContain(
        "return { ...schema, oneOf: schema.anyOf };"
      );
      expect(migratedContent).toContain("return;");
      expect(migratedContent).not.toContain("unionOneOf:");
    });

    it("should transform defaultDateSchema in createDocument", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.defaultDateSchemaToOverrideChanges).toBe(1);
      expect(migratedContent).toContain("override: (schema) => {");
      expect(migratedContent).toContain(
        "if (schema.type === 'string' && schema.format === 'date') {"
      );
      expect(migratedContent).toContain(
        "return { type: 'string', format: 'date' };"
      );
      expect(migratedContent).toContain("return;");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });

    it("should transform defaultDateSchema in createDocument", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
  defaultDateSchema: { type: 'string', format: 'date' }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.defaultDateSchemaToOverrideChanges).toBe(1);
      expect(migratedContent).toContain("override: (schema) => {");
      expect(migratedContent).toContain(
        "if (schema.type === 'string' && schema.format === 'date') {"
      );
      expect(migratedContent).toContain(
        "return { type: 'string', format: 'date' };"
      );
      expect(migratedContent).toContain("return;");
      expect(migratedContent).not.toContain("defaultDateSchema:");
    });
  });

  describe("createSchema handling", () => {
    it("should change schemaType to io", async () => {
      const content = `
import { createSchema } from 'zod-openapi';

const schema = createSchema({
  schemaType: 'input',
  schema: z.string()
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

const schema = createSchema({
  componentRefPath: '#/components/schemas/{name}',
  schema: z.string()
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

const schema = createSchema({
  components: { schemas: {} },
  schema: z.string()
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.componentsToSchemaComponentsChanges).toBe(1);
      expect(migratedContent).toContain("schemaComponents: { schemas: {} }");
      expect(migratedContent).not.toContain("components:");
    });
  });

  describe("Complex nested schemas", () => {
    it("should handle complex nested schemas with all transformations", async () => {
      const content = `
import 'zod-openapi/extend';
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const UserSchema = z.object({
  name: z.string().openapi({ description: 'User name' }),
  age: z.number().openapi({ description: 'User age' }),
  status: z.union([z.literal('active'), z.literal('inactive')]).openapi({ 
    unionOneOf: true,
    description: 'User status' 
  }),
}).openapi({ ref: 'User' });

const CompanySchema = z.object({
  name: z.string().openapi({ description: 'Company name' }),
  users: z.array(UserSchema),
  metadata: z.record(z.string()).openapi({ 
    refType: 'input',
    effectType: 'output'
  }),
}).openapi({ ref: 'Company' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.importsRemoved).toBe(2); // side-effect + named import
      expect(result.extendCallsRemoved).toBe(1);
      expect(result.zodImportsMigrated).toBe(1);
      expect(result.openapiToMetaChanges).toBe(5);
      expect(result.refToIdChanges).toBe(2);
      expect(result.refTypeToUnusedIOChanges).toBe(1);
      expect(result.effectTypeCommented).toBe(1);
      expect(result.unionOneOfToOverrideChanges).toBe(1);

      expect(migratedContent).not.toContain("import 'zod-openapi/extend'");
      expect(migratedContent).not.toContain("extendZodWithOpenApi");
      expect(migratedContent).toContain('import * as z from "zod/v4"');
      expect(migratedContent).not.toContain(".openapi(");
      expect(migratedContent).toContain(".meta(");
      expect(migratedContent).toContain("id: 'User'");
      expect(migratedContent).toContain("id: 'Company'");
      expect(migratedContent).toContain("unusedIO: 'input'");
      expect(migratedContent).toContain("// TODO: effectType is deprecated");
      expect(migratedContent).toContain("// effectType: 'output'");
      expect(migratedContent).toContain("override: (schema) => {");
    });
  });

  describe("Dry run mode", () => {
    it("should not modify files in dry run mode", async () => {
      const content = `
import 'zod-openapi/extend';
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const schema = z.string().openapi({ ref: 'Test' });
`;

      const filePath = createTestFile("test.ts", content);
      const dryRunMigrator = new ZodOpenApiMigrator({ dryRun: true });

      const result = await dryRunMigrator.migrate(filePath);

      const contentAfter = fs.readFileSync(filePath, "utf8");

      expect(contentAfter).toBe(content);
      expect(result.filesModified).toBe(0);
    });
  });

  describe("File filtering", () => {
    it("should only process supported file types", async () => {
      createTestFile("test.ts", "const x = 1;");
      createTestFile("test.js", "const x = 1;");
      createTestFile("test.txt", "const x = 1;");
      createTestFile("test.json", '{"x": 1}');

      const result = await migrator.migrate(path.join(tempDir, "**/*"));

      expect(result.filesProcessed).toBe(2); // Only .ts and .js files
    });

    it("should ignore specified patterns", async () => {
      // Create files in ignored directories
      const nodeModulesDir = path.join(tempDir, "node_modules");
      const distDir = path.join(tempDir, "dist");
      fs.mkdirSync(nodeModulesDir);
      fs.mkdirSync(distDir);

      createTestFile("test.ts", "const x = 1;");
      fs.writeFileSync(path.join(nodeModulesDir, "test.ts"), "const x = 1;");
      fs.writeFileSync(path.join(distDir, "test.ts"), "const x = 1;");

      const result = await migrator.migrate(path.join(tempDir, "**/*"));

      expect(result.filesProcessed).toBe(1); // Only the root test.ts file
    });
  });

  describe("Error handling", () => {
    it("should handle invalid syntax gracefully", async () => {
      const content = `
import { z } from 'zod';

const schema = z.string().openapi({ description: 'test' 
// Missing closing brace
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      expect(result.filesProcessed).toBe(1);
      expect(result.filesModified).toBe(0); // Should not modify due to syntax error
    });

    it("should handle empty files", async () => {
      const content = "";

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      expect(result.filesProcessed).toBe(1);
      expect(result.filesModified).toBe(0);
    });
  });
});
