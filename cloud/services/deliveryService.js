const tables = require("../consts/tables");

class DeliveryService {
  /**
   * Dispatch stock between cities (creates Cargo record, no stock changes).
   */
  async dispatchStock({
    items,
    sourceCityId,
    destCityId,
    manifestData,
    fromCityName,
    toCityName,
  }) {
    if (!items || !sourceCityId || !destCityId) {
      throw new Parse.Error(
        Parse.Error.INVALID_PARAMS,
        "Missing required parameters.",
      );
    }

    const Cargo = Parse.Object.extend(tables.CARGO);
    const useMasterKey = true;

    // Check if there's already an "In Transit" Cargo for this route
    const existingQuery = new Parse.Query(Cargo);
    existingQuery.equalTo("status", "In Transit");
    existingQuery.equalTo("fromCityId", sourceCityId);
    existingQuery.equalTo("toCityId", destCityId);
    const existingCargo = await existingQuery.first({ useMasterKey });

    if (existingCargo) {
      // Merge: append new items and sum quantities for matching items
      const existingNames = existingCargo.get("itemNames") || [];
      const existingImages = existingCargo.get("itemImages") || [];
      const existingQtys = existingCargo.get("itemQtys") || [];

      for (let i = 0; i < items.length; i++) {
        const newName = manifestData[i].name;
        const newImage = manifestData[i].image;
        const newQty = items[i].qty;

        const existingIdx = existingNames.indexOf(newName);
        if (existingIdx >= 0) {
          existingQtys[existingIdx] = (existingQtys[existingIdx] || 0) + newQty;
        } else {
          existingNames.push(newName);
          existingImages.push(newImage);
          existingQtys.push(newQty);
        }
      }

      existingCargo.set("itemNames", existingNames);
      existingCargo.set("itemImages", existingImages);
      existingCargo.set("itemQtys", existingQtys);
      existingCargo.set("cargoCount", existingNames.length);
      await existingCargo.save(null, { useMasterKey });

      return { success: true, merged: true };
    }

    // Create new Cargo Record
    const cargo = new Cargo();
    cargo.set("status", "In Transit");
    cargo.set("fromCity", fromCityName);
    cargo.set("toCity", toCityName);
    cargo.set("fromCityId", sourceCityId);
    cargo.set("toCityId", destCityId);
    cargo.set("cargoCount", items.length);
    cargo.set(
      "itemNames",
      manifestData.map((d) => d.name),
    );
    cargo.set(
      "itemImages",
      manifestData.map((d) => d.image),
    );
    cargo.set(
      "itemQtys",
      items.map((i) => i.qty),
    );
    cargo.set("eta", "45 mins");
    await cargo.save(null, { useMasterKey });

    return { success: true, merged: false };
  }

  /**
   * Confirm arrival — moves stock from source to destination.
   */
  async confirmArrival({ productIds, destinationHub }) {
    if (!productIds || !destinationHub) {
      throw new Parse.Error(
        Parse.Error.INVALID_PARAMS,
        "Missing required parameters: productIds, destinationHub",
      );
    }

    const Cargo = Parse.Object.extend(tables.CARGO);
    const CityStock = Parse.Object.extend(tables.CITY_STOCK);
    const useMasterKey = true;

    // Find the most recent "In Transit" Cargo record
    const cargoQuery = new Parse.Query(Cargo);
    cargoQuery.equalTo("status", "In Transit");
    cargoQuery.descending("createdAt");

    const cargoRecord = await cargoQuery.first({ useMasterKey });
    if (!cargoRecord) {
      throw new Parse.Error(
        Parse.Error.OBJECT_NOT_FOUND,
        "No cargo in transit found.",
      );
    }

    const sourceCityId = cargoRecord.get("fromCityId");
    const destCityId = cargoRecord.get("toCityId");
    const itemQtys = cargoRecord.get("itemQtys") || [];
    const itemNames = cargoRecord.get("itemNames") || [];

    // Move stock: decrement from source, increment in destination
    for (let i = 0; i < itemNames.length; i++) {
      const productName = itemNames[i];
      const qty = itemQtys[i] || 0;
      if (qty <= 0) continue;

      // Find the Product by name
      const Product = Parse.Object.extend(tables.PRODUCT);
      const productQuery = new Parse.Query(Product);
      productQuery.equalTo("name", productName);
      const product = await productQuery.first({ useMasterKey });
      if (!product) continue;

      const productPtr = {
        __type: "Pointer",
        className: tables.PRODUCT,
        objectId: product.id,
      };

      // Decrement from source city
      const fromQuery = new Parse.Query(CityStock);
      fromQuery.equalTo("product", productPtr);
      fromQuery.equalTo("city", {
        __type: "Pointer",
        className: tables.CITY,
        objectId: sourceCityId,
      });
      const fromEntry = await fromQuery.first({ useMasterKey });
      if (fromEntry) {
        const current = fromEntry.get("stock") || 0;
        fromEntry.set("stock", Math.max(0, current - qty));
        await fromEntry.save(null, { useMasterKey });
      }

      // Increment in destination city
      const toQuery = new Parse.Query(CityStock);
      toQuery.equalTo("product", productPtr);
      toQuery.equalTo("city", {
        __type: "Pointer",
        className: tables.CITY,
        objectId: destCityId,
      });
      const toEntry = await toQuery.first({ useMasterKey });
      if (toEntry) {
        toEntry.set("stock", (toEntry.get("stock") || 0) + qty);
        await toEntry.save(null, { useMasterKey });
      } else {
        const newEntry = new CityStock();
        newEntry.set("product", productPtr);
        newEntry.set("city", {
          __type: "Pointer",
          className: tables.CITY,
          objectId: destCityId,
        });
        newEntry.set("stock", qty);
        await newEntry.save(null, { useMasterKey });
      }
    }

    // Close the cargo record
    cargoRecord.set("status", "Delivered");
    cargoRecord.set("arrivedAt", new Date().toISOString());
    await cargoRecord.save(null, { useMasterKey });

    return { success: true, updatedCount: itemNames.length };
  }
}

module.exports = new DeliveryService();
