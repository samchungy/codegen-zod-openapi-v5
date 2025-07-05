import { createSchema } from 'zod-openapi';
import { z } from 'zod';

const schema = createSchema(z.string(), {
  schemaType: 'input'
});{ createSchema } from 'zod-openapi';
import * as z from "zod/v4";

const schema = createSchema({
  schemaType: 'input',
  schema: z.string()
});
