export function formatCurrency(value, options = {}) {
  const compact = options === true ? true : Boolean(options.compact);
  const numericValue = Number(value) || 0;

  if (compact && Math.abs(numericValue) >= 1000) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    }).format(numericValue);
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(numericValue);
}

export function formatNumber(value) {
  return new Intl.NumberFormat("en-US").format(Number(value) || 0);
}

export function formatPercent(value) {
  return `${value > 0 ? "+" : ""}${Number(value || 0).toFixed(1)}%`;
}

export function formatDate(iso) {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(iso));
}

export function classNames(...parts) {
  return parts.filter(Boolean).join(" ");
}

export const money = formatCurrency;

export function timeAgo(date) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function initials(name) {
  if (!name) return "-";
  return name
    .split(/[\s-]+/)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const TINT_CLASSES = [
  "bg-brand/12 text-brand-300 ring-brand/20",
  "bg-gold/12 text-gold-300 ring-gold/20",
  "bg-sky/12 text-sky ring-sky/20",
  "bg-emerald/12 text-emerald ring-emerald/20",
];

export function tint(value) {
  const key = String(value || "")
    .split("")
    .reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return TINT_CLASSES[key % TINT_CLASSES.length];
}

export const indigo = (i) => {
  const t = Math.max(0.05, Math.min(1, i));
  return `rgba(${Math.round(t * 249)}, ${99 + Math.round(t * 45)}, 115, ${t * 0.7})`;
};
