export function GlassMorphNavbar() {
  return (
    <nav
      className="flex justify-between w-9/12 z-50 px-4 tex-lg fixed top-6 py-3 left-1/2 -translate-x-1/2 backdrop-blur-md rounded-3xl border-black border-2 bg-white/30 shadow-lg shadow-black/35
"
    >
      <div className="text-black">logo here</div>
      <div className="flex space-x-4">
        <div className="font-semibold  text-black">posts </div>
        <div className="font-semibold   text-black">likes </div>
        <div className="font-semibold   text-black"> comments </div>
        <div className="font-semibold  text-black">turbo </div>
      </div>
    </nav>
  );
}
