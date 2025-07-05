import { createSchema } from "zod-openapi";
import { z } from "zod";

// Test basic transformations
const basicSchema = createSchema(z.string(), {
  schemaType: "input",
  componentRefPath: "#/components/schemas/{name}",
  components: { schemas: {} },
});

// Test unionOneOf transformation
const unionSchema = createSchema(z.union([z.string(), z.number()]), {
  unionOneOf: true,
});

// Test defaultDateSchema transformation
const dateSchema = createSchema(z.string(), {
  defaultDateSchema: { type: "string", format: "date" },
});

// Test combined transformations
const complexSchema = createSchema(z.union([z.string(), z.number()]), {
  schemaType: "output",
  componentRefPath: "#/components/responses/{name}",
  components: { responses: {} },
  unionOneOf: true,
  defaultDateSchema: { type: "string", format: "date-time" },
});
