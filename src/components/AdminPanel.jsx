import { useState } from "react";
import { Icon, I } from "./icons";

/* ─── Dummy data ─── */
const USERS = [
  { id: 1, name: "Rahul Sharma",   role: "Admin",   status: "Active",   avatar: "RS", joined: "Jan 2024" },
  { id: 2, name: "Priya Mehta",    role: "Manager", status: "Active",   avatar: "PM", joined: "Mar 2024" },
  { id: 3, name: "Arjun Patil",    role: "Staff",   status: "Active",   avatar: "AP", joined: "Jun 2024" },
  { id: 4, name: "Sneha Joshi",    role: "Staff",   status: "Inactive", avatar: "SJ", joined: "Aug 2024" },
  { id: 5, name: "Vikram Desai",   role: "Manager", status: "Active",   avatar: "VD", joined: "Sep 2024" },
  { id: 6, name: "Anjali Rao",     role: "Staff",   status: "Active",   avatar: "AR", joined: "Nov 2024" },
];

const STATS = [
  { label: "Total Users",     value: "6",     sub: "+2 this month",  color: "blue",   icon: I.users  },
  { label: "Active Sessions", value: "4",     sub: "Right now",      color: "green",  icon: I.bolt   },
  { label: "Modules Active",  value: "8",     sub: "All running",    color: "amber",  icon: I.grid   },
  { label: "System Health",   value: "99.9%", sub: "Uptime 30 days", color: "brand",  icon: I.target },
];

const LOGS = [
  { time: "11:42 AM", user: "Rahul Sharma",  action: "Updated Attendance record",    type: "edit"   },
  { time: "11:30 AM", user: "Priya Mehta",   action: "Exported Daily Report PDF",    type: "export" },
  { time: "10:58 AM", user: "Arjun Patil",   action: "Added new expense entry",      type: "add"    },
  { time: "10:20 AM", user: "Vikram Desai",  action: "Modified Dhol Maintenance log",type: "edit"   },
  { time: "09:45 AM", user: "Anjali Rao",    action: "Logged in to system",          type: "login"  },
  { time: "09:30 AM", user: "Rahul Sharma",  action: "Reviewed New Member Exam",     type: "view"   },
];

const ROLE_COLORS = {
  Admin:   "from-rose-500/20 to-rose-500/5  text-rose-300  border-rose-500/20",
  Manager: "from-amber-500/20 to-amber-500/5 text-amber-300 border-amber-500/20",
  Staff:   "from-sky-500/20  to-sky-500/5   text-sky-300   border-sky-500/20",
};
const LOG_DOT = {
  edit:   "bg-amber-400",
  export: "bg-sky-400",
  add:    "bg-emerald-400",
  login:  "bg-brand",
  view:   "bg-purple-400",
};

const STAT_COLORS = {
  blue:  { ring: "ring-sky-500/20",    glow: "bg-sky-500/10",    text: "text-sky-300",    icon: "text-sky-400"    },
  green: { ring: "ring-emerald-500/20",glow: "bg-emerald-500/10",text: "text-emerald-300",icon: "text-emerald-400"},
  amber: { ring: "ring-amber-500/20",  glow: "bg-amber-500/10",  text: "text-amber-300",  icon: "text-amber-400"  },
  brand: { ring: "ring-rose-500/20",   glow: "bg-rose-500/10",   text: "text-rose-300",   icon: "text-rose-400"   },
};

function StatCard({ label, value, sub, color, icon }) {
  const c = STAT_COLORS[color];
  return (
    <div className={`relative overflow-hidden rounded-2xl border border-white/[.06] bg-white/[.025] p-5 ring-1 ${c.ring} transition-all hover:bg-white/[.04]`}>
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full ${c.glow} blur-2xl`} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-xs font-medium tracking-wide text-mist/70 uppercase">{label}</p>
          <p className={`mt-2 text-3xl font-bold tracking-tight ${c.text}`}>{value}</p>
          <p className="mt-1 text-[11px] text-mist/50">{sub}</p>
        </div>
        <div className={`grid h-10 w-10 place-items-center rounded-xl border border-white/[.07] bg-white/[.04] ${c.icon}`}>
          <Icon d={icon} className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

function UserRow({ user, onEdit }) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-white/[.04] bg-white/[.02] px-4 py-3 transition-all hover:border-white/[.08] hover:bg-white/[.05]">
      {/* Avatar */}
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-brand/30 to-brand/10 text-[11px] font-bold text-brand-300 ring-1 ring-white/10">
        {user.avatar}
      </div>
      {/* Name & joined */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-cream">{user.name}</p>
        <p className="text-[11px] text-mist/50">Joined {user.joined}</p>
      </div>
      {/* Role badge */}
      <span className={`shrink-0 rounded-full border bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[user.role]}`}>
        {user.role}
      </span>
      {/* Status */}
      <div className="flex shrink-0 items-center gap-1.5">
        <span className={`h-2 w-2 rounded-full ${user.status === "Active" ? "bg-emerald-400" : "bg-mist/30"}`} />
        <span className="text-[11px] text-mist/60">{user.status}</span>
      </div>
      {/* Edit btn */}
      <button
        onClick={() => onEdit(user)}
        className="hidden rounded-lg border border-white/[.07] bg-white/[.04] px-3 py-1.5 text-[11px] font-medium text-mist transition-all hover:bg-white/[.08] hover:text-cream group-hover:flex"
      >
        Edit
      </button>
    </div>
  );
}

function ActivityLog() {
  return (
    <div className="space-y-2">
      {LOGS.map((log, i) => (
        <div key={i} className="flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-white/[.03]">
          <div className="relative mt-1.5 shrink-0">
            <span className={`block h-2 w-2 rounded-full ${LOG_DOT[log.type]}`} />
            {i < LOGS.length - 1 && (
              <span className="absolute left-[3px] top-3 h-full w-px bg-white/[.06]" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[13px] text-cream/80">{log.action}</p>
            <p className="mt-0.5 text-[11px] text-mist/50">
              <span className="font-medium text-mist/70">{log.user}</span> · {log.time}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Edit User Modal ─── */
function EditUserModal({ user, onClose, onSave }) {
  const [role, setRole] = useState(user.role);
  const [status, setStatus] = useState(user.status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="relative w-full max-w-sm rounded-2xl border border-white/[.08] bg-ink-900/95 p-6 shadow-[0_24px_80px_rgba(0,0,0,.7)]">
        {/* Red top line */}
        <span className="absolute left-[15%] right-[15%] top-0 h-px bg-gradient-to-r from-transparent via-amber-400/60 to-transparent" />
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-base font-semibold text-cream">Edit User</h3>
          <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-lg border border-white/[.07] text-mist hover:text-cream transition-colors">
            <Icon d={I.x} className="h-4 w-4" />
          </button>
        </div>
        {/* Avatar row */}
        <div className="mb-5 flex items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-brand/15 text-sm font-bold text-brand-300 ring-1 ring-white/10">
            {user.avatar}
          </div>
          <div>
            <p className="font-semibold text-cream">{user.name}</p>
            <p className="text-xs text-mist/50">Joined {user.joined}</p>
          </div>
        </div>
        {/* Role select */}
        <div className="mb-4">
          <label className="mb-1.5 block text-xs font-medium text-mist/70 uppercase tracking-wider">Role</label>
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            className="w-full rounded-xl border border-white/[.08] bg-white/[.04] px-3 py-2.5 text-sm text-cream outline-none focus:border-amber-400/40 focus:ring-1 focus:ring-amber-400/20 transition"
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Staff">Staff</option>
          </select>
        </div>
        {/* Status toggle */}
        <div className="mb-6">
          <label className="mb-1.5 block text-xs font-medium text-mist/70 uppercase tracking-wider">Status</label>
          <div className="flex gap-2">
            {["Active", "Inactive"].map(s => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                className={`flex-1 rounded-xl border py-2.5 text-sm font-medium transition-all ${
                  status === s
                    ? s === "Active"
                      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-300"
                      : "border-rose-500/30 bg-rose-500/15 text-rose-300"
                    : "border-white/[.06] bg-white/[.03] text-mist hover:bg-white/[.06]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        {/* Actions */}
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-white/[.07] bg-white/[.04] py-2.5 text-sm font-medium text-mist transition-colors hover:text-cream"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave({ ...user, role, status })}
            className="flex-1 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-2.5 text-sm font-semibold text-ink-950 shadow-[0_6px_20px_-4px_rgba(245,158,11,.5)] transition-all hover:shadow-[0_8px_24px_-4px_rgba(245,158,11,.65)] hover:-translate-y-0.5"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Actions ─── */
const QUICK_ACTIONS = [
  { label: "Export All Data",    icon: I.note,     color: "sky"    },
  { label: "Clear Audit Logs",   icon: I.trash,    color: "rose"   },
  { label: "Send Announcement",  icon: I.mail,     color: "amber"  },
  { label: "System Backup",      icon: I.shield,   color: "emerald"},
];
const QA_COLORS = {
  sky:     "border-sky-500/20 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20",
  rose:    "border-rose-500/20 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20",
  amber:   "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20",
  emerald: "border-emerald-500/20 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20",
};

/* ─── Main Component ─── */
export default function AdminPanel() {
  const [users, setUsers]         = useState(USERS);
  const [editUser, setEditUser]   = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const handleSave = (updated) => {
    setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    setEditUser(null);
  };

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent p-6">
        <div className="absolute -right-10 -top-10 h-40 w-40 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-xl border border-amber-500/30 bg-amber-500/15 text-amber-400 shadow-[0_0_24px_rgba(245,158,11,.2)]">
              <Icon d={I.shield} className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-cream">Admin Panel</h1>
              <p className="text-sm text-mist/60">Manage users, roles & system settings</p>
            </div>
          </div>
          {/* Tabs */}
          <div className="flex gap-1 rounded-xl border border-white/[.06] bg-white/[.03] p-1">
            {["overview", "users", "activity"].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`rounded-lg px-4 py-1.5 text-xs font-semibold capitalize transition-all ${
                  activeTab === tab
                    ? "bg-amber-500/20 text-amber-300 shadow-sm"
                    : "text-mist hover:text-cream"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── OVERVIEW TAB ── */}
      {activeTab === "overview" && (
        <>
          {/* Stats grid */}
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {STATS.map(s => <StatCard key={s.label} {...s} />)}
          </div>

          {/* Quick Actions */}
          <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist/70">Quick Actions</h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {QUICK_ACTIONS.map(a => (
                <button
                  key={a.label}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 text-sm font-medium transition-all ${QA_COLORS[a.color]}`}
                >
                  <Icon d={a.icon} className="h-4 w-4 shrink-0" />
                  {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* System info */}
          <div className="grid gap-4 lg:grid-cols-2">
            {/* Permissions overview */}
            <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist/70">Role Permissions</h2>
              <div className="space-y-3">
                {[
                  { role: "Admin",   perms: ["Full Access", "User Mgmt", "Export", "Settings"] },
                  { role: "Manager", perms: ["View All", "Edit Records", "Export"] },
                  { role: "Staff",   perms: ["View Own", "Add Records"] },
                ].map(r => (
                  <div key={r.role} className="flex items-start gap-3 rounded-xl border border-white/[.04] bg-white/[.02] px-4 py-3">
                    <span className={`mt-0.5 shrink-0 rounded-full border bg-gradient-to-r px-2.5 py-0.5 text-[11px] font-semibold ${ROLE_COLORS[r.role]}`}>
                      {r.role}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {r.perms.map(p => (
                        <span key={p} className="rounded-md border border-white/[.06] bg-white/[.04] px-2 py-0.5 text-[11px] text-mist/70">
                          {p}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Recent Activity (preview) */}
            <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
              <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-mist/70">Recent Activity</h2>
              <ActivityLog />
            </div>
          </div>
        </>
      )}

      {/* ── USERS TAB ── */}
      {activeTab === "users" && (
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-mist/70">
              All Users
              <span className="ml-2 rounded-full border border-white/[.08] bg-white/[.04] px-2 py-0.5 text-[11px] font-medium text-mist/50">
                {users.length}
              </span>
            </h2>
            <button className="flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/15 px-4 py-2 text-xs font-semibold text-amber-300 transition-all hover:bg-amber-500/25">
              <Icon d={I.plus} className="h-4 w-4" />
              Add User
            </button>
          </div>
          <div className="space-y-2">
            {users.map(u => (
              <UserRow key={u.id} user={u} onEdit={setEditUser} />
            ))}
          </div>
        </div>
      )}

      {/* ── ACTIVITY TAB ── */}
      {activeTab === "activity" && (
        <div className="rounded-2xl border border-white/[.06] bg-white/[.02] p-5">
          <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-mist/70">Audit Log — Today</h2>
          <ActivityLog />
        </div>
      )}

      {/* ── Edit Modal ── */}
      {editUser && (
        <EditUserModal
          user={editUser}
          onClose={() => setEditUser(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
