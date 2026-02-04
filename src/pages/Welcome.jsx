import { useNavigate } from "react-router-dom";

export default function Welcome() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#030303] relative overflow-hidden">

      {/* CONTENT */}
      <div className="relative z-10 text-center px-8 max-w-xl">

        {/* TITLE */}
        <h1 className="text-[40px] md:text-[52px] font-[Cinzel] font-semibold text-[#E8DCC0] tracking-wide drop-shadow-[0_0_6px_rgba(232,213,168,0.25)]">
          Repost Rocket
        </h1>

        {/* SUBTITLE */}
        <p className="text-xl md:text-2xl text-[#E6DCC6] opacity-85 mt-2 font-light tracking-wide">
          List Faster. Everywhere.
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
            mt-4 px-10 py-4 text-lg font-medium
            bg-[#050505]
            text-[#F5EBD5]
            border border-[#E8DCC0]/50
            rounded-2xl
            shadow-[0_0_16px_rgba(232,220,192,0.18)]
            hover:shadow-[0_0_24px_rgba(232,220,192,0.35)]
            hover:border-[#F5EBD5]/70
            transition-all duration-300
            backdrop-blur-md
          "
        >
          Start
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
