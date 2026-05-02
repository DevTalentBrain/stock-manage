"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import parseClient from "@/lib/parse-client";

export interface City {
  id: string;
  name: string;
  shortCode: string;
  color: string;
  isActive: boolean;
}

export interface CityStock {
  id: string;
  productId: string;
  cityId: string;
  stock: number;
  cityName: string;
  cityShortCode: string;
  cityColor: string;
}

interface CityContextType {
  cities: City[];
  loading: boolean;
  refreshCities: () => Promise<void>;
  getStockForProduct: (productId: string) => CityStock[];
  refreshStock: (productId?: string) => Promise<Record<string, CityStock[]>>;
  productStockMap: Record<string, CityStock[]>;
}

const CityContext = createContext<CityContextType>({
  cities: [],
  loading: true,
  refreshCities: async () => {},
  getStockForProduct: () => [],
  refreshStock: async () => ({}),
  productStockMap: {},
});

export function CityProvider({ children }: { children: React.ReactNode }) {
  const [cities, setCities] = useState<City[]>([]);
  const [loading, setLoading] = useState(true);
  const [productStockMap, setProductStockMap] = useState<
    Record<string, CityStock[]>
  >({});

  const refreshCities = async () => {
    try {
      const City = parseClient.Object.extend("City");
      const query = new parseClient.Query(City);
      query.equalTo("isActive", true);
      query.ascending("name");
      const results = await query.find();
      setCities(
        results.map((c: any) => ({
          id: c.id,
          name: c.get("name"),
          shortCode: c.get("shortCode"),
          color: c.get("color"),
          isActive: c.get("isActive"),
        })),
      );
    } catch (error) {
      console.error("Error fetching cities:", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshStock = async (productId?: string) => {
    try {
      const CityStock = parseClient.Object.extend("CityStock");
      const query = new parseClient.Query(CityStock);
      query.include("city");
      if (productId) {
        const Product = parseClient.Object.extend("Product");
        const productPtr = Product.createWithoutData(productId);
        query.equalTo("product", productPtr);
      }
      const results = await query.find();

      const map: Record<string, CityStock[]> = {};
      results.forEach((cs: any) => {
        const pid = cs.get("product")?.id || cs.get("product")?.objectId;
        if (!pid) return;
        const cityObj = cs.get("city");
        if (!map[pid]) map[pid] = [];
        map[pid].push({
          id: cs.id,
          productId: pid,
          cityId: cityObj?.id || "",
          stock: cs.get("stock") || 0,
          cityName: cityObj?.get("name") || "Unknown",
          cityShortCode: cityObj?.get("shortCode") || "",
          cityColor: cityObj?.get("color") || "gray",
        });
      });

      if (productId) {
        setProductStockMap((prev) => ({ ...prev, ...map }));
      } else {
        setProductStockMap(map);
      }

      return map; // Return the map for direct use (avoids stale state issues)
    } catch (error) {
      console.error("Error fetching stock:", error);
      return {};
    }
  };

  const getStockForProduct = (productId: string): CityStock[] => {
    return productStockMap[productId] || [];
  };

  useEffect(() => {
    refreshCities();
  }, []);

  return (
    <CityContext.Provider
      value={{
        cities,
        loading,
        refreshCities,
        getStockForProduct,
        refreshStock,
        productStockMap,
      }}
    >
      {children}
    </CityContext.Provider>
  );
}

export const useCities = () => useContext(CityContext);
