const vendorService = require('../services/vendorService');
const { HttpError } = require('../services/vendorService');

// Create vendor
exports.createVendor = async (req, res) => {
  try {
    const vendor = await vendorService.createVendor(req.body, req.user?.uid);
    res.locals.resourceId = vendor.id;
    res.status(201).json({ success: true, data: vendor });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get all vendors
exports.getAllVendors = async (req, res) => {
  try {
    const vendors = await vendorService.getAllVendors();
    res.json({ success: true, data: vendors });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get vendor by ID
exports.getVendorById = async (req, res) => {
  try {
    const vendor = await vendorService.getVendorById(req.params.id);
    res.json({ success: true, data: vendor });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Update vendor
exports.updateVendor = async (req, res) => {
  try {
    const vendor = await vendorService.updateVendor(req.params.id, req.body, req.user?.uid);
    res.locals.resourceId = vendor.id;
    res.json({ success: true, data: vendor });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Delete vendor
exports.deleteVendor = async (req, res) => {
  try {
    await vendorService.deleteVendor(req.params.id);
    res.locals.resourceId = req.params.id;
    res.json({ success: true, message: 'Vendor berhasil dihapus' });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};
