import { z } from 'zod';
import { createSchema } from 'zod-openapi';



// Test createSchema with unionOneOf option - should be moved to opts.override
const schema1 = createSchema(z.string(), {
  io: 'input', opts: { override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;} }

});

const schema2 = createSchema(z.object({
  name: z.string(),
  age: z.number()
}), {
  io: 'output',

  description: 'A user object', opts: { override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;} }
});

// Test createSchema with unionOneOf and other options
const schema3 = createSchema(z.union([z.string(), z.number()]), {
  io: 'input',

  schemaComponentRefPath: '#/components/schemas/StringOrNumber', opts: { override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;} }
});

// Test createSchema without unionOneOf (should not be affected)
const schema4 = createSchema(z.boolean(), {
  io: 'input',
  description: 'A boolean schema'
});

// Test createSchema with existing opts (should merge)
const schema5 = createSchema(z.array(z.string()), {
  io: 'output',

  opts: {
    someOtherOption: 'value'
  }
});

export { schema1, schema2, schema3, schema4, schema5 };