"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";

export default function Home() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const Product = parseClient.Object.extend("Product");
        const query = new parseClient.Query(Product);
        // Sort by newest first
        query.descending("createdAt");
        const results = await query.find();
        setProducts(results);
      } catch (error) {
        console.error("Error fetching products:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProducts();
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-xl font-semibold animate-pulse">
          Loading Inventory...
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-10">
          <h1 className="text-4xl font-extrabold text-gray-900">
            🛍️ Product Gallery
          </h1>
        </header>

        {products.length === 0 ? (
          <div className="text-center p-20 bg-white rounded-2xl shadow-sm border">
            <p className="text-gray-500 text-lg">
              No products found. Head to the Admin page to add some!
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {products.map((product) => (
              <div
                key={product.id}
                className="bg-white rounded-2xl shadow-md overflow-hidden hover:shadow-xl transition-shadow border border-gray-100"
              >
                {/* Product Image */}
                <div className="h-64 bg-gray-200 relative">
                  {product.get("image") ? (
                    <img
                      src={product.get("image").url()}
                      alt={product.get("name")}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      No Image Available
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="p-6">
                  <h2 className="text-xl font-bold text-gray-800 mb-1">
                    {product.get("name")}
                  </h2>

                  {/* Display the Stock count */}
                  <div className="flex items-center mb-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-bold ${
                        product.get("stock") > 0
                          ? "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      }`}
                    >
                      {product.get("stock") > 0
                        ? `In Stock: ${product.get("stock")}`
                        : "Out of Stock"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-sm text-gray-500">
                    <span>Added: {product.createdAt.toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
