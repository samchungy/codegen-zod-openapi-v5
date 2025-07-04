import { z } from 'zod';
import { createSchema } from 'zod-openapi';



// Test createSchema with existing opts and unionOneOf - should merge with new format
const schema1 = createSchema(z.union([z.string(), z.number()]), {
  io: 'output',

  opts: {
    someOtherOption: 'value', override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {const def = zodSchema._zod.def;if (def.type === "union") {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;}}
  }
});

export { schema1 };