import { z } from 'zod';




// Test unionOneOf transformation
const unionSchema1 = z.union([z.string(), z.number()]).meta({
  override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;}
});

const unionSchema2 = z.union([z.string(), z.number()]).meta({
  description: 'A union with unionOneOf',
  override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;},
  id: 'UnionSchema'
});

const unionSchema3 = z.union([
z.string(),
z.number(),
z.boolean()]
).meta({
  override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;},
  unusedIO: 'input',
  id: 'ComplexUnion'
});

// Test mixed cases
const complexSchema = z.object({
  data: z.union([z.string(), z.number()]).meta({
    override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;},
    description: 'Data union',
    id: 'DataUnion'
  }),
  type: z.enum(['A', 'B']).meta({
    description: 'Type enum',
    id: 'TypeEnum'
  })
}).meta({
  id: 'ComplexSchema'
});

// Test unionOneOf: false (should not be transformed)
const unionSchema4 = z.union([z.string(), z.number()]).meta({
  unionOneOf: false,
  id: 'NotTransformed'
});

export { unionSchema1, unionSchema2, unionSchema3, complexSchema, unionSchema4 };