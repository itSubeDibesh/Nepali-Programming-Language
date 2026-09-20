import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#060911] text-[#E2E8F0] flex flex-col items-center justify-center p-6 selection:bg-emerald-500/30">
      {/* Background Decorative Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-emerald-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/3 w-96 h-96 bg-[#DC143C]/10 rounded-full blur-[140px]" />
      </div>

      <div className="relative z-10 max-w-lg w-full bg-[#0F172A]/80 border border-[#1E293B] rounded-2xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-6">
        {/* Nepal Flag & Code badge */}
        <div className="flex items-center justify-center space-x-3">
          <div className="w-10 h-12 flex items-center justify-center filter drop-shadow-md">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 50" className="w-full h-full">
              <polygon points="0,0 36,24 16,24 36,48 0,48" fill="#003893"/>
              <polygon points="3,4 30,22 13,22 30,44 3,44" fill="#DC143C"/>
              <path d="M 9,14 A 4,4 0 0,0 17,14 A 3.5,3.5 0 0,1 10,13 Z" fill="#FFFFFF"/>
              <circle cx="13" cy="15" r="1.5" fill="#FFFFFF"/>
              <circle cx="13" cy="33" r="3" fill="#FFFFFF"/>
              <g fill="#FFFFFF" stroke="#FFFFFF" strokeWidth="0.5">
                <line x1="13" y1="28.5" x2="13" y2="37.5"/>
                <line x1="8.5" y1="33" x2="17.5" y2="33"/>
                <line x1="9.8" y1="29.8" x2="16.2" y2="36.2"/>
                <line x1="9.8" y1="36.2" x2="16.2" y2="29.8"/>
              </g>
            </svg>
          </div>
          <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 font-mono text-xs rounded-full font-semibold uppercase tracking-wider">
            त्रुटि ४०४ (Error 404)
          </span>
        </div>

        {/* Headings */}
        <div className="space-y-2">
          <h1 className="text-3xl font-extrabold tracking-tight text-white font-sans">
            पृष्ठ फेला परेन
          </h1>
          <p className="text-xs font-mono text-slate-400 uppercase tracking-widest">
            Page Not Found
          </p>
        </div>

        {/* Description */}
        <p className="text-sm text-slate-300 leading-relaxed">
          तपाईंले खोज्नुभएको पृष्ठ अस्तित्वमा छैन वा हटाइएको छ। तल दिइएको बटनबाट स्टुडियोको मुख्य सम्पादकमा फर्कन सक्नुहुन्छ।
        </p>

        {/* Visual Nepali snippet */}
        <div className="bg-[#060911] border border-[#1E293B] rounded-lg p-3 text-left font-mono text-xs text-slate-400 overflow-x-auto">
          <span className="text-emerald-400">यदि</span> (पृष्ठ == <span className="text-rose-400">शून्य</span>) &#123;<br/>
          &nbsp;&nbsp;<span className="text-blue-400">भनौँ</span>(<span className="text-amber-300">&quot;घर फर्कनुहोस्!&quot;</span>);<br/>
          &#125;
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <Link
            href="/"
            className="w-full inline-flex items-center justify-center space-x-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95"
          >
            <span>← मुख्य स्टुडियोमा फर्कनुहोस् (Back to Studio)</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
