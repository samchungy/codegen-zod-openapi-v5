#!/usr/bin/env node

import { program } from "commander";
import { ZodOpenApiMigrator } from "./migrator";
import chalk from "chalk";

interface CliOptions {
  dryRun?: boolean;
  verbose?: boolean;
  ignore?: string;
}

program
  .name("zod-openapi-migrate")
  .description("Migrate zod-openapi v4 code to v5")
  .version("1.0.0");

program
  .argument(
    "<pattern>",
    'Glob pattern for files to migrate (e.g., "src/**/*.ts")'
  )
  .option("-d, --dry-run", "Show what would be changed without making changes")
  .option("-v, --verbose", "Show verbose output")
  .option("--ignore <patterns>", "Comma-separated glob patterns to ignore", "")
  .action(async (pattern: string, options: CliOptions) => {
    try {
      const migrator = new ZodOpenApiMigrator({
        dryRun: options.dryRun,
        verbose: options.verbose,
        ignorePatterns: options.ignore ? options.ignore.split(",") : [],
      });

      console.log(chalk.blue("🔄 Starting zod-openapi v5 migration..."));

      const result = await migrator.migrate(pattern);

      if (options.dryRun) {
        console.log(
          chalk.yellow("📋 Dry run completed. No files were modified.")
        );
      } else {
        console.log(chalk.green("✅ Migration completed successfully!"));
      }

      console.log(chalk.cyan(`📊 Summary:`));
      console.log(chalk.cyan(`  - Files processed: ${result.filesProcessed}`));
      console.log(chalk.cyan(`  - Files modified: ${result.filesModified}`));
      console.log(chalk.cyan(`  - Imports removed: ${result.importsRemoved}`));
      console.log(
        chalk.cyan(`  - Extend calls removed: ${result.extendCallsRemoved}`)
      );
      console.log(
        chalk.cyan(`  - Zod imports migrated: ${result.zodImportsMigrated}`)
      );
      console.log(
        chalk.cyan(`  - openapi() → meta(): ${result.openapiToMetaChanges}`)
      );
      console.log(chalk.cyan(`  - ref → id changes: ${result.refToIdChanges}`));
      console.log(
        chalk.cyan(
          `  - refType → unusedIO changes: ${result.refTypeToUnusedIOChanges}`
        )
      );
      console.log(
        chalk.cyan(
          `  - unionOneOf → override changes: ${result.unionOneOfToOverrideChanges}`
        )
      );
      console.log(
        chalk.cyan(`  - effectType commented: ${result.effectTypeCommented}`)
      );
      console.log(
        chalk.cyan(
          `  - schemaType → io changes: ${result.schemaTypeToIOChanges}`
        )
      );
      console.log(
        chalk.cyan(
          `  - componentRefPath → schemaComponentRefPath changes: ${result.componentRefPathChanges}`
        )
      );
      console.log(
        chalk.cyan(
          `  - components → schemaComponents changes: ${result.componentsToSchemaComponentsChanges}`
        )
      );
      console.log(
        chalk.cyan(
          `  - createSchema unionOneOf → opts.override changes: ${result.createSchemaUnionOneOfToOverrideChanges}`
        )
      );
      console.log(
        chalk.cyan(
          `  - createSchema defaultDateSchema → opts.override changes: ${result.createSchemaDefaultDateSchemaToOverrideChanges}`
        )
      );
      console.log(
        chalk.cyan(
          `  - defaultDateSchema → override changes: ${result.defaultDateSchemaToOverrideChanges}`
        )
      );
    } catch (error) {
      console.error(chalk.red("❌ Migration failed:"), error);
      process.exit(1);
    }
  });

program.parse();
