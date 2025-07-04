import { ZodOpenApiMigrator } from "../src/migrator";
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

    it("should handle complex nested schemas", async () => {
      const content = `
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const UserSchema = z.object({
  name: z.string().openapi({ description: 'User name' }),
  age: z.number().openapi({ description: 'User age' }),
}).openapi({ ref: 'User' });

const CompanySchema = z.object({
  name: z.string().openapi({ description: 'Company name' }),
  users: z.array(UserSchema),
}).openapi({ ref: 'Company' });
`;

      const filePath = createTestFile("test.ts", content);
      const result = await migrator.migrate(filePath);

      const migratedContent = fs.readFileSync(filePath, "utf8");

      expect(result.importsRemoved).toBe(1);
      expect(result.extendCallsRemoved).toBe(1);
      expect(result.openapiToMetaChanges).toBe(4);
      expect(result.refToIdChanges).toBe(2);
      expect(migratedContent).not.toContain("extendZodWithOpenApi");
      expect(migratedContent).not.toContain(".openapi(");
      expect(migratedContent).toContain(".meta(");
      expect(migratedContent).toContain("id: 'User'");
      expect(migratedContent).toContain("id: 'Company'");
    });
  });

  describe("Dry run mode", () => {
    it("should not modify files in dry run mode", async () => {
      const content = `
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const schema = z.string().openapi({ ref: 'Test' });
`;

      const filePath = createTestFile("test.ts", content);
      const dryRunMigrator = new ZodOpenApiMigrator({ dryRun: true });

      await dryRunMigrator.migrate(filePath);

      const contentAfter = fs.readFileSync(filePath, "utf8");

      expect(contentAfter).toBe(content);
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
  });
});
