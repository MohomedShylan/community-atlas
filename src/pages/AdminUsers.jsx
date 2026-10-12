
import {
  useEffect,
  useState,
} from "react";

import {
  Link,
} from "react-router";

import {
  ShieldCheck,
  ShieldAlert,
  Users,
  Search,
  History,
  CheckCircle2,
  UserX,
  RotateCcw,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
} from "lucide-react";

import useAuth from "../hooks/useAuth";

import {
  getAdminUsers,
  getAdminAudit,
  approveAdminUser,
  suspendAdminUser,
  changeAdminUserRole,
} from "../services/adminService";

import UserActionDialog from
  "../components/admin/UserActionDialog";

import AuditLogTable from
  "../components/admin/AuditLogTable";

const USER_PAGE_SIZE = 12;
const AUDIT_PAGE_SIZE = 15;

function formatDate(value) {
  if (!value) return "Never";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function readableStatus(status) {
  return {
    pending: "Pending Approval",
    approved: "Approved",
    suspended: "Suspended",
  }[status] || status;
}

function readableRole(role) {
  return {
    admin: "Administrator",
    editor: "Editor",
    viewer: "Viewer",
  }[role] || role;
}

export default function AdminUsers() {
  const { user, profile } = useAuth();

  const isAdmin =
    profile?.role === "admin" &&
    profile?.is_active === true;

  const ownUserId =
    user?.id || profile?.id;

  // ========================================
  // PAGE STATE
  // ========================================

  const [tab, setTab] = useState("users");

  const [searchInput, setSearchInput] =
    useState("");

  const [search, setSearch] =
    useState("");

  const [status, setStatus] =
    useState("all");

  const [page, setPage] =
    useState(1);

  const [users, setUsers] =
    useState([]);

  const [userTotal, setUserTotal] =
    useState(0);

  const [userPages, setUserPages] =
    useState(1);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [notice, setNotice] =
    useState("");

  const [revision, setRevision] =
    useState(0);

  // ========================================
  // AUDIT STATE
  // ========================================

  const [auditPage, setAuditPage] =
    useState(1);

  const [auditItems, setAuditItems] =
    useState([]);

  const [auditTotal, setAuditTotal] =
    useState(0);

  const [auditPages, setAuditPages] =
    useState(1);

  const [auditLoading, setAuditLoading] =
    useState(false);

  const [auditError, setAuditError] =
    useState("");

  // ========================================
  // ACTION CONFIRMATION STATE
  // ========================================

  const [pendingAction, setPendingAction] =
    useState(null);

  const [saving, setSaving] =
    useState(false);

  // ========================================
  // DEBOUNCED ACCOUNT SEARCH
  // ========================================

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // ========================================
  // LOAD USER ACCOUNTS
  // ========================================

  useEffect(() => {
    if (!isAdmin || tab !== "users") {
      setLoading(false);
      return;
    }

    let active = true;

    setLoading(true);
    setError("");

    getAdminUsers({
      search,
      status,
      page,
      pageSize: USER_PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;

        setUsers(result.items);
        setUserTotal(result.total);
        setUserPages(result.totalPages);
      })
      .catch((err) => {
        if (active) {
          setError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    isAdmin,
    tab,
    search,
    status,
    page,
    revision,
  ]);

  // ========================================
  // LOAD AUDIT HISTORY
  // ========================================

  useEffect(() => {
    if (!isAdmin || tab !== "audit") {
      return;
    }

    let active = true;

    setAuditLoading(true);
    setAuditError("");

    getAdminAudit({
      page: auditPage,
      pageSize: AUDIT_PAGE_SIZE,
    })
      .then((result) => {
        if (!active) return;

        setAuditItems(result.items);
        setAuditTotal(result.total);
        setAuditPages(result.totalPages);
      })
      .catch((err) => {
        if (active) {
          setAuditError(err.message);
        }
      })
      .finally(() => {
        if (active) {
          setAuditLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    isAdmin,
    tab,
    auditPage,
    revision,
  ]);

  // ========================================
  // USER ACTIONS
  // ========================================

  function prepareAction(
    targetUser,
    type,
    newRole = null
  ) {
    setNotice("");
    setError("");

    if (targetUser.id === ownUserId) {
      setError(
        "You cannot change your own administrative account."
      );
      return;
    }

    setPendingAction({
      user: targetUser,
      type,
      newRole,
    });
  }

  async function confirmAction(reason) {
    if (!pendingAction || saving) {
      return;
    }

    setSaving(true);
    setNotice("");

    const action = pendingAction;

    try {
      if (action.type === "approve") {
        await approveAdminUser(
          action.user.id,
          reason
        );
      } else if (action.type === "suspend") {
        await suspendAdminUser(
          action.user.id,
          reason
        );
      } else if (
        action.type === "set_role"
      ) {
        await changeAdminUserRole(
          action.user.id,
          action.newRole,
          reason
        );
      }

      setPendingAction(null);

      setNotice(
        `Account updated successfully: ${
          action.user.email || action.user.id
        }`
      );

      setPage(1);
      setAuditPage(1);
      setRevision((value) => value + 1);
    } catch (err) {
      throw err;
    } finally {
      setSaving(false);
    }
  }

  function refresh() {
    setRevision((value) => value + 1);
  }

  function changeStatus(value) {
    setStatus(value);
    setPage(1);
  }

  // ========================================
  // PERMISSION SCREEN
  // ========================================

  if (!isAdmin) {
    return (
      <div className="ca-admin-page">
        <section className="ca-admin-state">
          <ShieldAlert size={45} />

          <h2>Administrator Access Required</h2>

          <p>
            Only approved Administrators can
            review staff accounts, assign roles,
            or view administrative audit logs.
          </p>

          <Link
            to="/"
            className="ca-admin-secondary"
          >
            Return to Dashboard
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="ca-admin-page">
      {/* HEADER */}
      <header className="ca-admin-header">
        <div>
          <span className="ca-admin-eyebrow">
            COMMUNITY ATLAS / ADMINISTRATION
          </span>

          <h1>User Management</h1>

          <p>
            Approve staff accounts, manage roles,
            and review administrative activity.
          </p>
        </div>

        <button
          type="button"
          className="ca-admin-secondary"
          onClick={refresh}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </header>

      {/* NAVIGATION TABS */}
      <nav
        className="ca-admin-tabs"
        aria-label="Administration sections"
      >
        <button
          type="button"
          className={
            tab === "users"
              ? "is-active"
              : ""
          }
          aria-current={
            tab === "users" ? "page" : undefined
          }
          onClick={() =>
            setTab("users")
          }
        >
          <Users size={18} />
          Staff Accounts
        </button>

        <button
          type="button"
          className={
            tab === "audit"
              ? "is-active"
              : ""
          }
          aria-current={
            tab === "audit" ? "page" : undefined
          }
          onClick={() =>
            setTab("audit")
          }
        >
          <History size={18} />
          Audit History
        </button>
      </nav>

      {/* SUCCESS NOTIFICATION */}
      {notice && (
        <div
          className="ca-admin-notice"
          role="status"
        >
          <CheckCircle2 size={19} />
          {notice}
        </div>
      )}

      {/* STAFF ACCOUNTS TAB */}
      {tab === "users" && (
        <>
          <section className="ca-admin-panel">
            <div className="ca-admin-panel-heading">
              <div>
                <h2>
                  <ShieldCheck size={21} />
                  Staff Directory
                </h2>

                <p>
                  {userTotal} matching accounts.
                  Pending accounts appear first.
                </p>
              </div>
            </div>

            {/* FILTERS */}
            <div className="ca-admin-filters">
              <div className="ca-admin-search">
                <Search size={18} />

                <input
                  type="search"
                  value={searchInput}
                  maxLength={120}
                  placeholder="Search email or user UUID"
                  aria-label="Search staff accounts"
                  onChange={(event) =>
                    setSearchInput(
                      event.target.value
                    )
                  }
                />
              </div>

              <select
                value={status}
                onChange={(event) =>
                  changeStatus(
                    event.target.value
                  )
                }
                aria-label="Filter account status"
              >
                <option value="all">
                  All Accounts
                </option>

                <option value="pending">
                  Pending Approval
                </option>

                <option value="approved">
                  Approved
                </option>

                <option value="suspended">
                  Suspended
                </option>
              </select>
            </div>

            {loading && (
              <p
                className="ca-admin-loading"
                role="status"
              >
                Loading staff accounts...
              </p>
            )}

            {error && (
              <div
                className="ca-admin-alert"
                role="alert"
              >
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {!loading &&
              !error &&
              users.length === 0 && (
                <div className="ca-admin-empty">
                  <Users size={38} />

                  <h3>No Accounts Found</h3>

                  <p>
                    Try another email or status
                    filter.
                  </p>
                </div>
              )}

            {/* STAFF TABLE */}
            {!loading &&
              !error &&
              users.length > 0 && (
                <>
                  <div className="ca-admin-table-wrap">
                    <table className="ca-admin-table">
                      <thead>
                        <tr>
                          <th>User Account</th>
                          <th>Role</th>
                          <th>Status</th>
                          <th>Registered</th>
                          <th>Last Sign-In</th>
                          <th>Actions</th>
                        </tr>
                      </thead>

                      <tbody>
                        {users.map((item) => {
                          const isSelf =
                            item.id === ownUserId;

                          return (
                            <tr key={item.id}>
                              {/* USER */}
                              <td>
                                <div className="ca-admin-user-cell">
                                  <strong>
                                    {item.email ||
                                      "Email not available"}
                                  </strong>

                                  {isSelf && (
                                    <span className="ca-admin-you">
                                      Your Account
                                    </span>
                                  )}

                                  <small>
                                    {item.id}
                                  </small>

                                  {!item.email_confirmed && (
                                    <small>
                                      Email not confirmed
                                    </small>
                                  )}
                                </div>
                              </td>

                              {/* ROLE */}
                              <td>
                                <select
                                  className="ca-admin-role-select"
                                  value={item.role}
                                  disabled={
                                    saving || isSelf
                                  }
                                  aria-label={
                                    `Role for ${item.email}`
                                  }
                                  onChange={(event) =>
                                    prepareAction(
                                      item,
                                      "set_role",
                                      event.target.value
                                    )
                                  }
                                >
                                  <option value="admin">
                                    Administrator
                                  </option>

                                  <option value="editor">
                                    Editor
                                  </option>

                                  <option value="viewer">
                                    Viewer
                                  </option>
                                </select>
                              </td>

                              {/* STATUS */}
                              <td>
                                <span
                                  className={
                                    `ca-admin-status status-${item.approval_status}`
                                  }
                                >
                                  {readableStatus(
                                    item.approval_status
                                  )}
                                </span>
                              </td>

                              {/* REGISTERED */}
                              <td>
                                {formatDate(
                                  item.created_at
                                )}
                              </td>

                              {/* LAST SIGN IN */}
                              <td>
                                {formatDate(
                                  item.last_sign_in_at
                                )}
                              </td>

                              {/* ACTIONS */}
                              <td>
                                <div className="ca-admin-row-actions">
                                  {isSelf ? (
                                    <span className="ca-admin-muted">
                                      Protected
                                    </span>
                                  ) : (
                                    <>
                                      {item.approval_status !==
                                        "approved" && (
                                        <button
                                          type="button"
                                          className="ca-admin-approve"
                                          onClick={() =>
                                            prepareAction(
                                              item,
                                              "approve"
                                            )
                                          }
                                        >
                                          {item.approval_status ===
                                          "suspended" ? (
                                            <RotateCcw size={15} />
                                          ) : (
                                            <CheckCircle2 size={15} />
                                          )}

                                          {item.approval_status ===
                                          "suspended"
                                            ? "Reactivate"
                                            : "Approve"}
                                        </button>
                                      )}

                                      {item.approval_status ===
                                        "approved" && (
                                        <button
                                          type="button"
                                          className="ca-admin-suspend"
                                          onClick={() =>
                                            prepareAction(
                                              item,
                                              "suspend"
                                            )
                                          }
                                        >
                                          <UserX size={15} />
                                          Suspend
                                        </button>
                                      )}
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* PAGINATION */}
                  <div className="ca-admin-pagination">
                    <span>
                      Page {page} of {userPages}
                    </span>

                    <div>
                      <button
                        type="button"
                        disabled={
                          page <= 1 || loading
                        }
                        onClick={() =>
                          setPage((value) =>
                            Math.max(1, value - 1)
                          )
                        }
                      >
                        <ChevronLeft size={16} />
                        Previous
                      </button>

                      <button
                        type="button"
                        disabled={
                          page >= userPages ||
                          loading
                        }
                        onClick={() =>
                          setPage((value) =>
                            value + 1
                          )
                        }
                      >
                        Next
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                </>
              )}
          </section>

          {/* ADMINISTRATION GUIDANCE */}
          <div className="ca-admin-guidance">
            <ShieldCheck size={20} />

            <div>
              <strong>
                How account approvals work
              </strong>

              <p>
                New profiles begin as pending Viewers.
                Administrators can change their role,
                then approve the account. Suspending
                a user disables application access
                without deleting the Auth user or
                community records.
              </p>
            </div>
          </div>
        </>
      )}

      {/* AUDIT TAB */}
      {tab === "audit" && (
        <AuditLogTable
          items={auditItems}
          loading={auditLoading}
          error={auditError}
          page={auditPage}
          total={auditTotal}
          totalPages={auditPages}
          onPageChange={setAuditPage}
        />
      )}

      {/* ACTION CONFIRMATION */}
      {pendingAction && (
        <UserActionDialog
          key={
            `${pendingAction.user.id}-${pendingAction.type}-${pendingAction.newRole || ""}`
          }
          action={pendingAction}
          saving={saving}
          onConfirm={confirmAction}
          onCancel={() =>
            setPendingAction(null)
          }
        />
      )}
    </div>
  );
}
