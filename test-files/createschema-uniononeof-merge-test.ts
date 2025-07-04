import { z } from "zod";
import { createSchema } from "zod-openapi";

// Test createSchema with existing opts and unionOneOf - should merge
const schema1 = createSchema(z.array(z.string()), {
  io: "output",

  opts: {
    someOtherOption: "value",
    override: ({ jsonSchema: jsonSchema }) => {
      jsonSchema.oneOf = jsonSchema.anyOf;
      delete jsonSchema.anyOf;
    },
  },
});

export { schema1 };
