// Product Model Structure
const productModel = {
  name: String,
  description: String,
  vendorId: String, // Reference to Vendor
  releaseDate: String, // ISO Date
  componentsDetail: Array, // Array of component objects
  totalPrice: Number,
  createdAt: String, // ISO Date
  createdBy: String, // User ID
  updatedAt: String, // ISO Date
  updatedBy: String  // User ID
};

// Component Structure inside Product
const componentDetail = {
  id: String, // Format: {productId}.{componentIndex}
  category: String, // CPU, GPU, RAM, etc
  name: String,
  specification: String,
  unit: Number, // Quantity
  price: Number, // Unit price
  total: Number // unit * price
};

module.exports = {
  productModel,
  componentDetail
};
