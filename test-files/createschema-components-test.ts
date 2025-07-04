import { z } from "zod";
import { createSchema } from "zod-openapi";

// Test createSchema with components option that should be changed to schemaComponents
const schema1 = createSchema(z.string(), {
  io: "input",
  schemaComponents: {
    examples: {
      example1: {
        summary: "Example 1",
        value: "hello",
      },
    },
  },
});

const schema2 = createSchema(
  z.object({
    name: z.string(),
    age: z.number(),
  }),
  {
    io: "output",
    schemaComponents: {
      examples: {
        userExample: {
          summary: "User example",
          value: { name: "John", age: 30 },
        },
      },
    },
    description: "A user object",
  }
);

// Test createSchema without components (should not be affected)
const schema3 = createSchema(z.boolean(), {
  io: "input",
  description: "A boolean schema",
});

export { schema1, schema2, schema3 };
