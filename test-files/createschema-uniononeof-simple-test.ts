import { z } from 'zod';
import { createSchema } from 'zod-openapi';



// Test createSchema with unionOneOf - should create new opts
const schema1 = createSchema(z.string(), {
  io: 'output',

  description: 'A string schema', opts: { override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;} }
});

export { schema1 };