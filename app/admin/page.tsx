"use client";
import { useState } from "react";
import parseClient from "@/lib/parse-client";

export default function AdminPage() {
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [stock, setStock] = useState(0); // 1. New state for stock
  const [uploading, setUploading] = useState(false);

  const handleUpload = async () => {
    if (!file || !name) return alert("Please provide a name and an image!");

    setUploading(true);
    try {
      const Product = parseClient.Object.extend("Product");
      const p = new Product();

      const parseFile = new parseClient.File(file.name, file);
      await parseFile.save();

      p.set("name", name);
      p.set("image", parseFile);
      p.set("stock", Number(stock)); // 2. Save stock as a number

      await p.save();

      alert("✅ Product and Stock saved!");
      setName("");
      setStock(0);
      setFile(null);
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-10 border m-10 rounded-lg shadow-md max-w-md mx-auto bg-white text-black">
      <h2 className="text-xl font-bold mb-4">Admin: Add Product</h2>

      <input
        type="text"
        placeholder="Product Name"
        value={name}
        className="border p-2 w-full mb-4 rounded"
        onChange={(e) => setName(e.target.value)}
      />

      {/* 3. New Stock Input Field */}
      <input
        type="number"
        placeholder="Stock Quantity"
        value={stock}
        className="border p-2 w-full mb-4 rounded"
        onChange={(e) => setStock(parseInt(e.target.value))}
      />

      <input
        type="file"
        className="mb-4 block w-full text-sm"
        onChange={(e: any) => setFile(e.target.files[0])}
      />

      <button
        onClick={handleUpload}
        disabled={uploading}
        className="bg-blue-600 text-white px-4 py-2 rounded w-full font-bold"
      >
        {uploading ? "Uploading..." : "Upload Product"}
      </button>
    </div>
  );
}
