const componentService = require('../services/componentService');

// Create component
exports.createComponent = async (req, res) => {
  try {
    const component = await componentService.createComponent(req.body, req.user?.uid);
    res.locals.resourceId = component.id;
    res.status(201).json({ success: true, data: component });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get all components
exports.getAllComponents = async (req, res) => {
  try {
    const components = await componentService.getAllComponents();
    res.json({ success: true, data: components });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get component by ID
exports.getComponentById = async (req, res) => {
  try {
    const component = await componentService.getComponentById(req.params.id);
    res.json({ success: true, data: component });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Get components by product
exports.getComponentsByProduct = async (req, res) => {
  try {
    const components = await componentService.getComponentsByProduct(req.params.productId);
    res.json({ success: true, data: components });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Update component
exports.updateComponent = async (req, res) => {
  try {
    const component = await componentService.updateComponent(req.params.id, req.body, req.user?.uid);
    res.locals.resourceId = component.id;
    res.json({ success: true, data: component });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Delete component
exports.deleteComponent = async (req, res) => {
  try {
    await componentService.deleteComponent(req.params.id);
    res.locals.resourceId = req.params.id;
    res.json({ success: true, message: 'Component berhasil dihapus' });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};
