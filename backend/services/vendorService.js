const { collections } = require('../config/db');
const { isValidEmail, isValidPhoneNumber } = require('../utils/helper');

class HttpError extends Error {
	constructor(message, status = 500) {
		super(message);
		this.status = status;
	}
}

const buildVendor = (payload, userId, existing = {}) => {
	const vendor = {
		name: payload.name?.trim(),
		contact: payload.contact?.trim(),
		email: payload.email?.trim().toLowerCase(),
		address: payload.address?.trim(),
		...existing
	};

	return vendor;
};

// Create vendor
const createVendor = async (data, userId) => {
	if (!data.name || !data.contact || !data.email || !data.address) {
		throw new HttpError('All fields required', 400);
	}
	if (!isValidEmail(data.email)) {
		throw new HttpError('Invalid email format', 400);
	}
	if (!isValidPhoneNumber(data.contact)) {
		throw new HttpError('Invalid contact number', 400);
	}

	const vendor = buildVendor(data, userId, {
		createdAt: new Date().toISOString(),
		createdBy: userId || 'system'
	});

	const docRef = await collections.vendors.add(vendor);
	return { id: docRef.id, ...vendor };
};

// Get all vendors
const getAllVendors = async () => {
	const snapshot = await collections.vendors.orderBy('createdAt', 'desc').get();
	const vendors = [];
	snapshot.forEach((doc) => vendors.push({ id: doc.id, ...doc.data() }));
	return vendors;
};

// Get vendor by ID
const getVendorById = async (id) => {
	const doc = await collections.vendors.doc(id).get();
	if (!doc.exists) throw new HttpError('Vendor not found', 404);
	return { id: doc.id, ...doc.data() };
};

// Update vendor
const updateVendor = async (id, data, userId) => {
	if (!data || Object.keys(data).length === 0) {
		throw new HttpError('No fields to update', 400);
	}

	const existing = await collections.vendors.doc(id).get();
	if (!existing.exists) throw new HttpError('Vendor not found', 404);

	if (data.email && !isValidEmail(data.email)) {
		throw new HttpError('Invalid email format', 400);
	}
	if (data.contact && !isValidPhoneNumber(data.contact)) {
		throw new HttpError('Invalid contact number', 400);
	}

	const updated = buildVendor(data, userId, {
		updatedAt: new Date().toISOString(),
		updatedBy: userId || 'system'
	});

	await collections.vendors.doc(id).update(updated);
	return { id, ...existing.data(), ...updated };
};

// Delete vendor
const deleteVendor = async (id) => {
	// Ensure vendor not used in products
	const products = await collections.products.where('vendorId', '==', id).get();
	if (!products.empty) {
		throw new HttpError('Vendor masih digunakan dalam produk', 400);
	}

	await collections.vendors.doc(id).delete();
	return true;
};

module.exports = {
	HttpError,
	createVendor,
	getAllVendors,
	getVendorById,
	updateVendor,
	deleteVendor
};
