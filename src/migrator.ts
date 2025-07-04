import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";
import { parse } from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";
import chalk from "chalk";
import { MigrationOptions, MigrationResult, MigrationStats } from "./types";

export class ZodOpenApiMigrator {
  private options: MigrationOptions;

  constructor(options: MigrationOptions = {}) {
    this.options = {
      dryRun: false,
      verbose: false,
      ignorePatterns: [
        "**/node_modules/**",
        "**/dist/**",
        "**/build/**",
        "**/.git/**",
        "**/.next/**",
        "**/.nuxt/**",
        "**/coverage/**",
        ...(options.ignorePatterns || []),
      ],
      ...options,
    };
  }

  async migrate(pattern: string): Promise<MigrationResult> {
    const files = await this.findFiles(pattern);

    if (files.length === 0) {
      console.log(
        chalk.yellow("⚠️  No files found matching pattern:", pattern)
      );
      return this.createEmptyResult();
    }

    const results: MigrationStats[] = [];
    let totalFilesModified = 0;

    for (const file of files) {
      if (this.options.verbose) {
        console.log(chalk.gray(`Processing: ${file}`));
      }

      const stats = await this.processFile(file);
      results.push(stats);

      const hasChanges = this.hasChanges(stats);
      if (hasChanges) {
        totalFilesModified++;
        if (this.options.verbose) {
          console.log(chalk.green(`  ✓ Modified: ${file}`));
          this.logChanges(stats);
        }
      } else if (this.options.verbose) {
        console.log(chalk.gray(`  - No changes: ${file}`));
      }
    }

    return this.aggregateResults(results, totalFilesModified);
  }

  private async findFiles(pattern: string): Promise<string[]> {
    const files = await glob(pattern, {
      ignore: this.options.ignorePatterns,
      absolute: true,
    });

    return files.filter(
      (file) =>
        file.endsWith(".ts") ||
        file.endsWith(".tsx") ||
        file.endsWith(".js") ||
        file.endsWith(".jsx")
    );
  }

  private async processFile(filePath: string): Promise<MigrationStats> {
    const content = fs.readFileSync(filePath, "utf8");
    const stats: MigrationStats = {
      filename: filePath,
      changes: {
        removedImports: 0,
        removedExtendCalls: 0,
        zodImportsMigrated: 0,
        openapiToMeta: 0,
        refToId: 0,
        refTypeToUnusedIO: 0,
        unionOneOfToOverride: 0,
        effectTypeCommented: 0,
        schemaTypeToIO: 0,
        componentRefPath: 0,
        componentsToSchemaComponents: 0,
        createSchemaUnionOneOfToOverride: 0,
        createSchemaDefaultDateSchemaToOverride: 0,
        defaultDateSchemaToOverride: 0,
      },
    };

    let ast: t.File;
    try {
      ast = parse(content, {
        sourceType: "module",
        plugins: ["typescript", "jsx"],
      });
    } catch (error) {
      console.warn(chalk.yellow(`⚠️  Failed to parse ${filePath}:`, error));
      return stats;
    }

    let hasModifications = false;

    // Helper function to transform ref to id, refType to unusedIO, unionOneOf to override, and track effectType in objects
    const transformRefToIdInObject = (objectExpression: t.ObjectExpression) => {
      const transformObject = (obj: t.ObjectExpression) => {
        obj.properties.forEach((prop) => {
          if (
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key) &&
            prop.key.name === "ref"
          ) {
            prop.key.name = "id";
            stats.changes.refToId++;
          }

          if (
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key) &&
            prop.key.name === "refType"
          ) {
            prop.key.name = "unusedIO";
            stats.changes.refTypeToUnusedIO++;
          }

          // Handle effectType - just count it, don't remove (we'll comment it out later)
          if (
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key) &&
            prop.key.name === "effectType"
          ) {
            stats.changes.effectTypeCommented++;
          }

          // Handle unionOneOf transformation
          if (
            t.isObjectProperty(prop) &&
            t.isIdentifier(prop.key) &&
            prop.key.name === "unionOneOf" &&
            t.isBooleanLiteral(prop.value) &&
            prop.value.value === true
          ) {
            // Replace unionOneOf: true with override function
            prop.key.name = "override";

            // Create the override function: ({ jsonSchema }) => { jsonSchema.oneOf = jsonSchema.anyOf; delete jsonSchema.anyOf; }
            const param = t.objectPattern([
              t.objectProperty(
                t.identifier("jsonSchema"),
                t.identifier("jsonSchema")
              ),
            ]);

            const body = t.blockStatement([
              t.expressionStatement(
                t.assignmentExpression(
                  "=",
                  t.memberExpression(
                    t.identifier("jsonSchema"),
                    t.identifier("oneOf")
                  ),
                  t.memberExpression(
                    t.identifier("jsonSchema"),
                    t.identifier("anyOf")
                  )
                )
              ),
              t.expressionStatement(
                t.unaryExpression(
                  "delete",
                  t.memberExpression(
                    t.identifier("jsonSchema"),
                    t.identifier("anyOf")
                  )
                )
              ),
            ]);

            prop.value = t.arrowFunctionExpression([param], body);
            stats.changes.unionOneOfToOverride++;
          }

          // Handle nested objects
          if (t.isObjectProperty(prop) && t.isObjectExpression(prop.value)) {
            transformObject(prop.value);
          }

          // Handle arrays of objects
          if (t.isObjectProperty(prop) && t.isArrayExpression(prop.value)) {
            prop.value.elements.forEach((element) => {
              if (t.isObjectExpression(element)) {
                transformObject(element);
              }
            });
          }
        });
      };

      transformObject(objectExpression);
    };

    // Helper function specifically for createDocument options (second argument)
    const transformCreateDocumentOptions = (
      objectExpression: t.ObjectExpression
    ) => {
      let hasUnionOneOf = false;
      let defaultDateSchemaObject: t.ObjectExpression | null = null;
      let existingOverride: t.ObjectProperty | null = null;

      // First pass: identify what needs to be transformed
      objectExpression.properties.forEach((prop) => {
        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.key) &&
          prop.key.name === "unionOneOf" &&
          t.isBooleanLiteral(prop.value) &&
          prop.value.value === true
        ) {
          hasUnionOneOf = true;
        }

        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.key) &&
          prop.key.name === "defaultDateSchema" &&
          t.isObjectExpression(prop.value)
        ) {
          defaultDateSchemaObject = prop.value;
        }

        if (
          t.isObjectProperty(prop) &&
          t.isIdentifier(prop.key) &&
          prop.key.name === "override"
        ) {
          existingOverride = prop;
        }
      });

      // If we have transformations to apply
      if (hasUnionOneOf || defaultDateSchemaObject) {
        // Remove unionOneOf and defaultDateSchema properties
        objectExpression.properties = objectExpression.properties.filter(
          (prop) => {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
              return (
                prop.key.name !== "unionOneOf" &&
                prop.key.name !== "defaultDateSchema"
              );
            }
            return true;
          }
        );

        // Build the override function body
        const bodyStatements: t.Statement[] = [];

        // Add const def = zodSchema._zod.def;
        bodyStatements.push(
          t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier("def"),
              t.memberExpression(
                t.memberExpression(
                  t.identifier("zodSchema"),
                  t.identifier("_zod")
                ),
                t.identifier("def")
              )
            ),
          ])
        );

        // Add union handling if needed
        if (hasUnionOneOf) {
          bodyStatements.push(
            t.ifStatement(
              t.binaryExpression(
                "===",
                t.memberExpression(t.identifier("def"), t.identifier("type")),
                t.stringLiteral("union")
              ),
              t.blockStatement([
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(
                      t.identifier("jsonSchema"),
                      t.identifier("oneOf")
                    ),
                    t.memberExpression(
                      t.identifier("jsonSchema"),
                      t.identifier("anyOf")
                    )
                  )
                ),
                t.expressionStatement(
                  t.unaryExpression(
                    "delete",
                    t.memberExpression(
                      t.identifier("jsonSchema"),
                      t.identifier("anyOf")
                    )
                  )
                ),
                t.returnStatement(),
              ])
            )
          );
          stats.changes.unionOneOfToOverride++;
        }

        // Add date handling if needed
        if (defaultDateSchemaObject) {
          const dateStatements: t.Statement[] = [];

          // Convert each property in defaultDateSchema to an assignment
          (defaultDateSchemaObject as t.ObjectExpression).properties.forEach(
            (prop) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                dateStatements.push(
                  t.expressionStatement(
                    t.assignmentExpression(
                      "=",
                      t.memberExpression(t.identifier("jsonSchema"), prop.key),
                      prop.value as t.Expression
                    )
                  )
                );
              }
            }
          );

          bodyStatements.push(
            t.ifStatement(
              t.binaryExpression(
                "===",
                t.memberExpression(t.identifier("def"), t.identifier("type")),
                t.stringLiteral("date")
              ),
              t.blockStatement([...dateStatements, t.returnStatement()])
            )
          );
          stats.changes.defaultDateSchemaToOverride++;
        }

        // Create the override function
        const overrideFunction = t.arrowFunctionExpression(
          [
            t.objectPattern([
              t.objectProperty(
                t.identifier("jsonSchema"),
                t.identifier("jsonSchema")
              ),
              t.objectProperty(
                t.identifier("zodSchema"),
                t.identifier("zodSchema")
              ),
            ]),
          ],
          t.blockStatement(bodyStatements)
        );

        if (existingOverride && t.isObjectProperty(existingOverride)) {
          // Replace existing override
          (existingOverride as t.ObjectProperty).value = overrideFunction;
        } else {
          // Add new override property
          objectExpression.properties.push(
            t.objectProperty(t.identifier("override"), overrideFunction)
          );
        }
      }
    };

    // Helper function specifically for createSchema options (second argument)
    const transformCreateSchemaOptions = (
      objectExpression: t.ObjectExpression
    ) => {
      let hasUnionOneOf = false;
      let defaultDateSchemaObject: t.ObjectExpression | null = null;

      // First pass: identify transformations and find existing opts
      objectExpression.properties.forEach((prop, index) => {
        if (!t.isObjectProperty(prop)) return;

        if (t.isIdentifier(prop.key) && prop.key.name === "schemaType") {
          // Replace schemaType with io
          prop.key.name = "io";
          stats.changes.schemaTypeToIO++;
        }

        if (t.isIdentifier(prop.key) && prop.key.name === "componentRefPath") {
          // Replace componentRefPath with schemaComponentRefPath
          prop.key.name = "schemaComponentRefPath";
          stats.changes.componentRefPath++;
        }

        if (t.isIdentifier(prop.key) && prop.key.name === "components") {
          // Replace components with schemaComponents
          prop.key.name = "schemaComponents";
          stats.changes.componentsToSchemaComponents++;
        }

        if (
          t.isIdentifier(prop.key) &&
          prop.key.name === "unionOneOf" &&
          t.isBooleanLiteral(prop.value) &&
          prop.value.value === true
        ) {
          hasUnionOneOf = true;
        }

        if (
          t.isIdentifier(prop.key) &&
          prop.key.name === "defaultDateSchema" &&
          t.isObjectExpression(prop.value)
        ) {
          defaultDateSchemaObject = prop.value;
        }

        if (
          t.isIdentifier(prop.key) &&
          prop.key.name === "opts" &&
          t.isObjectExpression(prop.value)
        ) {
          // We'll find this again after filtering
        }
      });

      // Handle unionOneOf and defaultDateSchema transformations
      if (hasUnionOneOf || defaultDateSchemaObject) {
        // Remove unionOneOf and defaultDateSchema properties
        objectExpression.properties = objectExpression.properties.filter(
          (prop) => {
            if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
              return (
                prop.key.name !== "unionOneOf" &&
                prop.key.name !== "defaultDateSchema"
              );
            }
            return true;
          }
        );

        // Build the override function body
        const bodyStatements: t.Statement[] = [];

        // Add const def = zodSchema._zod.def;
        bodyStatements.push(
          t.variableDeclaration("const", [
            t.variableDeclarator(
              t.identifier("def"),
              t.memberExpression(
                t.memberExpression(
                  t.identifier("zodSchema"),
                  t.identifier("_zod")
                ),
                t.identifier("def")
              )
            ),
          ])
        );

        // Add union handling if needed
        if (hasUnionOneOf) {
          bodyStatements.push(
            t.ifStatement(
              t.binaryExpression(
                "===",
                t.memberExpression(t.identifier("def"), t.identifier("type")),
                t.stringLiteral("union")
              ),
              t.blockStatement([
                t.expressionStatement(
                  t.assignmentExpression(
                    "=",
                    t.memberExpression(
                      t.identifier("jsonSchema"),
                      t.identifier("oneOf")
                    ),
                    t.memberExpression(
                      t.identifier("jsonSchema"),
                      t.identifier("anyOf")
                    )
                  )
                ),
                t.expressionStatement(
                  t.unaryExpression(
                    "delete",
                    t.memberExpression(
                      t.identifier("jsonSchema"),
                      t.identifier("anyOf")
                    )
                  )
                ),
                t.returnStatement(),
              ])
            )
          );
          stats.changes.createSchemaUnionOneOfToOverride++;
        }

        // Add date handling if needed
        if (defaultDateSchemaObject) {
          const dateStatements: t.Statement[] = [];

          // Convert each property in defaultDateSchema to an assignment
          (defaultDateSchemaObject as t.ObjectExpression).properties.forEach(
            (prop) => {
              if (t.isObjectProperty(prop) && t.isIdentifier(prop.key)) {
                dateStatements.push(
                  t.expressionStatement(
                    t.assignmentExpression(
                      "=",
                      t.memberExpression(t.identifier("jsonSchema"), prop.key),
                      prop.value as t.Expression
                    )
                  )
                );
              }
            }
          );

          bodyStatements.push(
            t.ifStatement(
              t.binaryExpression(
                "===",
                t.memberExpression(t.identifier("def"), t.identifier("type")),
                t.stringLiteral("date")
              ),
              t.blockStatement([...dateStatements, t.returnStatement()])
            )
          );
          stats.changes.createSchemaDefaultDateSchemaToOverride++;
        }

        // Create the override function
        const overrideFunction = t.arrowFunctionExpression(
          [
            t.objectPattern([
              t.objectProperty(
                t.identifier("jsonSchema"),
                t.identifier("jsonSchema")
              ),
              t.objectProperty(
                t.identifier("zodSchema"),
                t.identifier("zodSchema")
              ),
            ]),
          ],
          t.blockStatement(bodyStatements)
        );

        // Find existing opts property after filtering
        const existingOptsProperty = objectExpression.properties.find(
          (prop) => {
            return (
              t.isObjectProperty(prop) &&
              t.isIdentifier(prop.key) &&
              prop.key.name === "opts" &&
              t.isObjectExpression(prop.value)
            );
          }
        );

        if (
          existingOptsProperty &&
          t.isObjectProperty(existingOptsProperty) &&
          t.isObjectExpression(existingOptsProperty.value)
        ) {
          // Add override to existing opts object
          const optsObject = existingOptsProperty.value;
          optsObject.properties.push(
            t.objectProperty(t.identifier("override"), overrideFunction)
          );
        } else {
          // Create new opts property
          const optsProperty = t.objectProperty(
            t.identifier("opts"),
            t.objectExpression([
              t.objectProperty(t.identifier("override"), overrideFunction),
            ])
          );
          objectExpression.properties.push(optsProperty);
        }
      }
    };

    traverse(ast, {
      // Handle import statements
      ImportDeclaration(path) {
        // Skip if the import has been removed
        if (!path.node || !path.node.source) return;

        // Handle zod imports
        if (path.node.source.value === "zod") {
          let hasZodImport = false;
          
          // Check if this import has 'z' as named import or default import
          path.node.specifiers.forEach((spec) => {
            if (
              (t.isImportDefaultSpecifier(spec) && spec.local.name === "z") ||
              (t.isImportSpecifier(spec) && 
               t.isIdentifier(spec.imported) && 
               spec.imported.name === "z" && 
               spec.local.name === "z") ||
              (t.isImportNamespaceSpecifier(spec) && spec.local.name === "z")
            ) {
              hasZodImport = true;
            }
          });

          if (hasZodImport) {
            // Transform to import * as z from 'zod/v4'
            path.node.source.value = "zod/v4";
            path.node.specifiers = [
              t.importNamespaceSpecifier(t.identifier("z"))
            ];
            stats.changes.zodImportsMigrated++;
            hasModifications = true;
          }
          return;
        }

        // Handle zod-openapi imports
        if (path.node.source.value === "zod-openapi") {
          const specifiers = path.node.specifiers;
          const filteredSpecifiers = specifiers.filter((spec) => {
            if (t.isImportSpecifier(spec) && t.isIdentifier(spec.imported)) {
              return spec.imported.name !== "extendZodWithOpenApi";
            }
            return true;
          });

          if (filteredSpecifiers.length < specifiers.length) {
            stats.changes.removedImports++;
            hasModifications = true;

            if (filteredSpecifiers.length === 0) {
              // Remove the entire import if no specifiers remain
              path.remove();
            } else {
              // Update the import with filtered specifiers
              path.node.specifiers = filteredSpecifiers;
            }
          }
          return;
        }

        // Handle zod-openapi/extend side-effect imports
        if (path.node.source.value === "zod-openapi/extend") {
          stats.changes.removedImports++;
          hasModifications = true;
          // Remove the entire side-effect import
          path.remove();
          return;
        }
      },

      // Handle extendZodWithOpenApi calls and .openapi() method calls
      CallExpression(path) {
        // Handle extendZodWithOpenApi calls
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "extendZodWithOpenApi"
        ) {
          stats.changes.removedExtendCalls++;
          hasModifications = true;

          // Remove the entire expression statement
          const parent = path.parent;
          if (t.isExpressionStatement(parent)) {
            path.parentPath.remove();
          } else {
            path.remove();
          }
          return;
        }

        // Handle .openapi() method calls
        if (
          t.isMemberExpression(path.node.callee) &&
          t.isIdentifier(path.node.callee.property) &&
          path.node.callee.property.name === "openapi"
        ) {
          stats.changes.openapiToMeta++;
          hasModifications = true;

          // Change openapi to meta
          path.node.callee.property.name = "meta";

          // Check if the argument contains a 'ref' property and change it to 'id'
          if (path.node.arguments.length > 0) {
            const arg = path.node.arguments[0];
            if (t.isObjectExpression(arg)) {
              transformRefToIdInObject(arg);
            }
          }
        }

        // Handle createDocument calls
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "createDocument"
        ) {
          // Transform ref to id in the first argument (document specification)
          if (path.node.arguments.length > 0) {
            const firstArg = path.node.arguments[0];
            if (t.isObjectExpression(firstArg)) {
              transformRefToIdInObject(firstArg);
              hasModifications = true;
            }
          }

          // Handle unionOneOf in the second argument (options)
          if (path.node.arguments.length > 1) {
            const secondArg = path.node.arguments[1];
            if (t.isObjectExpression(secondArg)) {
              transformCreateDocumentOptions(secondArg);
              hasModifications = true;
            }
          }
        }

        // Handle createSchema calls
        if (
          t.isIdentifier(path.node.callee) &&
          path.node.callee.name === "createSchema"
        ) {
          // Transform ref to id in the first argument (schema specification)
          if (path.node.arguments.length > 0) {
            const firstArg = path.node.arguments[0];
            if (t.isObjectExpression(firstArg)) {
              transformRefToIdInObject(firstArg);
              hasModifications = true;
            }
          }

          // Handle schemaType in the second argument (options)
          if (path.node.arguments.length > 1) {
            const secondArg = path.node.arguments[1];
            if (t.isObjectExpression(secondArg)) {
              transformCreateSchemaOptions(secondArg);
              hasModifications = true;
            }
          }
        }
      },

      // Handle ZodOpenApi* type objects
      VariableDeclarator(path) {
        if (t.isIdentifier(path.node.id) && path.node.id.typeAnnotation) {
          const typeAnnotation = path.node.id.typeAnnotation;
          if (
            t.isTSTypeAnnotation(typeAnnotation) &&
            t.isTSTypeReference(typeAnnotation.typeAnnotation)
          ) {
            const typeName = typeAnnotation.typeAnnotation.typeName;
            if (
              t.isIdentifier(typeName) &&
              typeName.name.startsWith("ZodOpenApi")
            ) {
              // This is a ZodOpenApi* type, check if the value is an object expression
              if (t.isObjectExpression(path.node.init)) {
                transformRefToIdInObject(path.node.init);
                hasModifications = true;
              }
            }
          }
        }
      },
    });

    if (hasModifications && !this.options.dryRun) {
      let output = generate(ast, {
        retainLines: true,
        compact: false,
        concise: false,
      });

      // Post-process to comment out effectType properties and add inline TODO comments
      if (stats.changes.effectTypeCommented > 0) {
        output.code = this.commentOutEffectTypeProperties(output.code);
      }

      fs.writeFileSync(filePath, output.code);
    }

    return stats;
  }

  private hasChanges(stats: MigrationStats): boolean {
    const { changes } = stats;
    return (
      changes.removedImports > 0 ||
      changes.removedExtendCalls > 0 ||
      changes.zodImportsMigrated > 0 ||
      changes.openapiToMeta > 0 ||
      changes.refToId > 0 ||
      changes.refTypeToUnusedIO > 0 ||
      changes.unionOneOfToOverride > 0 ||
      changes.effectTypeCommented > 0 ||
      changes.schemaTypeToIO > 0 ||
      changes.componentRefPath > 0 ||
      changes.componentsToSchemaComponents > 0 ||
      changes.createSchemaUnionOneOfToOverride > 0 ||
      changes.createSchemaDefaultDateSchemaToOverride > 0 ||
      changes.defaultDateSchemaToOverride > 0
    );
  }

  private logChanges(stats: MigrationStats): void {
    const { changes } = stats;
    if (changes.removedImports > 0) {
      console.log(
        chalk.blue(
          `    - Removed ${changes.removedImports} extendZodWithOpenApi imports`
        )
      );
    }
    if (changes.removedExtendCalls > 0) {
      console.log(
        chalk.blue(
          `    - Removed ${changes.removedExtendCalls} extendZodWithOpenApi calls`
        )
      );
    }
    if (changes.zodImportsMigrated > 0) {
      console.log(
        chalk.blue(
          `    - Migrated ${changes.zodImportsMigrated} zod imports to 'zod/v4'`
        )
      );
    }
    if (changes.openapiToMeta > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.openapiToMeta} .openapi() to .meta()`
        )
      );
    }
    if (changes.refToId > 0) {
      console.log(chalk.blue(`    - Changed ${changes.refToId} 'ref' to 'id'`));
    }
    if (changes.refTypeToUnusedIO > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.refTypeToUnusedIO} 'refType' to 'unusedIO'`
        )
      );
    }
    if (changes.unionOneOfToOverride > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.unionOneOfToOverride} 'unionOneOf' to 'override'`
        )
      );
    }
    if (changes.effectTypeCommented > 0) {
      console.log(
        chalk.blue(
          `    - Commented out ${changes.effectTypeCommented} 'effectType' properties`
        )
      );
    }
    if (changes.schemaTypeToIO > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.schemaTypeToIO} 'schemaType' to 'io'`
        )
      );
    }
    if (changes.componentRefPath > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.componentRefPath} 'componentRefPath' to 'schemaComponentRefPath'`
        )
      );
    }
    if (changes.componentsToSchemaComponents > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.componentsToSchemaComponents} 'components' to 'schemaComponents'`
        )
      );
    }
    if (changes.createSchemaUnionOneOfToOverride > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.createSchemaUnionOneOfToOverride} 'unionOneOf' to 'opts.override' in createSchema`
        )
      );
    }
    if (changes.createSchemaDefaultDateSchemaToOverride > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.createSchemaDefaultDateSchemaToOverride} 'defaultDateSchema' to 'opts.override' in createSchema`
        )
      );
    }
    if (changes.defaultDateSchemaToOverride > 0) {
      console.log(
        chalk.blue(
          `    - Changed ${changes.defaultDateSchemaToOverride} 'defaultDateSchema' to 'override' in createDocument`
        )
      );
    }
  }

  private aggregateResults(
    results: MigrationStats[],
    filesModified: number
  ): MigrationResult {
    const totals = results.reduce(
      (acc, stats) => ({
        importsRemoved: acc.importsRemoved + stats.changes.removedImports,
        extendCallsRemoved:
          acc.extendCallsRemoved + stats.changes.removedExtendCalls,
        zodImportsMigrated:
          acc.zodImportsMigrated + stats.changes.zodImportsMigrated,
        openapiToMetaChanges:
          acc.openapiToMetaChanges + stats.changes.openapiToMeta,
        refToIdChanges: acc.refToIdChanges + stats.changes.refToId,
        refTypeToUnusedIOChanges:
          acc.refTypeToUnusedIOChanges + stats.changes.refTypeToUnusedIO,
        unionOneOfToOverrideChanges:
          acc.unionOneOfToOverrideChanges + stats.changes.unionOneOfToOverride,
        effectTypeCommented:
          acc.effectTypeCommented + stats.changes.effectTypeCommented,
        schemaTypeToIOChanges:
          acc.schemaTypeToIOChanges + stats.changes.schemaTypeToIO,
        componentRefPathChanges:
          acc.componentRefPathChanges + stats.changes.componentRefPath,
        componentsToSchemaComponentsChanges:
          acc.componentsToSchemaComponentsChanges +
          stats.changes.componentsToSchemaComponents,
        createSchemaUnionOneOfToOverrideChanges:
          acc.createSchemaUnionOneOfToOverrideChanges +
          stats.changes.createSchemaUnionOneOfToOverride,
        createSchemaDefaultDateSchemaToOverrideChanges:
          acc.createSchemaDefaultDateSchemaToOverrideChanges +
          stats.changes.createSchemaDefaultDateSchemaToOverride,
        defaultDateSchemaToOverrideChanges:
          acc.defaultDateSchemaToOverrideChanges +
          stats.changes.defaultDateSchemaToOverride,
      }),
      {
        importsRemoved: 0,
        extendCallsRemoved: 0,
        zodImportsMigrated: 0,
        openapiToMetaChanges: 0,
        refToIdChanges: 0,
        refTypeToUnusedIOChanges: 0,
        unionOneOfToOverrideChanges: 0,
        effectTypeCommented: 0,
        schemaTypeToIOChanges: 0,
        componentRefPathChanges: 0,
        componentsToSchemaComponentsChanges: 0,
        createSchemaUnionOneOfToOverrideChanges: 0,
        createSchemaDefaultDateSchemaToOverrideChanges: 0,
        defaultDateSchemaToOverrideChanges: 0,
      }
    );

    return {
      filesProcessed: results.length,
      filesModified,
      ...totals,
    };
  }

  private createEmptyResult(): MigrationResult {
    return {
      filesProcessed: 0,
      filesModified: 0,
      importsRemoved: 0,
      extendCallsRemoved: 0,
      zodImportsMigrated: 0,
      openapiToMetaChanges: 0,
      refToIdChanges: 0,
      refTypeToUnusedIOChanges: 0,
      unionOneOfToOverrideChanges: 0,
      effectTypeCommented: 0,
      schemaTypeToIOChanges: 0,
      componentRefPathChanges: 0,
      componentsToSchemaComponentsChanges: 0,
      createSchemaUnionOneOfToOverrideChanges: 0,
      createSchemaDefaultDateSchemaToOverrideChanges: 0,
      defaultDateSchemaToOverrideChanges: 0,
    };
  }

  private commentOutEffectTypeProperties(code: string): string {
    const todoComment = `// TODO: effectType was removed
    // Transforms are not introspectable. effectType was introduced to attempt to address this and to try and keep the transform locked to the same type as the input schema.
    // For transform operations, use Zod's native .overwrite() method, wrap your schema in a .pipe(), or declare a manual type.
    // See: https://zod.dev/v4?id=overwrite`;

    // Use regex to find and comment out effectType properties
    const effectTypeRegex = /(\s*)(effectType:\s*[^,\n}]+)([,\n])/g;

    return code.replace(
      effectTypeRegex,
      (match, indent, effectTypeProp, suffix) => {
        // Comment out the effectType property and add TODO comment
        return `${indent}// ${effectTypeProp}${suffix}${indent}${todoComment}${suffix}`;
      }
    );
  }
}
