
import {
  History,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

function formatDate(value) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-LK", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatEvent(event) {
  const labels = {
    role_changed: "Role changed",
    approved_or_reactivated:
      "Approved / reactivated",
    suspended: "Account suspended",
    role_and_status_changed:
      "Role and status changed",
    approval_status_changed:
      "Approval status changed",
  };

  return labels[event] || event;
}

export default function AuditLogTable({
  items,
  loading,
  error,
  page,
  total,
  totalPages,
  onPageChange,
}) {
  return (
    <section className="ca-admin-panel">
      <div className="ca-admin-panel-heading">
        <div>
          <h2>
            <History size={21} />
            Administrative Audit Log
          </h2>

          <p>
            {total} recorded role and account
            status changes.
          </p>
        </div>
      </div>

      {loading && (
        <p role="status">
          Loading audit history...
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
        items.length === 0 && (
          <div className="ca-admin-empty">
            <History size={35} />

            <h3>No Audit Events Yet</h3>

            <p>
              Role and approval changes made
              after migration 010 will appear here.
            </p>
          </div>
        )}

      {!loading &&
        !error &&
        items.length > 0 && (
          <>
            <div className="ca-admin-table-wrap">
              <table className="ca-admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Administrator</th>
                    <th>Target User</th>
                    <th>Action</th>
                    <th>Change</th>
                    <th>Reason</th>
                  </tr>
                </thead>

                <tbody>
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        {formatDate(
                          item.occurred_at
                        )}
                      </td>

                      <td>
                        {item.actor_email ||
                          (item.actor_id
                            ? item.actor_id
                            : "Database / system")}
                      </td>

                      <td>
                        {item.target_email ||
                          item.target_user_id}
                      </td>

                      <td>
                        {formatEvent(
                          item.event_type
                        )}
                      </td>

                      <td>
                        <div className="ca-admin-audit-change">
                          {item.previous_role !==
                            item.new_role && (
                            <span>
                              Role:{" "}
                              {item.previous_role}
                              {" → "}
                              {item.new_role}
                            </span>
                          )}

                          {item.previous_status !==
                            item.new_status && (
                            <span>
                              Status:{" "}
                              {item.previous_status}
                              {" → "}
                              {item.new_status}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        {item.reason ||
                          "No reason recorded"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="ca-admin-pagination">
              <span>
                Page {page} of {totalPages}
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    loading || page <= 1
                  }
                  onClick={() =>
                    onPageChange(page - 1)
                  }
                >
                  <ChevronLeft size={16} />
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    loading ||
                    page >= totalPages
                  }
                  onClick={() =>
                    onPageChange(page + 1)
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
  );
}
