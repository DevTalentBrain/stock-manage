"use client";
import { useEffect, useState, useRef } from "react";
import parseClient from "@/lib/parse-client";
import Navbar from "@/app/user/frontent/navbar";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function MainPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const carouselRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

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

      {/* 🚩 NEW: CARGO POLICY BANNER */}
      <div className="bg-indigo-600 py-3 overflow-hidden whitespace-nowrap border-b border-indigo-700">
        <div className="flex animate-marquee gap-10 items-center">
          {[1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className="text-white text-[10px] font-black uppercase tracking-[0.3em] flex items-center gap-4"
            >
              🚛 Cargo Policy: Min. 5 Units per shipment{" "}
              <span className="opacity-40">|</span>
              🚫 2-3 Unit batches restricted{" "}
              <span className="opacity-40">|</span>
              📍 Door-to-door Logistics Active
            </span>
          ))}
        </div>
      </div>

      <section className="pt-10 pb-16 px-6 bg-white">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Cargo Hero */}
          <div className="lg:col-span-2 relative h-[500px] rounded-[3rem] overflow-hidden bg-black shadow-2xl group">
            <img
              src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=2000"
              className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:scale-105 transition-transform duration-[10s]"
              alt="Cargo Warehouse"
            />
            <div className="absolute inset-0 flex flex-col justify-center px-12 text-white bg-gradient-to-t from-black/80 via-transparent to-transparent">
              <span className="bg-indigo-600 w-fit px-4 py-1.5 rounded-full text-[10px] font-black uppercase mb-4 tracking-widest">
                Logistics Hub v3
              </span>
              <h1 className="text-6xl font-black tracking-tighter mb-4 leading-none">
                Bulk Cargo <br />
                Operations.
              </h1>
              <p className="max-w-sm mb-8 text-gray-300 font-medium text-lg leading-relaxed">
                Direct shipment from Kaunas & Vilnius hubs. Secure your volume
                assets with professional cargo handling.
              </p>
              <button
                onClick={() => router.push("/frontent")}
                className="bg-white text-black px-12 py-5 rounded-full font-black uppercase text-[11px] w-fit hover:bg-indigo-600 hover:text-white transition-all shadow-2xl active:scale-95"
              >
                Dispatch Cargo Order
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-6">
            <div className="flex-1 rounded-[3rem] bg-[#f2f2f7] p-10 flex flex-col justify-between border border-gray-100">
              <div>
                <span className="text-indigo-600 font-black text-[10px] uppercase tracking-[0.2em] mb-2 block">
                  Network Status
                </span>
                <h3 className="text-2xl font-black text-black tracking-tight mb-2 italic">
                  Hub Readiness
                </h3>
                <p className="text-gray-500 text-sm font-medium">
                  Both regional centers are ready for High-Volume dispatching
                  today.
                </p>
              </div>
              <div className="h-2 w-full bg-white rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 w-[95%]"></div>
              </div>
            </div>

            <div className="flex-1 rounded-[3rem] bg-indigo-600 p-10 text-white flex flex-col justify-center shadow-xl relative overflow-hidden">
              <div className="absolute top-[-20%] right-[-10%] text-white/10 text-[120px] font-black pointer-events-none select-none">
                TRUCK
              </div>
              <h3 className="text-2xl font-black mb-2 tracking-tight">
                Bulk Only.
              </h3>
              <p className="text-indigo-100 text-sm font-bold uppercase tracking-widest opacity-80 leading-relaxed">
                Logistics optimized for batches of 5+. Verified business
                delivery.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* --- CARGO INVENTORY SECTION --- */}
      <section className="py-32 bg-[#f5f5f7]">
        <div className="max-w-7xl mx-auto px-8 mb-16 flex justify-between items-end">
          <div>
            <span className="text-indigo-600 text-[10px] font-black uppercase tracking-[0.2em] mb-4 block">
              Asset Registry
            </span>
            <h2 className="text-5xl font-black tracking-tighter">
              Current Stockpile.
            </h2>
          </div>

          <div className="flex gap-4">
            <button
              onClick={() => scrollCarousel("left")}
              className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-all"
            >
              ←
            </button>
            <button
              onClick={() => scrollCarousel("right")}
              className="w-14 h-14 rounded-full bg-white border border-gray-200 flex items-center justify-center shadow-sm hover:bg-black hover:text-white transition-all"
            >
              →
            </button>
          </div>
        </div>

        <div
          ref={carouselRef}
          className="flex gap-10 overflow-x-auto no-scrollbar px-8 md:px-[calc((100vw-80rem)/2)] snap-x pb-12"
        >
          {products.map((p) => (
            <div
              key={p.id}
              className="min-w-[400px] bg-white rounded-[3rem] p-12 snap-center border border-gray-100 shadow-sm hover:shadow-2xl transition-all duration-500 group"
            >
              <div className="aspect-square mb-10 flex items-center justify-center bg-[#fbfbfd] rounded-[2rem]">
                <img
                  src={p.get("image")?.url()}
                  className="max-h-[70%] object-contain group-hover:scale-110 transition-transform duration-700"
                  alt={p.get("name")}
                />
              </div>
              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1">
                    Stock Item
                  </p>
                  <h4 className="text-2xl font-black text-black tracking-tight">
                    {p.get("name")}
                  </h4>
                  <p className="text-xl font-medium mt-1">
                    ${p.get("price").toLocaleString()}
                  </p>
                </div>
                <button
                  onClick={() => router.push("/frontent")}
                  className="bg-black text-white h-14 px-8 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-indigo-600 transition-all"
                >
                  Order Bulk
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* REVIEWS */}
      <section className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-8">
          <h2 className="text-3xl font-black tracking-tighter mb-16 uppercase italic">
            Logistics Testimonials
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[
              {
                user: "Eraj",
                msg: "Bulk order of 50 units reached Kaunas in 24 hours. Solid logistics.",
              },
              {
                user: "Fatima",
                msg: "Verified cargo system is perfect for warehouse management.",
              },
              {
                user: "Darius",
                msg: "The 5-unit minimum makes sense for high-tier logistics efficiency.",
              },
              {
                user: "Gabrielius",
                msg: "Best cargo service in the region. Vilnius hub is top notch.",
              },
            ].map((rev, i) => (
              <div
                key={i}
                className="bg-gray-50 p-10 rounded-[2.5rem] border border-gray-100 flex flex-col justify-between shadow-inner"
              >
                <p className="text-gray-600 font-bold text-sm leading-relaxed mb-6 italic">
                  "{rev.msg}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-black rounded-full flex items-center justify-center text-white text-[10px] font-black">
                    {rev.user[0]}
                  </div>
                  <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                    {rev.user}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-20 border-t border-gray-100 bg-[#fbfbfd] text-center">
        <h2 className="text-2xl font-black italic mb-2 text-black">
          Logistics Hub<span className="text-indigo-600 text-3xl">.</span>
        </h2>
        <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.5em]">
          Cargo System • Vilnius & Kaunas Hubs • 2026
        </p>
      </footer>

      <style jsx global>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-marquee {
          display: flex;
          width: 200%;
          animation: marquee 25s linear infinite;
        }
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
