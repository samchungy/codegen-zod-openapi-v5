import { z } from 'zod';




// Test refType transformation
const schema1 = z.string().meta({
  description: 'A string with refType',
  unusedIO: 'input'
});

const schema2 = z.number().meta({
  description: 'A number with refType',
  unusedIO: 'output',
  id: 'NumberSchema'
});

const schema3 = z.object({
  name: z.string().meta({
    description: 'Name field',
    unusedIO: 'input',
    param: { id: 'nameParam' }
  }),
  age: z.number().meta({
    description: 'Age field',
    unusedIO: 'output',
    header: { id: 'ageHeader' }
  })
}).meta({
  id: 'PersonSchema',
  unusedIO: 'both'
});

// Test mixed scenarios
const complexSchema = z.object({
  data: z.array(z.string()).meta({
    description: 'Data array',
    unusedIO: 'input',
    id: 'DataArray'
  }),
  metadata: z.object({
    count: z.number(),
    refType: 'should-not-change' // This should stay as 'refType' (property name)
  }).meta({
    unusedIO: 'output'
  })
}).meta({
  id: 'ComplexSchema',
  unusedIO: 'both'
});

export { schema1, schema2, schema3, complexSchema };