import { useState } from "react";
import { Icon, I } from "./icons";

const PRIO = { High: "bg-coral", Medium: "bg-gold", Low: "bg-brand" };
const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });

export default function TaskPanel({ tasks, onToggle, onAdd }) {
  const [text, setText] = useState("");
  const done = tasks.filter((t) => t.done).length;

  return (
    <div className="card p-6">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-lg">Today's Focus</h2>
        <span className="text-xs text-mist tabular-nums">
          {done}/{tasks.length}
        </span>
      </div>
      <div className="h-1 rounded-full bg-ink-700/60 mt-2 mb-4 overflow-hidden">
        <div
          className="h-full bg-brand rounded-full transition-all duration-500"
          style={{
            width: `${tasks.length ? (done / tasks.length) * 100 : 0}%`,
          }}
        />
      </div>

      <ul className="divide-y divide-ink-700/40 max-h-64 overflow-y-auto scroll-thin">
        {tasks.map((t) => (
          <li key={t.id} className="flex items-center gap-3 py-2.5 first:pt-1">
            <button
              onClick={() => onToggle(t)}
              className={`w-5 h-5 rounded-md border grid place-items-center shrink-0 transition-all duration-200
                ${t.done ? "bg-brand border-brand" : "border-ink-500 hover:border-brand"}`}
            >
              {t.done && <Icon d={I.check} className="w-3 h-3 text-ink-950" />}
            </button>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm truncate transition-all ${t.done ? "line-through text-mist/50" : "text-cream/90"}`}
              >
                {t.title}
              </p>
              <p className="text-[11px] text-mist flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${PRIO[t.priority]}`}
                />
                {t.priority} · due {fmt(t.due)}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <form
        className="flex gap-2 mt-3 pt-3 border-t hairline"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) {
            onAdd(text.trim());
            setText("");
          }
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a task…"
          className="flex-1 bg-ink-800 border border-ink-600 rounded-lg px-3 py-2 text-sm placeholder:text-mist/60 outline-none focus:border-brand/70 transition-colors"
        />
        <button
          type="submit"
          className="px-3 rounded-lg bg-ink-700 hover:bg-brand hover:text-ink-950 transition-colors"
        >
          <Icon d={I.plus} className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
