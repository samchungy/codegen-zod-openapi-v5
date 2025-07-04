import { z } from "zod";
import { createSchema, extendZodWithOpenApi } from "zod-openapi";

extendZodWithOpenApi(z);

// Test createSchema with defaultDateSchema - should be converted to opts.override
const schema1 = createSchema(z.date(), {
  schemaType: "input",
  defaultDateSchema: {
    type: "string",
    format: "date-time",
  },
});

// Test createSchema with both unionOneOf and defaultDateSchema - should merge
const schema2 = createSchema(z.union([z.date(), z.string()]), {
  schemaType: "output",
  unionOneOf: true,
  defaultDateSchema: {
    type: "string",
    format: "date-time",
    example: "2023-01-01T00:00:00Z",
  },
});

// Test createSchema with complex defaultDateSchema
const schema3 = createSchema(z.date(), {
  schemaType: "input",
  defaultDateSchema: {
    type: "string",
    format: "date-time",
    example: "2023-01-01T00:00:00Z",
    description: "An ISO 8601 date-time string",
  },
  description: "A date schema",
});

export { schema1, schema2, schema3 };
