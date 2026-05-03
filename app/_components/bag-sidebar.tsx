"use client";
import React from "react";

interface BagSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  cart: any[];
  onRemove: (id: string) => void;
  onDecrease: (id: string) => void;
  onIncrease: (product: any, city: string) => void;
  total: number;
  onCheckout: () => void;
}

export default function BagSidebar({
  isOpen,
  onClose,
  cart,
  onRemove,
  onDecrease,
  onIncrease,
  total,
  onCheckout,
}: BagSidebarProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col p-10 animate-in slide-in-from-right duration-500">
        <div className="flex justify-between items-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight text-gray-900">
            Your Bag.
          </h2>
          <button
            onClick={onClose}
            className="text-2xl text-gray-300 hover:text-black transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-8 no-scrollbar">
          {cart.map((item) => (
            <div
              key={`${item.product.id}`}
              className="flex items-center gap-4 py-6 border-b border-gray-50"
            >
              <div className="h-16 w-16 bg-gray-50 rounded-xl flex items-center justify-center p-2">
                {item.product.get("image") && (
                  <img
                    src={item.product.get("image").url()}
                    alt="item"
                    className="max-h-full object-contain"
                  />
                )}
              </div>
              <div className="flex-1 space-y-1">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-bold text-base text-gray-900 leading-tight">
                      {item.product.get("name")}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <p className="font-bold text-blue-600 text-sm">
                      ${(item.product.get("price") * item.qty).toLocaleString()}
                    </p>
                    <button
                      onClick={() => onRemove(item.product.id)}
                      className="text-[10px] text-gray-400 hover:text-red-500 font-bold uppercase tracking-tighter transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-gray-50 px-3 py-1 rounded-full w-fit mt-2">
                  <button
                    onClick={() => onDecrease(item.product.id)}
                    className="text-gray-400 hover:text-black font-bold px-1"
                  >
                    -
                  </button>
                  <span className="text-[10px] font-black w-4 text-center text-gray-900">
                    {item.qty}
                  </span>
                  <button
                    onClick={() =>
                      onIncrease(
                        item.product,
                        item.allocations?.[0]?.city || "",
                      )
                    }
                    className="text-gray-400 hover:text-black font-bold px-1"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-8 border-t border-gray-100">
          <div className="flex justify-between text-2xl font-bold mb-8 text-gray-900">
            <span>Total</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <button
            onClick={onCheckout}
            className="w-full bg-[#1d1d1f] text-white py-4 rounded-full font-bold text-lg hover:bg-black shadow-xl transition-all active:scale-95"
          >
            Check Out
          </button>
        </div>
      </div>
    </div>
  );
}
