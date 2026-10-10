import { useState } from "react";
import { Plus, Save, UserRoundX, RotateCcw } from "lucide-react";

const createMember = () => ({
  clientId: crypto.randomUUID(), id: null, fullName: "",
  relationshipToHead: "", isHead: false, isArchived: false,
});

export default function HouseholdEditForm({ family, members: initialMembers, isAdmin, onSave, saving }) {
  const [familyName, setFamilyName] = useState(family.family_name);
  const [contactPhone, setContactPhone] = useState(family.contact_phone ?? "");
  const [members, setMembers] = useState(() => initialMembers.map((m) => ({
    clientId: m.id, id: m.id, fullName: m.full_name,
    relationshipToHead: m.relationship_to_head ?? "",
    isHead: m.is_head, isArchived: m.is_archived,
  })));
  const [error, setError] = useState("");

  function patch(clientId, fields) {
    setMembers((all) => all.map((m) => m.clientId === clientId ? { ...m, ...fields } : m));
  }

  function chooseHead(clientId) {
    setMembers((all) => all.map((m) => ({
      ...m,
      isHead: m.clientId === clientId && !m.isArchived,
    })));
  }

  function setArchived(clientId, archived) {
    setMembers((all) => all.map((m) => m.clientId === clientId ? {
      ...m, isArchived: archived, isHead: archived ? false : m.isHead,
    } : m));
  }

  async function submit(event) {
    event.preventDefault();
    setError("");
    if (familyName.trim().length < 2) return setError("Enter a family name.");
    if (members.length < 1 || members.length > 25) return setError("Use 1–25 members.");
    if (members.some((m) => m.fullName.trim().length < 2)) return setError("Every member needs a name.");
    if (members.filter((m) => !m.isArchived && m.isHead).length !== 1) {
      return setError("Choose exactly one active head of family.");
    }
    try {
      await onSave({
        familyName: familyName.trim(), contactPhone: contactPhone.trim(),
        members: members.map((m) => ({ ...m,
          fullName: m.fullName.trim(), relationshipToHead: m.relationshipToHead.trim(),
        })),
      });
    } catch (err) {
      setError(err.message || "Could not save changes.");
    }
  }

  return (
    <form className="ca-edit-form" onSubmit={submit}>
      <h2>Edit {family.family_code}</h2>
      <div className="ca-edit-grid">
        <label>Family name
          <input required maxLength={150} value={familyName} onChange={(e) => setFamilyName(e.target.value)} />
        </label>
        <label>Contact phone
          <input type="tel" maxLength={30} value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} />
        </label>
      </div>
      <div className="ca-edit-subheading">
        <h3>Family members</h3>
        <button type="button" className="ca-edit-secondary" disabled={members.length >= 25 || saving}
          onClick={() => setMembers((old) => [...old, createMember()])}>
          <Plus size={16} /> Add member
        </button>
      </div>
      <p className="ca-edit-muted">Select one active member as family head. Removing a member archives their record; it does not erase their history.</p>
      {members.map((member, index) => (
        <div className={`ca-edit-member ${member.isArchived ? "is-archived" : ""}`} key={member.clientId}>
          <div className="ca-edit-subheading">
            <strong>Member {index + 1} {member.id ? "" : "(new)"}</strong>
            {isAdmin && member.id && (
              <button type="button" disabled={saving} className="ca-edit-secondary"
                onClick={() => setArchived(member.clientId, !member.isArchived)}>
                {member.isArchived ? <RotateCcw size={16} /> : <UserRoundX size={16} />}
                {member.isArchived ? "Restore member" : "Remove member"}
              </button>
            )}
            {!member.id && members.length > 1 && (
              <button type="button" disabled={saving} className="ca-edit-secondary"
                onClick={() => setMembers((all) => all.filter((m) => m.clientId !== member.clientId))}>
                Discard new member
              </button>
            )}
          </div>
          <div className="ca-edit-grid">
            <label>Full name
              <input required maxLength={150} disabled={member.isArchived || saving} value={member.fullName}
                onChange={(e) => patch(member.clientId, { fullName: e.target.value })} />
            </label>
            <label>Relationship
              <input maxLength={100} disabled={member.isArchived || saving} value={member.relationshipToHead}
                onChange={(e) => patch(member.clientId, { relationshipToHead: e.target.value })} />
            </label>
          </div>
          <label className="ca-edit-radio">
            <input type="radio" name="family-head" checked={member.isHead && !member.isArchived}
              disabled={member.isArchived || saving} onChange={() => chooseHead(member.clientId)} /> Head of family
          </label>
          {member.isArchived && <p className="ca-edit-muted">Archived member — visible to Administrators only.</p>}
        </div>
      ))}
      {error && <p className="ca-edit-error" role="alert">{error}</p>}
      <button className="ca-edit-primary" type="submit" disabled={saving}>
        <Save size={17} /> {saving ? "Saving..." : "Save family & members"}
      </button>
    </form>
  );
}
