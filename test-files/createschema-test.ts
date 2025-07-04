import { z } from "zod";
import { createSchema } from "zod-openapi";

// Test createSchema with schemaType option
const inputSchema = createSchema(z.string(), { io: "input" });

const outputSchema = createSchema(
  z.object({
    name: z.string(),
    age: z.number(),
  }),
  { io: "output" }
);

const schema1 = createSchema(z.union([z.string(), z.number()]), {
  io: "input",
  description: "A union schema",
});

// Test createSchema with other options (should not be transformed)
const schema2 = createSchema(z.boolean(), {
  otherOption: "value",
  description: "A boolean schema",
});

// Test createSchema without second argument
const schema3 = createSchema(z.array(z.string()));

export { inputSchema, outputSchema, schema1, schema2, schema3 };
