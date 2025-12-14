const { collections } = require('../config/db');

class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

const buildComponent = (payload, userId, existing = {}) => {
  const component = {
    name: payload.name?.trim(),
    category: payload.category?.trim(),
    specification: payload.specification?.trim() || '',
    unit: payload.unit?.trim() || 'pcs',
    price: parseFloat(payload.price) || 0,
    targetProfit: parseFloat(payload.targetProfit) || 0,
    ...existing
  };
  return component;
};

// Create component
const createComponent = async (data, userId) => {
  if (!data.name || !data.category || !data.price) {
    throw new HttpError('Name, category, and price are required', 400);
  }
  if (data.price <= 0) {
    throw new HttpError('Price must be greater than 0', 400);
  }
  if (data.targetProfit && (data.targetProfit < 0 || data.targetProfit > 100)) {
    throw new HttpError('Target profit must be between 0-100', 400);
  }

  const component = buildComponent(data, userId, {
    createdAt: new Date().toISOString(),
    createdBy: userId || 'system'
  });

  const docRef = await collections.components.add(component);
  return { id: docRef.id, ...component };
};

// Get all components
const getAllComponents = async () => {
  const snapshot = await collections.components.orderBy('createdAt', 'desc').get();
  const components = [];
  snapshot.forEach((doc) => components.push({ id: doc.id, ...doc.data() }));
  return components;
};

// Get component by ID
const getComponentById = async (id) => {
  const doc = await collections.components.doc(id).get();
  if (!doc.exists) throw new HttpError('Component tidak ditemukan', 404);
  return { id: doc.id, ...doc.data() };
};

// Get components by product
const getComponentsByProduct = async (productId) => {
  const doc = await collections.products.doc(productId).get();
  if (!doc.exists) throw new HttpError('Product tidak ditemukan', 404);
  return doc.data().componentsDetail || [];
};

// Update component
const updateComponent = async (id, data, userId) => {
  if (!data || Object.keys(data).length === 0) {
    throw new HttpError('No fields to update', 400);
  }

  const existing = await collections.components.doc(id).get();
  if (!existing.exists) throw new HttpError('Component tidak ditemukan', 404);

  if (data.price !== undefined && data.price <= 0) {
    throw new HttpError('Price must be greater than 0', 400);
  }
  if (data.targetProfit !== undefined && (data.targetProfit < 0 || data.targetProfit > 100)) {
    throw new HttpError('Target profit must be between 0-100', 400);
  }

  const updated = buildComponent(data, userId, {
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'system'
  });

  await collections.components.doc(id).update(updated);
  return { id, ...existing.data(), ...updated };
};

// Delete component
const deleteComponent = async (id) => {
  const existing = await collections.components.doc(id).get();
  if (!existing.exists) throw new HttpError('Component tidak ditemukan', 404);

  await collections.components.doc(id).delete();
  return true;
};

module.exports = {
  HttpError,
  createComponent,
  getAllComponents,
  getComponentById,
  getComponentsByProduct,
  updateComponent,
  deleteComponent
};