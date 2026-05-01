"use client";
import { useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";
import Link from "next/link";
export default function CitiesManagement() {
  const [cities, setCities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [shortCode, setShortCode] = useState("");
  const [color, setColor] = useState("blue");
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const colorOptions = [
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "emerald", label: "Emerald", class: "bg-emerald-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "red", label: "Red", class: "bg-red-500" },
    { value: "pink", label: "Pink", class: "bg-pink-500" },
    { value: "indigo", label: "Indigo", class: "bg-indigo-500" },
    { value: "teal", label: "Teal", class: "bg-teal-500" },
  ];

  async function fetchCities() {
    try {
      const City = parseClient.Object.extend("City");
      const query = new parseClient.Query(City);
      query.ascending("name");
      const results = await query.find();
      setCities(results);
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCities();
  }, []);

  const resetForm = () => {
    setEditId(null);
    setName("");
    setShortCode("");
    setColor("blue");
    setIsActive(true);
  };

  const startEdit = (city: any) => {
    setEditId(city.id);
    setName(city.get("name"));
    setShortCode(city.get("shortCode"));
    setColor(city.get("color") || "blue");
    setIsActive(city.get("isActive") !== false);
  };

  const handleSave = async () => {
    if (!name || !shortCode) return alert("Name and Short Code are required!");
    setSaving(true);

    try {
      const City = parseClient.Object.extend("City");
      let city: any;

      if (editId) {
        const query = new parseClient.Query(City);
        city = await query.get(editId);
      } else {
        city = new City();
      }

      city.set("name", name);
      city.set("shortCode", shortCode.toUpperCase());
      city.set("color", color);
      city.set("isActive", isActive);

      await city.save();
      alert(editId ? "✅ City updated!" : "✅ City created!");
      resetForm();
      fetchCities();
    } catch (error: any) {
      alert("Error: " + error.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (cityId: string) => {
    if (
      !confirm(
        "Delete this city? This will also remove all stock entries for this city.",
      )
    )
      return;

    try {
      // Delete associated CityStock entries first
      const CityStock = parseClient.Object.extend("CityStock");
      const stockQuery = new parseClient.Query(CityStock);
      const cityPtr = {
        __type: "Pointer",
        className: "City",
        objectId: cityId,
      };
      stockQuery.equalTo("city", cityPtr);
      const stockEntries = await stockQuery.find();
      for (const entry of stockEntries) {
        await entry.destroy();
      }

      // Delete the city
      const City = parseClient.Object.extend("City");
      const query = new parseClient.Query(City);
      const city = await query.get(cityId);
      await city.destroy();

      alert("🗑️ City deleted successfully");
      fetchCities();
    } catch (error: any) {
      alert("Error: " + error.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] p-8 md:p-16 font-sans text-black antialiased">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">
              Cities Management
            </h1>
            <p className="text-gray-400 text-sm italic">
              Manage warehouse hub locations
            </p>
          </div>
          <Link
            href="/admin/dashboard"
            className="text-[10px] font-black border border-black px-6 py-2 rounded-full uppercase"
          >
            ← Dashboard
          </Link>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* FORM */}
          <div className="lg:col-span-1">
            <div className="bg-[#1d1d1f] text-white p-8 rounded-[2.5rem] shadow-2xl sticky top-10">
              <h2 className="text-xl font-bold mb-6">
                {editId ? "Edit City" : "New City"}
              </h2>

              <div className="space-y-5">
                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    City Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Kaunas"
                    className="w-full bg-white/5 rounded-xl p-3 outline-none focus:bg-white/10"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Short Code
                  </label>
                  <input
                    type="text"
                    value={shortCode}
                    onChange={(e) => setShortCode(e.target.value.toUpperCase())}
                    placeholder="e.g. KNS"
                    maxLength={5}
                    className="w-full bg-white/5 rounded-xl p-3 outline-none focus:bg-white/10 uppercase"
                  />
                </div>

                <div>
                  <label className="text-[9px] uppercase font-black text-gray-500 mb-2 block tracking-widest">
                    Color Theme
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {colorOptions.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setColor(opt.value)}
                        className={`h-10 rounded-xl ${opt.class} ${
                          color === opt.value
                            ? "ring-2 ring-white ring-offset-2 ring-offset-[#1d1d1f]"
                            : "opacity-60 hover:opacity-100"
                        } transition-all`}
                        title={opt.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="w-5 h-5 accent-blue-600"
                  />
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Active
                  </label>
                </div>

                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full bg-blue-600 hover:bg-blue-500 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] mt-4 transition-all active:scale-95 shadow-lg"
                >
                  {saving
                    ? "Saving..."
                    : editId
                      ? "Update City"
                      : "Create City"}
                </button>

                {editId && (
                  <button
                    onClick={resetForm}
                    className="w-full text-gray-500 text-[10px] font-black uppercase mt-4"
                  >
                    Cancel Editing
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* TABLE */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
              <table className="w-full text-left">
                <thead className="bg-gray-50 text-[10px] uppercase font-black text-gray-400 border-b">
                  <tr>
                    <th className="px-8 py-6">City</th>
                    <th className="px-6 py-6">Code</th>
                    <th className="px-6 py-6">Status</th>
                    <th className="px-8 py-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-20 text-center opacity-20 font-black uppercase animate-pulse"
                      >
                        Loading...
                      </td>
                    </tr>
                  ) : cities.length === 0 ? (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-20 text-center text-gray-300 font-black uppercase text-[10px]"
                      >
                        No cities found. Create your first city above.
                      </td>
                    </tr>
                  ) : (
                    cities.map((city) => {
                      const cityColor = city.get("color") || "gray";
                      const colorMap: Record<string, string> = {
                        blue: "bg-blue-500",
                        emerald: "bg-emerald-500",
                        purple: "bg-purple-500",
                        orange: "bg-orange-500",
                        red: "bg-red-500",
                        pink: "bg-pink-500",
                        indigo: "bg-indigo-500",
                        teal: "bg-teal-500",
                      };

                      return (
                        <tr
                          key={city.id}
                          className="hover:bg-gray-50/30 transition-all"
                        >
                          <td className="px-8 py-6">
                            <div className="flex items-center gap-4">
                              <div
                                className={`w-10 h-10 rounded-xl ${colorMap[cityColor] || "bg-gray-500"} flex items-center justify-center text-white font-black text-sm`}
                              >
                                {city.get("shortCode")}
                              </div>
                              <div>
                                <p className="font-black text-sm">
                                  {city.get("name")}
                                </p>
                                <p className="text-[9px] text-gray-400 font-bold uppercase">
                                  {city.get("shortCode")}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-6">
                            <span className="text-[10px] font-mono font-bold text-gray-500 bg-gray-50 px-3 py-1 rounded-lg border">
                              {city.get("shortCode")}
                            </span>
                          </td>
                          <td className="px-6 py-6">
                            {city.get("isActive") !== false ? (
                              <span className="text-[9px] font-black text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full uppercase">
                                ● Active
                              </span>
                            ) : (
                              <span className="text-[9px] font-black text-gray-400 bg-gray-100 px-3 py-1 rounded-full uppercase">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-8 py-6 text-right">
                            <div className="flex justify-end gap-4">
                              <button
                                onClick={() => startEdit(city)}
                                className="text-[10px] font-black text-gray-400 hover:text-blue-600"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => handleDelete(city.id)}
                                className="text-[10px] font-black text-gray-300 hover:text-red-500"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
