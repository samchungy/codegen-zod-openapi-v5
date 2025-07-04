import { z } from 'zod';
import { createDocument } from 'zod-openapi';



// Test only createDocument with unionOneOf option
const document = createDocument({
  openapi: '3.1.0',
  info: {
    title: 'Test API',
    version: '1.0.0'
  }
}, { override: ({ jsonSchema: jsonSchema }) => {jsonSchema.oneOf = jsonSchema.anyOf;delete jsonSchema.anyOf;} });

export { document };