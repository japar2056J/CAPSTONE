const { collections } = require('../config/db');
const kursService = require('./kursService');

class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const buildProduct = (payload, userId, existing = {}) => {
  const product = {
    name: payload.name?.trim(),
    description: payload.description?.trim() || '',
    vendorId: payload.vendorId?.trim(),
    releaseDate: payload.releaseDate,
    componentsDetail: payload.componentsDetail || [],
    totalPrice: payload.totalPrice !== undefined ? payload.totalPrice : (existing.totalPrice || 0),
    ...existing
  };
  return product;
};

// Create product
const createProduct = async (data, userId) => {
  if (!data.name || !data.vendorId || !data.releaseDate) {
    throw new HttpError('Name, vendorId, and releaseDate are required', 400);
  }

  // Verify vendor exists
  const vendorDoc = await collections.vendors.doc(data.vendorId).get();
  if (!vendorDoc.exists) {
    throw new HttpError('Vendor tidak ditemukan', 400);
  }

  // Determine kurs to attach to product record.
  // Prefer kurs at the product's release date; fall back to current kurs.
  let kursRecord = { value: null, source: null, fetchedAt: new Date().toISOString() };
  try {
    if (data.releaseDate) {
      // try to fetch historical kurs for the exact release date (YYYY-MM-DD)
      try {
        const dateISO = new Date(data.releaseDate).toISOString().slice(0, 10);
        const kdate = await kursService.getKursByDate(dateISO);
        // kursService.getKursByDate may return either a number or an object
        if (kdate && typeof kdate === 'object') {
          kursRecord.value = kdate.value ?? null;
          kursRecord.source = kdate.source ?? 'historical';
          kursRecord.fetchedAt = kdate.date || kdate.fetchedAt || kursRecord.fetchedAt;
        } else if (kdate != null) {
          kursRecord.value = kdate;
          kursRecord.source = 'historical';
        }
      } catch (errDate) {
        // ignore and fallback to current kurs
        console.error('Historical kurs lookup failed, will fallback to current kurs:', errDate.message);
      }
    }

    // If historical not found, use current kurs
    if (!kursRecord.value) {
      const k = await kursService.getKurs();
      kursRecord.value = k?.value ?? kursRecord.value;
      kursRecord.source = kursRecord.source || k?.source || 'current';
      kursRecord.fetchedAt = kursRecord.fetchedAt || k?.fetchedAt || k?.cachedAt || k?.updatedAt;
    }
  } catch (e) {
    // If kurs fetch fails entirely, leave value null and continue
    console.error('Failed to fetch kurs for new product (final):', e.message);
  }

  const product = buildProduct(data, userId, {
    componentsDetail: [],
    totalPrice: 0,
    createdAt: new Date().toISOString(),
    createdBy: userId || 'system',
    kurs: kursRecord.value,
    kursSource: kursRecord.source,
    kursFetchedAt: kursRecord.fetchedAt
  });

  const docRef = await collections.products.add(product);
  return { id: docRef.id, ...product };
};

// Get all products
const getAllProducts = async () => {
  const snapshot = await collections.products.orderBy('createdAt', 'desc').get();
  const products = [];
  snapshot.forEach((doc) => products.push({ id: doc.id, ...doc.data() }));
  return products;
};

// Get product by ID
const getProductById = async (id) => {
  const doc = await collections.products.doc(id).get();
  if (!doc.exists) throw new HttpError('Product tidak ditemukan', 404);
  return { id: doc.id, ...doc.data() };
};

// Update product
const updateProduct = async (id, data, userId) => {
  if (!data || Object.keys(data).length === 0) {
    throw new HttpError('No fields to update', 400);
  }

  const existing = await collections.products.doc(id).get();
  if (!existing.exists) throw new HttpError('Product tidak ditemukan', 404);

  // If vendorId is being updated, verify vendor exists
  if (data.vendorId) {
    const vendorDoc = await collections.vendors.doc(data.vendorId).get();
    if (!vendorDoc.exists) {
      throw new HttpError('Vendor tidak ditemukan', 400);
    }
  }

  const updated = buildProduct(data, userId, {
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'system'
  });

  await collections.products.doc(id).update(updated);
  return { id, ...existing.data(), ...updated };
};

// Delete product
const deleteProduct = async (id) => {
  const existing = await collections.products.doc(id).get();
  if (!existing.exists) throw new HttpError('Product tidak ditemukan', 404);
  await collections.products.doc(id).delete();
  return true;
};

// Get total product value (for dashboard)
const getTotalProductValue = async () => {
  const snapshot = await collections.products.get();
  let total = 0;
  snapshot.forEach((doc) => {
    total += doc.data().totalPrice || 0;
  });
  return total;
};

// Get product count (for dashboard)
const getProductCount = async () => {
  const snapshot = await collections.products.get();
  return snapshot.size;
};

// Get component count (for dashboard)
const getComponentCount = async () => {
  const snapshot = await collections.components.get();
  return snapshot.size;
};

// Get product statistics (for dashboard)
const getProductStats = async () => {
  const snapshot = await collections.products.get();
  const products = [];
  
  snapshot.forEach((doc) => {
    products.push({
      id: doc.id,
      ...doc.data()
    });
  });

  if (products.length === 0) {
    return {
      totalProducts: 0,
      totalValue: 0,
      avgValue: 0,
      maxValue: 0,
      minValue: 0
    };
  }

  const totalValue = products.reduce((sum, p) => sum + (p.totalPrice || 0), 0);
  const prices = products.map(p => p.totalPrice || 0).sort((a, b) => a - b);

  return {
    totalProducts: products.length,
    totalValue,
    avgValue: totalValue / products.length,
    maxValue: Math.max(...prices),
    minValue: Math.min(...prices)
  };
};

// Group products by vendor
const getProductsByVendor = async () => {
  const snapshot = await collections.products.get();
  const grouped = {};

  snapshot.forEach((doc) => {
    const vendorId = doc.data().vendorId;
    if (!grouped[vendorId]) {
      grouped[vendorId] = [];
    }
    grouped[vendorId].push({
      id: doc.id,
      ...doc.data()
    });
  });

  return grouped;
};

// Group products by year
const getProductsByYear = async () => {
  const snapshot = await collections.products.get();
  const grouped = {};

  snapshot.forEach((doc) => {
    const releaseDate = doc.data().releaseDate;
    if (releaseDate) {
      const year = new Date(releaseDate).getFullYear();
      if (!grouped[year]) {
        grouped[year] = [];
      }
      grouped[year].push({
        id: doc.id,
        ...doc.data()
      });
    }
  });

  return grouped;
};

module.exports = {
  HttpError,
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  getTotalProductValue,
  getProductCount,
  getComponentCount,
  getProductStats,
  getProductsByVendor,
  getProductsByYear
};
