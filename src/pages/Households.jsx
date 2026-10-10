import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { AlertCircle, House, MapPin, Search, RotateCcw } from "lucide-react";
import useAuth from "../hooks/useAuth";
import { listHouseholds, restoreHousehold } from "../services/householdEditService";

export default function Households() {
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const canEdit = isAdmin || profile?.role === "editor";
  const [archived, setArchived] = useState(false);
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [restoring, setRestoring] = useState(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    listHouseholds({ archived: isAdmin && archived })
      .then((rows) => { if (active) setRecords(rows); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [archived, isAdmin, revision]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((family) => [
      family.family_code, family.family_name, family.location?.location_code,
      family.location?.address_line, family.location?.village,
    ].some((v) => v?.toLowerCase().includes(q)));
  }, [records, search]);

  async function restore(family) {
    if (!window.confirm(`Restore ${family.family_code}? Its location will also be reactivated if necessary.`)) return;
    setError("");
    setRestoring(family.id);
    try {
      await restoreHousehold(family.id);
      setRevision((n) => n + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setRestoring(null);
    }
  }

  return (
    <div className="records-page">
      <header className="section-heading ca-records-heading">
        <div><h2>Households</h2><p>{archived ? "Archived household records" : "Active family records from Supabase"}</p></div>
        {canEdit && <Link to="/map" className="ca-outline-link"><MapPin size={17} /> Register from Map</Link>}
      </header>
      <div className="ca-records-tools">
        <label className="ca-directory-search ca-records-search">
          <Search size={17} />
          <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code or address" aria-label="Search households" />
        </label>
        {isAdmin && (
          <label className="ca-archive-toggle"><input type="checkbox" checked={archived} onChange={(e) => setArchived(e.target.checked)} /> Show archived</label>
        )}
      </div>
      {loading && <div className="page-card" role="status">Loading households...</div>}
      {error && <div className="page-card" role="alert"><AlertCircle size={21} /> {error}</div>}
      {!loading && !error && filtered.length === 0 && (
        <div className="page-card"><h2>No households found</h2><p>{archived ? "There are no archived families matching your search." : "Try a different search or register a household from the map."}</p></div>
      )}
      {!loading && !error && filtered.length > 0 && (
        <>
          <p className="records-count">Showing {filtered.length} of {records.length} {archived ? "archived" : "active"} households</p>
          <div className="records-grid">
            {filtered.map((family) => (
              <article className="record-card ca-household-row" key={family.id}>
                <div className="record-icon"><House size={23} /></div>
                <div className="record-content">
                  <h3>{family.family_name}</h3><span>{family.family_code}</span>
                  <p><MapPin size={15} />{family.location?.address_line || "No address recorded"}</p>
                  <div className="ca-record-actions">
                    <Link className="ca-edit-secondary" to={`/households/${family.id}`}>View details{canEdit && !archived ? " / Edit" : ""}</Link>
                    {isAdmin && archived && (
                      <button type="button" className="ca-edit-secondary" disabled={restoring === family.id} onClick={() => restore(family)}>
                        <RotateCcw size={15} /> {restoring === family.id ? "Restoring..." : "Restore household"}
                      </button>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
