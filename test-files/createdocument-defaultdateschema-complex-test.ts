import { z } from 'zod';
import { createDocument } from 'zod-openapi';



// Test createDocument with more complex defaultDateSchema
const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Test API',
    version: '1.0.0'
  }
}, { override: ({ jsonSchema: jsonSchema, zodSchema: zodSchema }) => {const def = zodSchema._zod.def;if (def.type === "date") {jsonSchema.

      type = 'string';jsonSchema.
      format = 'date-time';jsonSchema.
      example = '2023-01-01T00:00:00Z';jsonSchema.
      description = 'An ISO 8601 date-time string';}}

});

export { document };