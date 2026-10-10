
import { useState } from "react";
import {
  House,
  MapPin,
  Users,
  Plus,
  Trash2,
  Save,
} from "lucide-react";

function newMember(isHead = false) {
  return {
    id: crypto.randomUUID(),
    fullName: "",
    relationshipToHead: isHead ? "Head" : "",
    isHead,
  };
}

export default function HouseholdForm({
  selectedPoint,
  existingLocation,
  onSave,
  saving,
}) {
  const usingExistingLocation = Boolean(
    existingLocation?.id
  );

  const [familyName, setFamilyName] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const [addressLine, setAddressLine] = useState("");
  const [village, setVillage] = useState("");
  const [district, setDistrict] = useState("");

  const [latitude, setLatitude] = useState(
    selectedPoint?.lat?.toFixed(6) ?? ""
  );

  const [longitude, setLongitude] = useState(
    selectedPoint?.lng?.toFixed(6) ?? ""
  );

  const [members, setMembers] = useState([
    newMember(true),
  ]);

  const [error, setError] = useState("");

  const addMember = () => {
    if (members.length >= 25) return;

    setMembers((current) => [
      ...current,
      newMember(),
    ]);
  };

  const updateMember = (id, field, value) => {
    setMembers((current) =>
      current.map((person) =>
        person.id === id
          ? { ...person, [field]: value }
          : person
      )
    );
  };

  const selectHead = (id) => {
    setMembers((current) =>
      current.map((person) => ({
        ...person,
        isHead: person.id === id,
      }))
    );
  };

  const removeMember = (id) => {
    setMembers((current) => {
      if (current.length === 1) return current;

      const remaining = current.filter(
        (person) => person.id !== id
      );

      if (!remaining.some((person) => person.isHead)) {
        return remaining.map((person, index) => ({
          ...person,
          isHead: index === 0,
        }));
      }

      return remaining;
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (familyName.trim().length < 2) {
      setError("Enter a valid family name.");
      return;
    }

    if (
      members.some(
        (person) => person.fullName.trim().length < 2
      )
    ) {
      setError("Please enter every family member's name.");
      return;
    }

    if (!usingExistingLocation) {
      if (addressLine.trim().length < 3) {
        setError("Enter the household address.");
        return;
      }

      if (
        latitude.trim() === "" ||
        longitude.trim() === ""
      ) {
        setError("Select valid GPS coordinates.");
        return;
      }

      const lat = Number(latitude);
      const lng = Number(longitude);

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        lat < -90 ||
        lat > 90 ||
        lng < -180 ||
        lng > 180
      ) {
        setError("GPS coordinates are invalid.");
        return;
      }
    }

    const formData = {
      familyName: familyName.trim(),
      contactPhone: contactPhone.trim(),
      existingLocationId:
        existingLocation?.id ?? null,

      addressLine: addressLine.trim(),
      village: village.trim(),
      district: district.trim(),

      latitude: usingExistingLocation
        ? null
        : Number(latitude),

      longitude: usingExistingLocation
        ? null
        : Number(longitude),

      members: members.map((person) => ({
        fullName: person.fullName.trim(),
        relationshipToHead:
          person.relationshipToHead.trim(),
        isHead: person.isHead,
      })),
    };

    try {
      await onSave(formData);
    } catch (err) {
      setError(
        err.message || "Could not register the household."
      );
    }
  };

  return (
    <form
      className="ca-registration-form"
      onSubmit={handleSubmit}
    >
      {/* Location section */}
      <section className="ca-form-section">
        <div className="ca-form-section-heading">
          <div className="ca-form-icon">
            <MapPin size={21} />
          </div>

          <div>
            <h2>Household Location</h2>
            <p>Physical address and GPS coordinates</p>
          </div>
        </div>

        {usingExistingLocation ? (
          <div className="ca-existing-location">
            <strong>
              {existingLocation.location_code}
            </strong>

            <p>{existingLocation.address_line}</p>

            <span>
              This family will share the existing
              location. No new map marker will be
              created.
            </span>
          </div>
        ) : (
          <>
            <div className="ca-form-grid">
              <div className="ca-field ca-field-full">
                <label htmlFor="address">
                  Address <span>*</span>
                </label>

                <input
                  id="address"
                  value={addressLine}
                  onChange={(event) =>
                    setAddressLine(event.target.value)
                  }
                  placeholder="House number, road, or address"
                  maxLength={300}
                  required
                />
              </div>

              <div className="ca-field">
                <label htmlFor="village">Village</label>

                <input
                  id="village"
                  value={village}
                  onChange={(event) =>
                    setVillage(event.target.value)
                  }
                  placeholder="Village name"
                  maxLength={120}
                />
              </div>

              <div className="ca-field">
                <label htmlFor="district">District</label>

                <input
                  id="district"
                  value={district}
                  onChange={(event) =>
                    setDistrict(event.target.value)
                  }
                  placeholder="District"
                  maxLength={120}
                />
              </div>

              <div className="ca-field">
                <label htmlFor="latitude">
                  Latitude <span>*</span>
                </label>

                <input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  min="-90"
                  max="90"
                  value={latitude}
                  onChange={(event) =>
                    setLatitude(event.target.value)
                  }
                  required
                />
              </div>

              <div className="ca-field">
                <label htmlFor="longitude">
                  Longitude <span>*</span>
                </label>

                <input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  min="-180"
                  max="180"
                  value={longitude}
                  onChange={(event) =>
                    setLongitude(event.target.value)
                  }
                  required
                />
              </div>
            </div>

            <p className="ca-form-hint">
              Coordinates were prefilled from the map
              where available. Check them carefully
              before registering a real property.
            </p>
          </>
        )}
      </section>

      {/* Family section */}
      <section className="ca-form-section">
        <div className="ca-form-section-heading">
          <div className="ca-form-icon">
            <House size={21} />
          </div>

          <div>
            <h2>Family Information</h2>
            <p>Basic household identification</p>
          </div>
        </div>

        <div className="ca-form-grid">
          <div className="ca-field">
            <label htmlFor="family-name">
              Family Name <span>*</span>
            </label>

            <input
              id="family-name"
              value={familyName}
              onChange={(event) =>
                setFamilyName(event.target.value)
              }
              placeholder="Enter family name"
              maxLength={150}
              required
            />
          </div>

          <div className="ca-field">
            <label htmlFor="contact-phone">
              Contact Number
            </label>

            <input
              id="contact-phone"
              type="tel"
              value={contactPhone}
              onChange={(event) =>
                setContactPhone(event.target.value)
              }
              placeholder="Optional"
              maxLength={30}
            />
          </div>
        </div>

        <p className="ca-form-hint">
          The system will automatically generate
          a unique family code.
        </p>
      </section>

      {/* Members section */}
      <section className="ca-form-section">
        <div className="ca-members-heading">
          <div className="ca-form-section-heading">
            <div className="ca-form-icon">
              <Users size={21} />
            </div>

            <div>
              <h2>Family Members</h2>
              <p>
                {members.length} registered in this form
              </p>
            </div>
          </div>

          <button
            type="button"
            className="ca-add-member"
            onClick={addMember}
            disabled={members.length >= 25}
          >
            <Plus size={17} />
            Add Member
          </button>
        </div>

        <div className="ca-members-list">
          {members.map((person, index) => (
            <div
              className="ca-member-form"
              key={person.id}
            >
              <div className="ca-member-form-header">
                <strong>Member {index + 1}</strong>

                {members.length > 1 && (
                  <button
                    type="button"
                    className="ca-remove-member"
                    onClick={() =>
                      removeMember(person.id)
                    }
                    aria-label={`Remove member ${index + 1}`}
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </div>

              <div className="ca-form-grid">
                <div className="ca-field">
                  <label
                    htmlFor={`member-name-${person.id}`}
                  >
                    Full Name <span>*</span>
                  </label>

                  <input
                    id={`member-name-${person.id}`}
                    value={person.fullName}
                    onChange={(event) =>
                      updateMember(
                        person.id,
                        "fullName",
                        event.target.value
                      )
                    }
                    placeholder="Full name"
                    maxLength={150}
                    required
                  />
                </div>

                <div className="ca-field">
                  <label
                    htmlFor={`member-relation-${person.id}`}
                  >
                    Relationship
                  </label>

                  <input
                    id={`member-relation-${person.id}`}
                    value={person.relationshipToHead}
                    onChange={(event) =>
                      updateMember(
                        person.id,
                        "relationshipToHead",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Head, Spouse, Child"
                    maxLength={100}
                  />
                </div>
              </div>

              <label className="ca-head-choice">
                <input
                  type="radio"
                  name="head-of-family"
                  checked={person.isHead}
                  onChange={() =>
                    selectHead(person.id)
                  }
                />
                Head of family
              </label>
            </div>
          ))}
        </div>
      </section>

      {error && (
        <div className="ca-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="ca-form-actions">
        <button
          type="submit"
          className="ca-save-household"
          disabled={saving}
        >
          <Save size={18} />
          {saving
            ? "Saving Household..."
            : "Register Household"}
        </button>
      </div>
    </form>
  );
}
