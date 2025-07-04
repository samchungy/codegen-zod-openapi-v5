export interface MigrationOptions {
  dryRun?: boolean;
  verbose?: boolean;
  ignorePatterns?: string[];
}

export interface MigrationResult {
  filesProcessed: number;
  filesModified: number;
  importsRemoved: number;
  extendCallsRemoved: number;
  openapiToMetaChanges: number;
  refToIdChanges: number;
  refTypeToUnusedIOChanges: number;
  unionOneOfToOverrideChanges: number;
  effectTypeCommented: number;
  schemaTypeToIOChanges: number;
  componentRefPathChanges: number;
  componentsToSchemaComponentsChanges: number;
  createSchemaUnionOneOfToOverrideChanges: number;
  createSchemaDefaultDateSchemaToOverrideChanges: number;
  defaultDateSchemaToOverrideChanges: number;
}

export interface MigrationStats {
  filename: string;
  changes: {
    removedImports: number;
    removedExtendCalls: number;
    openapiToMeta: number;
    refToId: number;
    refTypeToUnusedIO: number;
    unionOneOfToOverride: number;
    effectTypeCommented: number;
    schemaTypeToIO: number;
    componentRefPath: number;
    componentsToSchemaComponents: number;
    createSchemaUnionOneOfToOverride: number;
    createSchemaDefaultDateSchemaToOverride: number;
    defaultDateSchemaToOverride: number;
  };
}
