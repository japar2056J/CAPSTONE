// backend/services/estimasiService.js
const { db } = require("../config/firebase");
const { collections } = require('../config/db');

async function getProduct(productId) {
  const doc = await collections.products.doc(productId).get();
  return doc.exists ? { id: doc.id, ...doc.data() } : null;
}

async function getProductByName(productName) {
  const snapshot = await collections.products.where('name', '==', productName).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function getComponentsByProduct(productId) {
  const prodDoc = await collections.products.doc(productId).get();
  if (!prodDoc.exists) return [];
  // product may store components inside componentsDetail
  return prodDoc.data().componentsDetail || [];
}

async function getKurs() {
  const kursDoc = await db.collection("kurs").doc("jisdor").get();
  return kursDoc.exists ? kursDoc.data().value : 15000;
}

function calculateTotalHarga(components, kurs) {
  let totalUSD = 0;

  components.forEach(c => {
    const price = c.price || c.priceUSD || 0;
    const qty = c.unit || c.qty || 1;
    const subtotal = price * qty;
    totalUSD += subtotal;
  });

  const totalRupiah = Math.round(totalUSD * kurs);

  return { totalUSD, totalRupiah };
}

async function createEstimation({ productId, productName }) {
  const product = productId ? await getProduct(productId) : await getProductByName(productName);
  if (!product) return null;

  const components = await getComponentsByProduct(product.id);

  const kurs = await getKurs();

  const { totalUSD, totalRupiah } = calculateTotalHarga(components, kurs);

  return {
    product,
    components,
    kurs,
    totalUSD,
    totalHargaRupiah: totalRupiah,
    tanggal: new Date().toISOString(),
  };
}

module.exports = {
  createEstimation,
  getProduct,
  getComponentsByProduct,
  getKurs,
  calculateTotalHarga,
};
