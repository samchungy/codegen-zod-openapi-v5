#!/usr/bin/env node

// Simple test to verify the migration tool works
console.log("Testing zod-openapi migration tool...");

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

// Create a temporary test file
const testContent = `
import { z } from 'zod';
import { extendZodWithOpenApi } from 'zod-openapi';

extendZodWithOpenApi(z);

const TestSchema = z.object({
  name: z.string().openapi({ description: 'Test name' }),
}).openapi({ ref: 'Test' });
`;

const testFile = path.join(__dirname, "temp-test.ts");
fs.writeFileSync(testFile, testContent);

try {
  // Run migration in dry-run mode
  console.log("Running dry-run migration...");
  const result = execSync('npx tsx src/index.ts "temp-test.ts" --dry-run', {
    cwd: __dirname,
    encoding: "utf8",
  });

  console.log("Dry-run result:", result);

  // Run actual migration
  console.log("Running actual migration...");
  const result2 = execSync('npx tsx src/index.ts "temp-test.ts"', {
    cwd: __dirname,
    encoding: "utf8",
  });

  console.log("Migration result:", result2);

  // Check the migrated content
  const migratedContent = fs.readFileSync(testFile, "utf8");
  console.log("Migrated content:");
  console.log(migratedContent);

  // Verify the migration worked
  const hasOriginalImport = migratedContent.includes("extendZodWithOpenApi");
  const hasOriginalCall = migratedContent.includes("extendZodWithOpenApi(z)");
  const hasOpenApiCall = migratedContent.includes(".openapi(");
  const hasMetaCall = migratedContent.includes(".meta(");
  const hasRefProperty = migratedContent.includes("ref:");
  const hasIdProperty = migratedContent.includes("id:");

  console.log("Migration verification:");
  console.log("- Removed extendZodWithOpenApi import:", !hasOriginalImport);
  console.log("- Removed extendZodWithOpenApi call:", !hasOriginalCall);
  console.log("- Removed .openapi() calls:", !hasOpenApiCall);
  console.log("- Added .meta() calls:", hasMetaCall);
  console.log("- Removed ref properties:", !hasRefProperty);
  console.log("- Added id properties:", hasIdProperty);

  if (
    !hasOriginalImport &&
    !hasOriginalCall &&
    !hasOpenApiCall &&
    hasMetaCall &&
    !hasRefProperty &&
    hasIdProperty
  ) {
    console.log("✅ Migration test passed!");
  } else {
    console.log("❌ Migration test failed!");
    process.exit(1);
  }
} catch (error) {
  console.error("Test failed:", error.message);
  process.exit(1);
} finally {
  // Clean up
  if (fs.existsSync(testFile)) {
    fs.unlinkSync(testFile);
  }
}
