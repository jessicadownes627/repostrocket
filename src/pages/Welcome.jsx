import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] relative overflow-hidden">

      {/* BACKGROUND EMERALD GRADIENT */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-[#0B1A14] to-[#04120D] opacity-80"></div>

      {/* CONTENT */}
      <div className="relative z-10 text-center px-8 max-w-xl">

        {/* TITLE */}
        <h1 className="text-[40px] md:text-[52px] font-[Cinzel] font-semibold text-[#E8DCC0] tracking-wide drop-shadow-[0_0_6px_rgba(232,213,168,0.25)]">
          Repost Rocket
        </h1>

        {/* SUBTITLE */}
        <p className="text-lg md:text-xl text-[#D9D0C0] opacity-80 mt-3 font-light tracking-wide">
          Your AI-Powered Selling Prep Studio
        </p>

        {/* SHIMMER UNDERLINE */}
        <div className="relative w-40 h-[2px] mx-auto mt-5 mb-10">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8DCC0] to-transparent opacity-60 blur-[1px]"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#E8DCC0] to-transparent animate-[shimmer_2.8s_infinite]"></div>
        </div>

        {/* CTA BUTTON */}
        <button
          onClick={() => navigate("/dashboard")}
          className="
            mt-4 px-8 py-4 text-lg font-medium
            bg-gradient-to-br from-[#0D201A] to-[#07120E]
            text-[#E8DCC0]
            border border-[#CBB78A]/40
            rounded-2xl
            shadow-[0_0_20px_rgba(203,183,138,0.25)]
            hover:shadow-[0_0_26px_rgba(203,183,138,0.45)]
            hover:border-[#E8DCC0]/70
            transition-all duration-300
            backdrop-blur-md
          "
        >
          Start Your Prep
        </button>
      </div>

      {/* SHIMMER KEYFRAMES */}
      <style>{`
        @keyframes shimmer {
          0% { transform: translateX(-60%); }
          100% { transform: translateX(160%); }
        }
      `}</style>
    </div>
  );
}
