import { z } from "zod";
import { createSchema } from "zod-openapi";

// Test createSchema with componentRefPath option
const schema1 = createSchema(z.string(), {
  io: "input",
  schemaComponentRefPath: "#/components/schemas/StringInput",
});

const schema2 = createSchema(
  z.object({
    name: z.string(),
    age: z.number(),
  }),
  {
    io: "output",
    schemaComponentRefPath: "#/components/schemas/UserOutput",
    description: "A user object",
  }
);

const schema3 = createSchema(z.union([z.string(), z.number()]), {
  schemaComponentRefPath: "#/components/schemas/StringOrNumber",
  otherOption: "value",
});

// Test createSchema without componentRefPath (should not be affected)
const schema4 = createSchema(z.boolean(), {
  io: "input",
  description: "A boolean schema",
});

export { schema1, schema2, schema3, schema4 };
