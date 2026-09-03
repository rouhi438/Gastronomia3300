import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

import { createClient } from "@supabase/supabase-js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const [action, userId] = process.argv.slice(2);

if (!["grant", "revoke"].includes(action) || !UUID_PATTERN.test(userId ?? "")) {
  console.error(
    "Usage: node --env-file=.env.local scripts/manage-admin-role.mjs <grant|revoke> <user-uuid>",
  );
  process.exit(1);
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

const readline = createInterface({ input, output });

async function main() {
  const {
    data: { user },
    error: lookupError,
  } = await supabase.auth.admin.getUserById(userId);

  if (lookupError || !user) {
    throw new Error(lookupError?.message || "User was not found.");
  }

  const projectHost = new URL(supabaseUrl).hostname;
  const currentRole = user.app_metadata?.role ?? "none";
  const confirmation = action === "grant" ? "GRANT ADMIN" : "REVOKE ADMIN";

  console.log(`Project: ${projectHost}`);
  console.log(`User: ${user.email ?? user.id}`);
  console.log(`Current role: ${currentRole}`);
  console.log(`Requested action: ${action}`);

  const answer = await readline.question(
    `Type "${confirmation}" to continue: `,
  );

  if (answer.trim() !== confirmation) {
    console.log("Cancelled. No changes were made.");
    return;
  }

  const nextRole = action === "grant" ? "admin" : null;

  const {
    data: { user: updatedUser },
    error: updateError,
  } = await supabase.auth.admin.updateUserById(user.id, {
    app_metadata: {
      role: nextRole,
    },
  });

  if (updateError || !updatedUser) {
    throw new Error(updateError?.message || "Role update failed.");
  }

  console.log(
    `Role updated successfully: ${updatedUser.app_metadata?.role ?? "none"}`,
  );
}

try {
  await main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  readline.close();
}
