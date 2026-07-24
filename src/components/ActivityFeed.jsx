import { timeAgo } from "../lib/format";
import { Icon, I } from "./icons";

const META = {
  call: { d: I.phone, c: "bg-sky/12 text-sky" },
  email: { d: I.mail, c: "bg-gold/12 text-gold-300" },
  deal: { d: I.dollar, c: "bg-brand/12 text-brand-300" },
  meeting: { d: I.calendar, c: "bg-coral/12 text-coral" },
  note: { d: I.note, c: "bg-mist/12 text-mist" },
};

export default function ActivityFeed({ activities }) {
  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-display text-lg">Latest Activity</h2>
        <span className="flex items-center gap-1.5 text-[11px] text-brand-300">
          <span className="w-1.5 h-1.5 rounded-full bg-brand animate-pulseDot" />
          Live
        </span>
      </div>
      <div className="relative max-h-80 overflow-y-auto scroll-thin pr-1">
        <span className="absolute left-[15px] top-2 bottom-2 w-px bg-ink-600/70" />
        {activities.map((a) => {
          const m = META[a.type] || META.note;
          return (
            <div key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
              <span
                className={`relative z-10 w-8 h-8 shrink-0 rounded-full grid place-items-center ${m.c}`}
              >
                <Icon d={m.d} className="w-3.5 h-3.5" />
              </span>
              <div className="pt-0.5 min-w-0">
                <p className="text-sm leading-snug text-cream/90">
                  {a.description}
                </p>
                <p className="text-[11px] text-mist mt-0.5">
                  {timeAgo(a.created_at)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
