import { HeartPulse, DoorOpen, Bath, Flame, Phone, MapPin, Accessibility } from "lucide-react";

const badges = [
  { id: "first-aid",       label: "First Aid",        bg: "#E53E3E", Icon: HeartPulse   },
  { id: "exit",            label: "Exit",             bg: "#276749", Icon: DoorOpen     },
  { id: "restroom",        label: "Restrooms",        bg: "#2B6CB0", Icon: Bath         },
  { id: "fire",            label: "Fire Extinguisher",bg: "#C05621", Icon: Flame        },
  { id: "emergency-phone", label: "Emergency Phone",  bg: "#6B46C1", Icon: Phone        },
  { id: "assembly",        label: "Assembly Point",   bg: "#2C7A7B", Icon: MapPin       },
  { id: "accessibility",   label: "Accessible",       bg: "#2D3748", Icon: Accessibility},
];

export default function SafetyLandmarkBadges({ className = "" }) {
  return (
    <div className={`flex flex-wrap gap-3 ${className}`} role="list" aria-label="Safety landmarks">
      {badges.map(({ id, label, bg, Icon }) => (
        <div
          key={id}
          role="listitem"
          className="flex items-center gap-2 rounded-full px-4 py-2 shadow-lg select-none"
          style={{ backgroundColor: bg }}
        >
          <Icon size={22} color="white" strokeWidth={2.5} aria-hidden="true" />
          <span
            className="text-white font-bold text-sm tracking-wide uppercase"
            style={{ textShadow: "0 1px 2px rgba(0,0,0,0.4)" }}
          >
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
