import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { AlertCircle, ArrowLeft, MapPin, Pencil, Trash2, Save, X } from "lucide-react";
import useAuth from "../hooks/useAuth";
import HouseholdEditForm from "../components/households/HouseholdEditForm";
import {
  getHouseholdProfile, saveHouseholdChanges, archiveHousehold,
  updateHouseholdLocation,
} from "../services/householdEditService";

function LocationEditor({ location, familyCount, saving, onSave }) {
  const [addressLine, setAddressLine] = useState(location.address_line ?? "");
  const [village, setVillage] = useState(location.village ?? "");
  const [district, setDistrict] = useState(location.district ?? "");
  const [latitude, setLatitude] = useState(String(location.latitude ?? ""));
  const [longitude, setLongitude] = useState(String(location.longitude ?? ""));
  const [confirmShared, setConfirmShared] = useState(false);
  const [error, setError] = useState("");
  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (!addressLine.trim() || latitude.trim() === "" || longitude.trim() === "" ||
        !Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return setError("Enter an address and valid GPS coordinates.");
    }
    if (familyCount > 1 && !confirmShared) {
      return setError("Confirm that all families at this shared location will be affected.");
    }
    try {
      await onSave({ addressLine: addressLine.trim(), village: village.trim(), district: district.trim(),
        latitude: lat, longitude: lng, confirmShared });
    } catch (err) { setError(err.message); }
  }
  return (
    <form className="ca-edit-form" onSubmit={handleSubmit}>
      <h2>Edit location: {location.location_code}</h2>
      <p className="ca-edit-muted">Changing this point moves the marker for every family registered here. To choose another point, click the map, copy its coordinates, and enter them below.</p>
      <div className="ca-edit-grid">
        <label className="ca-edit-wide">Street address<input required maxLength={300} value={addressLine} onChange={(e) => setAddressLine(e.target.value)} /></label>
        <label>Village<input maxLength={120} value={village} onChange={(e) => setVillage(e.target.value)} /></label>
        <label>District<input maxLength={120} value={district} onChange={(e) => setDistrict(e.target.value)} /></label>
        <label>Latitude<input required type="number" step="0.000001" min="-90" max="90" value={latitude} onChange={(e) => setLatitude(e.target.value)} /></label>
        <label>Longitude<input required type="number" step="0.000001" min="-180" max="180" value={longitude} onChange={(e) => setLongitude(e.target.value)} /></label>
      </div>
      {familyCount > 1 && (
        <label className="ca-edit-warning"><input type="checkbox" checked={confirmShared} onChange={(e) => setConfirmShared(e.target.checked)} /> This address is shared by {familyCount} active families. I understand the change affects all of them.</label>
      )}
      {error && <p className="ca-edit-error" role="alert">{error}</p>}
      <button className="ca-edit-primary" disabled={saving} type="submit"><Save size={16} /> {saving ? "Saving..." : "Save location"}</button>
    </form>
  );
}

export default function HouseholdProfile() {
  const { familyId } = useParams();
  const navigate = useNavigate();
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";
  const canEdit = isAdmin || profile?.role === "editor";
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mode, setMode] = useState("view");
  const [saving, setSaving] = useState(false);
  const [confirmCode, setConfirmCode] = useState("");
  const [revision, setRevision] = useState(0);

  const refresh = useCallback(() => setRevision((n) => n + 1), []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError("");
    getHouseholdProfile(familyId)
      .then((data) => { if (active) setRecord(data); })
      .catch((err) => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [familyId, revision]);

  async function saveFamily(payload) {
    setSaving(true); setNotice("");
    try {
      await saveHouseholdChanges(familyId, payload);
      setMode("view"); setNotice("Family and member changes saved."); refresh();
    } finally { setSaving(false); }
  }
  async function saveLocation(values) {
    setSaving(true); setNotice("");
    try {
      await updateHouseholdLocation(record.family.location.id, values);
      setMode("view"); setNotice("Location updated. All linked families now use its new coordinates."); refresh();
    } finally { setSaving(false); }
  }
  async function removeFamily() {
    if (!record || confirmCode !== record.family.family_code) return;
    setSaving(true); setError("");
    try {
      await archiveHousehold(familyId, confirmCode);
      navigate("/households", { replace: true });
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  }

  if (loading) return <div className="page-card" role="status">Loading household...</div>;
  if (error && !record) return <div className="page-card" role="alert"><AlertCircle size={21} /> {error}</div>;
  if (!record) return <div className="page-card">Household not found.</div>;

  const { family, members, locationFamilyCount } = record;
  const activeMembers = members.filter((member) => !member.is_archived);
  return (
    <div className="ca-household-profile">
      <Link className="ca-registration-back" to="/households"><ArrowLeft size={17} /> Back to Households</Link>
      <header className="ca-profile-heading">
        <div><small>{family.family_code}</small><h1>{family.family_name}</h1><p>{family.is_archived ? "Archived household" : "Household details and member management"}</p></div>
        {!family.is_archived && canEdit && (
          <div className="ca-record-actions">
            <button className="ca-edit-secondary" onClick={() => setMode(mode === "family" ? "view" : "family")}><Pencil size={16} /> Edit family</button>
            {isAdmin && <button className="ca-edit-secondary" onClick={() => setMode(mode === "location" ? "view" : "location")}><MapPin size={16} /> Edit location</button>}
            {isAdmin && <button className="ca-edit-danger" onClick={() => setMode(mode === "remove" ? "view" : "remove")}><Trash2 size={16} /> Remove household</button>}
          </div>
        )}
      </header>
      {notice && <p className="ca-edit-success" role="status">{notice}</p>}
      {error && <p className="ca-edit-error" role="alert">{error}</p>}
      {mode !== "view" && <button className="ca-edit-secondary" type="button" onClick={() => { setMode("view"); setConfirmCode(""); }}><X size={15} /> Cancel</button>}
      {mode === "family" && <HouseholdEditForm key={revision} family={family} members={members} isAdmin={isAdmin} saving={saving} onSave={saveFamily} />}
      {mode === "location" && isAdmin && <LocationEditor key={revision} location={family.location} familyCount={locationFamilyCount} saving={saving} onSave={saveLocation} />}
      {mode === "remove" && isAdmin && (
        <section className="ca-edit-form ca-remove-box">
          <h2>Remove household?</h2>
          <p>This archives <strong>{family.family_name}</strong> and hides its members from ordinary users. It does not permanently erase their records. A shared map location stays visible while another active family uses it.</p>
          <label>Type <strong>{family.family_code}</strong> to confirm
            <input autoComplete="off" value={confirmCode} onChange={(e) => setConfirmCode(e.target.value)} />
          </label>
          <button type="button" className="ca-edit-danger ca-remove-confirm" disabled={saving || confirmCode !== family.family_code} onClick={removeFamily}>
            <Trash2 size={17} /> {saving ? "Removing..." : "Archive this household"}
          </button>
        </section>
      )}
      {mode === "view" && (
        <>
          <section className="ca-edit-form">
            <h2>Family information</h2>
            <dl className="ca-profile-grid"><div><dt>Family code</dt><dd>{family.family_code}</dd></div><div><dt>Contact number</dt><dd>{family.contact_phone || "Not recorded"}</dd></div></dl>
            <h3>Location</h3>
            <p><MapPin size={16} /> {[family.location.address_line, family.location.village, family.location.district].filter(Boolean).join(", ")}</p>
            <p className="ca-edit-muted">{family.location.location_code} · {locationFamilyCount} active {locationFamilyCount === 1 ? "family" : "families"} at this location</p>
            <p className="ca-edit-muted">GPS: {family.location.latitude ?? "—"}, {family.location.longitude ?? "—"}</p>
          </section>
          <section className="ca-edit-form">
            <h2>Active family members ({activeMembers.length})</h2>
            {activeMembers.length === 0 ? <p className="ca-edit-muted">No active members.</p> : (
              <ul className="ca-profile-member-list">{activeMembers.map((m) => (
                <li key={m.id}><strong>{m.full_name}</strong><span>{m.relationship_to_head || "Member"}{m.is_head ? " · Head of family" : ""}</span></li>
              ))}</ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
