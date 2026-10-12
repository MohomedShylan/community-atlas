
import { supabase } from "../lib/supabase";

function db() {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured."
    );
  }

  return supabase;
}

const ROLES = [
  "admin",
  "editor",
  "viewer",
];

const STATUSES = [
  "all",
  "pending",
  "approved",
  "suspended",
];

// ==========================================
// 1. LIST STAFF ACCOUNTS
// ==========================================

export async function getAdminUsers({
  search = "",
  status = "all",
  page = 1,
  pageSize = 12,
} = {}) {
  const safeStatus =
    STATUSES.includes(status)
      ? status
      : "all";

  const safePage = Math.max(
    1,
    Math.floor(Number(page) || 1)
  );

  const safeSize = Math.min(
    50,
    Math.max(
      1,
      Math.floor(Number(pageSize) || 12)
    )
  );

  const { data, error } = await db().rpc(
    "admin_list_users",
    {
      p_search: String(search)
        .trim()
        .slice(0, 120),

      p_status: safeStatus,
      p_page: safePage,
      p_page_size: safeSize,
    }
  );

  if (error) throw error;

  return {
    items: data?.items ?? [],
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? safePage),
    totalPages: Math.max(
      1,
      Math.ceil(
        Number(data?.total ?? 0) / safeSize
      )
    ),
  };
}

// ==========================================
// 2. APPROVE OR REACTIVATE ACCOUNT
// ==========================================

export async function approveAdminUser(
  userId,
  reason
) {
  return manageUser({
    userId,
    action: "approve",
    reason,
  });
}

// ==========================================
// 3. SUSPEND ACCOUNT
// ==========================================

export async function suspendAdminUser(
  userId,
  reason
) {
  return manageUser({
    userId,
    action: "suspend",
    reason,
  });
}

// ==========================================
// 4. CHANGE USER ROLE
// ==========================================

export async function changeAdminUserRole(
  userId,
  newRole,
  reason
) {
  if (!ROLES.includes(newRole)) {
    throw new Error("Invalid role selected.");
  }

  return manageUser({
    userId,
    action: "set_role",
    newRole,
    reason,
  });
}

// ==========================================
// 5. COMMON SECURE ACTION
// ==========================================

async function manageUser({
  userId,
  action,
  newRole = null,
  reason,
}) {
  if (!userId) {
    throw new Error("Select a user first.");
  }

  const cleanedReason =
    String(reason ?? "").trim();

  if (
    cleanedReason.length < 8 ||
    cleanedReason.length > 300
  ) {
    throw new Error(
      "Enter a reason between 8 and 300 characters."
    );
  }

  const { data, error } = await db().rpc(
    "admin_manage_user",
    {
      p_target_user_id: userId,
      p_action: action,
      p_new_role: newRole,
      p_reason: cleanedReason,
    }
  );

  if (error) throw error;

  return data;
}

// ==========================================
// 6. LIST ADMINISTRATIVE AUDIT HISTORY
// ==========================================

export async function getAdminAudit({
  page = 1,
  pageSize = 15,
} = {}) {
  const safePage = Math.max(
    1,
    Math.floor(Number(page) || 1)
  );

  const safeSize = Math.min(
    50,
    Math.max(
      1,
      Math.floor(Number(pageSize) || 15)
    )
  );

  const { data, error } = await db().rpc(
    "admin_list_audit",
    {
      p_page: safePage,
      p_page_size: safeSize,
    }
  );

  if (error) throw error;

  return {
    items: data?.items ?? [],
    total: Number(data?.total ?? 0),
    page: Number(data?.page ?? safePage),
    totalPages: Math.max(
      1,
      Math.ceil(
        Number(data?.total ?? 0) / safeSize
      )
    ),
  };
}
