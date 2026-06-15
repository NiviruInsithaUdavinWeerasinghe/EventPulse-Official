import { useState } from "react";
import "./ProfileUpdateForm.css";

// ─── Mock data (replace with real API call once DB is ready) ───
const mockProfile = {
  description:
    "We are an award-winning event coordination company specialising in corporate events, live concerts, and private celebrations across Sri Lanka.",
  activeTags: ["Corporate Events", "Live Concerts", "Private Parties"],
};

const SUGGESTED_TAGS = [
  "Corporate Events",
  "Live Concerts",
  "Private Parties",
  "Weddings",
  "Exhibitions",
  "Workshops",
  "Festivals",
  "Sports Events",
  "Virtual Events",
  "Fundraisers",
];

export default function ProfileUpdateForm() {
  const [description, setDescription] = useState(mockProfile.description);
  const [activeTags, setActiveTags] = useState(mockProfile.activeTags);
  const [tagInput, setTagInput] = useState("");
  const [saveStatus, setSaveStatus] = useState(null); // null | "saving" | "saved" | "error"

  const MAX_DESC = 500;

  // ─── Tag helpers ───────────────────────────────────────────────
  const addTag = (tag) => {
    const trimmed = tag.trim();
    if (trimmed && !activeTags.includes(trimmed)) {
      setActiveTags([...activeTags, trimmed]);
    }
    setTagInput("");
  };

  const removeTag = (tag) => {
    setActiveTags(activeTags.filter((t) => t !== tag));
  };

  const handleTagKeyDown = (e) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(tagInput);
    }
    if (e.key === "Backspace" && tagInput === "" && activeTags.length > 0) {
      removeTag(activeTags[activeTags.length - 1]);
    }
  };

  // ─── Submit ────────────────────────────────────────────────────
  const handleSave = async () => {
    setSaveStatus("saving");

    // TODO: replace with real API call when backend is ready
    // const res = await axios.put("/api/business/profile", { description, activeTags });

    // Simulating network delay for now
    setTimeout(() => {
      setSaveStatus("saved");
      setTimeout(() => setSaveStatus(null), 3000);
    }, 1000);
  };

  const filteredSuggestions = SUGGESTED_TAGS.filter(
    (t) =>
      !activeTags.includes(t) &&
      t.toLowerCase().includes(tagInput.toLowerCase()) &&
      tagInput.length > 0
  );

  return (
    <div className="puf-wrapper">
      <div className="puf-card">
        {/* Header */}
        <div className="puf-header">
          <div className="puf-header-text">
            <h2 className="puf-title">Business Profile</h2>
            <p className="puf-subtitle">
              This information appears publicly on your EventPulse listing.
            </p>
          </div>
          <span className="puf-badge">Public</span>
        </div>

        <div className="puf-divider" />

        {/* Description field */}
        <div className="puf-field">
          <label className="puf-label" htmlFor="business-desc">
            Business Description
          </label>
          <p className="puf-hint">
            Tell people what makes your events special.
          </p>
          <textarea
            id="business-desc"
            className="puf-textarea"
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
            rows={5}
            placeholder="Describe your business..."
          />
          <span className={`puf-char-count ${description.length >= MAX_DESC ? "puf-char-limit" : ""}`}>
            {description.length} / {MAX_DESC}
          </span>
        </div>

        {/* Tags field */}
        <div className="puf-field">
          <label className="puf-label" htmlFor="tag-input">
            Active Product Tags
          </label>
          <p className="puf-hint">
            Add tags that describe your services. Press Enter or comma to add.
          </p>

          {/* Tag chips + input together */}
          <div className="puf-tag-box">
            {activeTags.map((tag) => (
              <span key={tag} className="puf-tag">
                {tag}
                <button
                  className="puf-tag-remove"
                  onClick={() => removeTag(tag)}
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              id="tag-input"
              className="puf-tag-input"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={activeTags.length === 0 ? "e.g. Weddings, Concerts…" : ""}
            />
          </div>

          {/* Suggestions dropdown */}
          {filteredSuggestions.length > 0 && (
            <div className="puf-suggestions">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  className="puf-suggestion-item"
                  onClick={() => addTag(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Quick-add suggested tags */}
          <div className="puf-quick-tags">
            <span className="puf-quick-label">Quick add:</span>
            {SUGGESTED_TAGS.filter((t) => !activeTags.includes(t))
              .slice(0, 5)
              .map((t) => (
                <button
                  key={t}
                  className="puf-quick-tag"
                  onClick={() => addTag(t)}
                >
                  + {t}
                </button>
              ))}
          </div>
        </div>

        <div className="puf-divider" />

        {/* Footer actions */}
        <div className="puf-footer">
          {saveStatus === "saved" && (
            <span className="puf-success">✓ Profile saved successfully</span>
          )}
          {saveStatus === "error" && (
            <span className="puf-error">Something went wrong. Try again.</span>
          )}
          <div className="puf-actions">
            <button
              className="puf-btn-secondary"
              onClick={() => {
                setDescription(mockProfile.description);
                setActiveTags(mockProfile.activeTags);
                setSaveStatus(null);
              }}
            >
              Discard changes
            </button>
            <button
              className="puf-btn-primary"
              onClick={handleSave}
              disabled={saveStatus === "saving"}
            >
              {saveStatus === "saving" ? "Saving…" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
