import { useState } from "react";

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
  const [saveStatus, setSaveStatus] = useState(null);

  const MAX_DESC = 500;

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

  const handleSave = async () => {
    setSaveStatus("saving");

    // TODO: replace with real API call when backend is ready
    // const res = await axios.put("/api/business/profile", { description, activeTags });

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
    <div className="min-h-screen flex items-start justify-center px-4 py-10"
      style={{ background: "radial-gradient(circle at 50% 0%, rgba(99,102,241,0.12) 0%, rgba(3,7,18,0) 50%), #030712" }}>

      <div className="w-full max-w-2xl rounded-2xl border border-indigo-500/20 bg-white/5 backdrop-blur-sm shadow-2xl p-8">

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">Business Profile</h2>
            <p className="text-sm text-indigo-400">This information appears publicly on your EventPulse listing.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 rounded-full bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 whitespace-nowrap">
            Public
          </span>
        </div>

        <div className="border-t border-indigo-500/10 mb-7" />

        {/* Description */}
        <div className="mb-7">
          <label className="block text-sm font-semibold text-slate-200 mb-1">
            Business Description
          </label>
          <p className="text-xs text-slate-500 mb-3">Tell people what makes your events special.</p>
          <textarea
            className="w-full rounded-xl border border-indigo-500/20 bg-white/5 text-slate-200 placeholder-slate-600 px-4 py-3 text-sm resize-y focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition"
            rows={5}
            value={description}
            onChange={(e) => setDescription(e.target.value.slice(0, MAX_DESC))}
            placeholder="Describe your business..."
          />
          <span className={`block text-right text-xs mt-1 ${description.length >= MAX_DESC ? "text-red-400" : "text-slate-600"}`}>
            {description.length} / {MAX_DESC}
          </span>
        </div>

        {/* Tags */}
        <div className="mb-7">
          <label className="block text-sm font-semibold text-slate-200 mb-1">
            Active Product Tags
          </label>
          <p className="text-xs text-slate-500 mb-3">Add tags that describe your services. Press Enter or comma to add.</p>

          {/* Tag chips + input */}
          <div className="flex flex-wrap gap-2 rounded-xl border border-indigo-500/20 bg-white/5 px-3 py-2 min-h-[52px] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20 transition cursor-text">
            {activeTags.map((tag) => (
              <span key={tag} className="inline-flex items-center gap-1.5 bg-indigo-500/15 text-indigo-300 border border-indigo-500/25 text-xs font-medium px-3 py-1 rounded-full">
                {tag}
                <button
                  onClick={() => removeTag(tag)}
                  className="text-indigo-400 hover:text-red-400 transition text-sm leading-none"
                  aria-label={`Remove ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              className="flex-1 min-w-[140px] bg-transparent text-sm text-slate-200 placeholder-slate-600 outline-none"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder={activeTags.length === 0 ? "e.g. Weddings, Concerts…" : ""}
            />
          </div>

          {/* Suggestions dropdown */}
          {filteredSuggestions.length > 0 && (
            <div className="mt-1 rounded-xl border border-indigo-500/20 bg-[#0d0d20] shadow-xl overflow-hidden">
              {filteredSuggestions.map((s) => (
                <button
                  key={s}
                  onClick={() => addTag(s)}
                  className="block w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-500/10 hover:text-indigo-300 transition"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {/* Quick add */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-xs text-slate-600">Quick add:</span>
            {SUGGESTED_TAGS.filter((t) => !activeTags.includes(t))
              .slice(0, 5)
              .map((t) => (
                <button
                  key={t}
                  onClick={() => addTag(t)}
                  className="text-xs px-3 py-1 rounded-full border border-dashed border-indigo-500/30 text-slate-500 hover:border-indigo-400 hover:text-indigo-300 transition"
                >
                  + {t}
                </button>
              ))}
          </div>
        </div>

        <div className="border-t border-indigo-500/10 mb-6" />

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 flex-wrap">
          {saveStatus === "saved" && (
            <span className="text-sm text-emerald-400 font-medium mr-auto">✓ Profile saved successfully</span>
          )}
          {saveStatus === "error" && (
            <span className="text-sm text-red-400 font-medium mr-auto">Something went wrong. Try again.</span>
          )}
          <button
            onClick={() => { setDescription(mockProfile.description); setActiveTags(mockProfile.activeTags); setSaveStatus(null); }}
            className="px-5 py-2 rounded-lg border border-indigo-500/25 text-slate-400 text-sm font-medium hover:border-indigo-400 hover:text-slate-200 transition"
          >
            Discard changes
          </button>
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="px-6 py-2 rounded-lg text-sm font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, #818cf8, #c084fc)" }}
          >
            {saveStatus === "saving" ? "Saving…" : "Save changes"}
          </button>
        </div>

      </div>
    </div>
  );
}