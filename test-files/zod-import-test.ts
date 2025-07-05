// Test case 1: named import
import * as z from "zod/v4";

// Test case 2: should NOT be migrated (different module)
import { z as otherZ } from "other-lib";

const schema1 = z.string();
