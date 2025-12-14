const productService = require('../services/productService');

// Create product
exports.createProduct = async (req, res) => {
  try {
    const product = await productService.createProduct(req.body, req.user?.uid);
    res.locals.resourceId = product.id;
    res.status(201).json({ success: true, data: product });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get all products
exports.getAllProducts = async (req, res) => {
  try {
    const products = await productService.getAllProducts();
    res.json({ success: true, data: products });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get product by ID
exports.getProductById = async (req, res) => {
  try {
    const product = await productService.getProductById(req.params.id);
    res.json({ success: true, data: product });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Update product
exports.updateProduct = async (req, res) => {
  try {
    const product = await productService.updateProduct(req.params.id, req.body, req.user?.uid);
    res.locals.resourceId = product.id;
    res.json({ success: true, data: product });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Delete product
exports.deleteProduct = async (req, res) => {
  try {
    await productService.deleteProduct(req.params.id);
    res.locals.resourceId = req.params.id;
    res.json({ success: true, message: 'Product berhasil dihapus' });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};
