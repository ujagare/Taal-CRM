export default function Toast({ msg }) {
  return (
    <div className="fixed bottom-6 right-6 z-50 card px-4 py-3 flex items-center gap-2.5 animate-rise text-sm">
      <span className="w-2 h-2 rounded-full bg-brand animate-pulseDot" />
      {msg}
    </div>
  );
}
