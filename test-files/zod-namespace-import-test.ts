// Test case 2: namespace import (should still be transformed)
import * as z from "zod/v4";

const schema2 = z.string();
