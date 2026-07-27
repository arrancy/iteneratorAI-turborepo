import { GlassMorphNavbar } from "@/ui/GlassMorphNavbar";

export default function Home() {
  return (
    <div>
      <GlassMorphNavbar></GlassMorphNavbar>

      <main className="min-h-screen bg-gradient-to-br from-purple-400 via-blue-400 to-pink-400">
        <div className="h-[200vh] pt-32 text-black text-center font-extrabold text-4xl">
          Scroll content here
        </div>
      </main>
    </div>
  );
}
