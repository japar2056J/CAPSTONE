// Component Model Structure
const componentModel = {
  name: String,
  category: String, // CPU, GPU, RAM, Storage, Display, etc
  specification: String,
  unit: String, // pcs, gb, etc
  price: Number,
  targetProfit: Number, // Percentage
  createdAt: String, // ISO Date
  createdBy: String  // User ID
};

module.exports = componentModel;
