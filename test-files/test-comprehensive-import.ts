
import * as z from "zod/v4";


// This should also be removed


const schema = z.string().meta({ id: 'TestSchema', description: 'A test schema' });
const anotherSchema = z.number().meta({ unusedIO: 'input' });