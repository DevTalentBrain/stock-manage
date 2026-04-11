"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Navbar from "@/app/frontent/navbar";
import Link from "next/link";

export default function MainPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function initPage() {
      try {
        const currentUser = parseClient.User.current();
        setUser(currentUser);
        const Product = parseClient.Object.extend("Product");
        const query = new parseClient.Query(Product);
        query.descending("createdAt");
        const results = await query.find();
        setProducts(results);
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        setLoading(false);
      }
    }
    initPage();
  }, []);

  const scrollCarousel = (direction: "left" | "right") => {
    if (carouselRef.current) {
      const scrollAmount = 400;
      carouselRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth",
      });
    }
  };

  return (
    <main className="min-h-screen bg-white text-[#1d1d1f] font-sans antialiased">
      <Navbar
        cartCount={0}
        user={user}
        onOpenBag={() => {}}
        onLogout={() => {
          parseClient.User.logOut();
          window.location.reload();
        }}
      />

      {/* --- TOP SECTION: THE DUAL HERO (From Suggestion 1) --- */}
      <section className="pt-10 pb-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Large Hero */}
          <div className="lg:col-span-2 relative h-[500px] rounded-[3rem] overflow-hidden bg-black shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1616348436168-de43ad0db179?q=80&w=2000"
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              alt="iPhone 15"
            />
            <div className="absolute inset-0 flex flex-col justify-center px-12 text-white bg-gradient-to-t from-black/40 to-transparent">
              <span className="bg-blue-600 w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-4 tracking-widest">
                Stockholder Direct
              </span>
              <h1 className="text-6xl font-black tracking-tighter mb-4 leading-none">
                iPhone 15 Pro.
              </h1>
              <p className="max-w-xs mb-8 text-gray-200 font-medium">
                Titanium build. A17 Pro chip. Exclusive hub pricing for verified
                stockholders.
              </p>
              <button className="bg-white text-black px-10 py-4 rounded-full font-black uppercase text-[11px] w-fit hover:bg-blue-600 hover:text-white transition-all shadow-xl">
                Acquire Asset
              </button>
            </div>
          </div>

          {/* Side Info Cards */}
          <div className="flex flex-col gap-6">
            <div className="flex-1 rounded-[3rem] bg-[#f2f2f7] p-10 flex flex-col justify-between border border-gray-200 shadow-sm">
              <div>
                <span className="text-blue-600 font-black text-[10px] uppercase tracking-[0.2em] mb-2 block">
                  Network Status
                </span>
                <h3 className="text-2xl font-black text-black tracking-tight mb-2">
                  Hub Logistics
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  Kaunas & Vilnius hubs are currently operational for immediate
                  pickup.
                </p>
              </div>
              <Link
                href="/admin/support"
                className="flex items-center gap-2 text-black font-black text-xs uppercase tracking-widest hover:text-blue-600 transition-all"
              >
                Messenger{" "}
                <span className="bg-blue-600 text-white w-5 h-5 rounded-full flex items-center justify-center text-[8px]">
                  →
                </span>
              </Link>
            </div>

            <div className="flex-1 rounded-[3rem] bg-[#1d1d1f] p-10 text-white flex flex-col justify-center shadow-lg">
              <h3 className="text-xl font-black mb-2 tracking-tight">
                Weekly Offer
              </h3>
              <p className="text-gray-400 text-sm leading-relaxed mb-6">
                Verified stockholders receive 20% off all Apple ecosystem
                accessories.
              </p>
              <div className="h-1 w-12 bg-blue-600 rounded-full"></div>
            </div>
          </div>
        </div>
      </section>

      {/* --- FEATURED CAROUSEL: GLIDING ASSETS --- */}
      <section className="py-24 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-8 mb-12 flex justify-between items-end">
          <div>
            <h2 className="text-4xl font-black tracking-tighter">
              Asset Discovery.
            </h2>
            <p className="text-gray-400 font-medium text-sm mt-2">
              Browse the newest additions to the stockholder registry.
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => scrollCarousel("left")}
              className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-black hover:text-black transition-all"
            >
              ←
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="w-12 h-12 rounded-full border border-gray-200 bg-white flex items-center justify-center text-gray-400 hover:border-black hover:text-black transition-all"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-8 overflow-x-auto no-scrollbar px-8 md:px-[calc((100vw-80rem)/2)] snap-x"
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="min-w-[340px] bg-white rounded-[2.5rem] p-10 snap-center group border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-500"
            >
              <div className="aspect-square mb-8 flex items-center justify-center relative">
                <img
                  src={p.get("image")?.url()}
                  className="max-h-full object-contain drop-shadow-2xl group-hover:scale-105 transition-transform duration-700"
                  alt="Asset"
                />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <h4 className="text-xl font-black tracking-tight mb-1">
                    {p.get("name")}
                  </h4>
                  <p className="text-blue-600 font-bold tracking-tighter">
                    ${p.get("price").toLocaleString()}
                  </p>
                </div>
                <button className="bg-[#f2f2f7] p-3 rounded-full hover:bg-black hover:text-white transition-all">
                  🛒
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* --- CUSTOMER REVIEWS: CLEAN TESTIMONIALS --- */}
      <section className="py-24 bg-white">
        <div className="max-w-[1400px] mx-auto px-8">
          {" "}
          {/* Increased max-width to give the 4 cards more room */}
          <h2 className="text-center text-4xl font-black tracking-tighter mb-16 italic text-gray-800">
            Stockholder Feedback.
          </h2>
          {/* Changed to grid-cols-4 for large screens */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                user: "Eraj",
                msg: "The logistics speed to Kaunas was unmatched. High-tier service for stockholders.",
              },
              {
                user: "Fatima",
                msg: "Beautifully organized registry. My asset acquisition in Vilnius was seamless.",
              },
              {
                user: "Darius",
                msg: "Professional hub pickup. The ecosystem management is perfectly handled.",
              },
              {
                user: "Gabrielius",
                msg: "Very good service and client support, got my stock sorted out pretty quickly.",
              },
            ].map((rev, i) => (
              <div
                key={i}
                className="bg-[#f5f5f7] p-8 rounded-[2.5rem] border border-gray-100 flex flex-col justify-between"
              >
                <div>
                  <div className="flex gap-1 mb-4 text-blue-600 text-[10px]">
                    ★★★★★
                  </div>
                  <p className="text-gray-600 font-medium text-base leading-relaxed mb-6">
                    "{rev.msg}"
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center text-white text-[9px] font-black">
                    {rev.user[0]}
                  </div>
                  <span className="text-[9px] font-black uppercase text-gray-400 tracking-widest">
                    {rev.user}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* --- HUB INFRASTRUCTURE SECTION --- */}
      <section className="max-w-7xl mx-auto px-8 pb-24">
        <div className="bg-[#1d1d1f] rounded-[3.5rem] p-16 flex flex-col md:flex-row items-center justify-between text-white gap-12 shadow-2xl">
          <div className="max-w-lg">
            <span className="text-blue-500 font-black text-[10px] uppercase tracking-[0.4em] mb-4 block">
              Physical Registry
            </span>
            <h2 className="text-4xl font-black tracking-tight mb-6 leading-tight">
              Secure Infrastructure for Secure Assets.
            </h2>
            <p className="text-gray-400 font-medium">
              Our hubs serve as the bridge between digital registry and physical
              acquisition. Professional management at every step.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
              <h4 className="font-black text-sm">KAUNAS</h4>
              <p className="text-[10px] text-blue-500 mt-1 uppercase font-bold">
                Operational
              </p>
            </div>
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-3xl border border-white/10 text-center">
              <h4 className="font-black text-sm">VILNIUS</h4>
              <p className="text-[10px] text-blue-500 mt-1 uppercase font-bold">
                Operational
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-gray-100 bg-[#fbfbfd]">
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-10">
          <div className="flex flex-col items-center md:items-start">
            <h2 className="text-2xl font-black italic mb-2 text-black">
              iPhone<span className="text-blue-600 text-3xl">.</span>
            </h2>
            <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">
              Ecosystem Registry • 2026
            </p>
          </div>
          <div className="flex gap-12">
            <Link
              href="#"
              className="text-[10px] font-black uppercase text-gray-400 hover:text-black tracking-widest transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              href="#"
              className="text-[10px] font-black uppercase text-gray-400 hover:text-black tracking-widest transition-colors"
            >
              Hub Locations
            </Link>
            <Link
              href="#"
              className="text-[10px] font-black uppercase text-gray-400 hover:text-black tracking-widest transition-colors"
            >
              Admin Portal
            </Link>
          </div>
        </div>
      </footer>

      <style jsx global>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </main>
  );
}
