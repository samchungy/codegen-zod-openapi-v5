import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { ZodOpenApiMigrator } from "./migrator";
import * as fs from "fs";
import * as path from "path";
import { tmpdir } from "os";

describe("ZodOpenApiMigrator - Advanced Features", () => {
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

  describe("Advanced transformations", () => {
    it("should comment out effectType with TODO", async () => {
      const content = `
import { z } from 'zod';

const schema = z.string().openapi({ effectType: 'input' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.effectTypeCommented).toBe(1);
      expect(migratedContent).toContain("// TODO: effectType was removed");
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
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema }) => {"
      );
      expect(migratedContent).toContain("jsonSchema.oneOf = jsonSchema.anyOf;");
      expect(migratedContent).toContain("delete jsonSchema.anyOf;");
      expect(migratedContent).not.toContain("unionOneOf:");
    });

    it("should transform defaultDateSchema to override function", async () => {
      const content = `
import { createDocument } from 'zod-openapi';

const doc = createDocument({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0.0' },
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

    it("should handle createSchema transformations", async () => {
      const content = `
import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.string(), {
  schemaType: 'input',
  componentRefPath: '#/components/schemas/{name}',
  components: { schemas: {} }
});
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.schemaTypeToIOChanges).toBe(1);
      expect(result.componentRefPathChanges).toBe(1);
      expect(result.componentsToSchemaComponentsChanges).toBe(1);

      expect(migratedContent).toContain("io: 'input'");
      expect(migratedContent).toContain(
        "schemaComponentRefPath: '#/components/schemas/{name}'"
      );
      expect(migratedContent).toContain("schemaComponents: { schemas: {} }");
      expect(migratedContent).not.toContain("schemaType:");
      expect(migratedContent).not.toContain("componentRefPath:");
      expect(migratedContent).not.toContain("components:");
    });
  });

  describe("Import variations", () => {
    it("should handle different zod import styles", async () => {
      const tests = [
        { name: "named import", content: `import { z } from 'zod';` },
        { name: "default import", content: `import z from 'zod';` },
        { name: "namespace import", content: `import * as z from 'zod';` },
      ];

      for (const test of tests) {
        const content = `
${test.content}
const schema = z.string();
`;

        const filePath = createTestFile(
          `test-${test.name.replace(/ /g, "-")}.ts`,
          content
        );
        const result = await migrator.migrate(filePath);

        const migratedContent = fs.readFileSync(filePath, "utf8");

        expect(result.zodImportsMigrated).toBe(1);
        expect(migratedContent).toContain('import * as z from "zod/v4"');
        expect(migratedContent).not.toContain("from 'zod'");
        expect(migratedContent).not.toContain('from "zod"');
      }
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
  });

  describe("Complex scenarios", () => {
    it("should handle nested ref to id transformations", async () => {
      const content = `
import { z } from 'zod';

const schema = z.object({
  nested: z.object({
    deep: z.string().openapi({ ref: 'DeepRef' })
  }).openapi({ ref: 'NestedRef' })
}).openapi({ ref: 'RootRef' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.refToIdChanges).toBe(3);
      expect(migratedContent).toContain("id: 'DeepRef'");
      expect(migratedContent).toContain("id: 'NestedRef'");
      expect(migratedContent).toContain("id: 'RootRef'");
      expect(migratedContent).not.toContain("ref:");
    });

    it("should handle mixed transformations", async () => {
      const content = `
import { z } from 'zod';

const schema = z.object({
  name: z.string().openapi({ description: 'Name' }),
  status: z.union([z.literal('active'), z.literal('inactive')]).openapi({ 
    unionOneOf: true,
    description: 'Status'
  }),
  metadata: z.record(z.string()).openapi({ 
    refType: 'input',
    effectType: 'output',
    ref: 'Metadata'
  })
}).openapi({ ref: 'Schema' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.openapiToMetaChanges).toBe(4);
      expect(result.refToIdChanges).toBe(2);
      expect(result.refTypeToUnusedIOChanges).toBe(1);
      expect(result.effectTypeCommented).toBe(1);
      expect(result.unionOneOfToOverrideChanges).toBe(1);

      expect(migratedContent).toContain("id: 'Metadata'");
      expect(migratedContent).toContain("id: 'Schema'");
      expect(migratedContent).toContain("unusedIO: 'input'");
      expect(migratedContent).toContain("// TODO: effectType was removed");
      expect(migratedContent).toContain("// effectType: 'output'");
      expect(migratedContent).toContain(
        "override: ({ jsonSchema: jsonSchema }) => {"
      );
    });
  });

  describe("File handling", () => {
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

    it("should handle custom ignore patterns", async () => {
      const customMigrator = new ZodOpenApiMigrator({
        ignorePatterns: ["**/custom-ignore/**"],
      });

      const customIgnoreDir = path.join(tempDir, "custom-ignore");
      fs.mkdirSync(customIgnoreDir);

      createTestFile("test.ts", "const x = 1;");
      fs.writeFileSync(path.join(customIgnoreDir, "test.ts"), "const x = 1;");

      const result = await customMigrator.migrate(path.join(tempDir, "**/*"));

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

    it("should handle files with only comments", async () => {
      const content = `
// This is a comment
/* This is a block comment */
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      expect(result.filesProcessed).toBe(1);
      expect(result.filesModified).toBe(0);
    });
  });
});
