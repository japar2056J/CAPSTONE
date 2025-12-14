const express = require('express');
const router = express.Router();
const { db } = require('../config/db');
const kursService = require('../services/kursService');
const productService = require('../services/productService');

// Get dashboard statistics
router.get('/', async (req, res) => {
  try {
    // Parallel queries for better performance
    const [
      productsSnapshot,
      componentsSnapshot,
      riwayatSnapshot,
      kursDoc
    ] = await Promise.all([
      db.collection('products').get(),
      db.collection('components').get(),
      db.collection('riwayat').get(),
      db.collection('kurs').doc('jisdor').get()
    ]);

    // Calculate statistics
    const products = [];
    let totalProductValue = 0;

    productsSnapshot.forEach(doc => {
      const product = { id: doc.id, ...doc.data() };
      products.push(product);
      totalProductValue += product.totalPrice || 0;
    });

    const componentsCount = componentsSnapshot.size;
    const riwayatCount = riwayatSnapshot.size;
    let kurs;
    if (kursDoc.exists) {
      kurs = kursDoc.data().value;
    } else {
      try {
        const kursData = await kursService.getKurs();
        kurs = kursData.value;
      } catch (err) {
        kurs = 15750; // final fallback if kurs service fails
      }
    }

    // Get recent products (5 latest)
    const recentProducts = products
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        statistics: {
          totalProducts: products.length,
          totalComponents: componentsCount,
          totalEstimations: riwayatCount,
          totalValue: totalProductValue,
          averageProductValue: products.length > 0 ? totalProductValue / products.length : 0,
          kurs
        },
        recentProducts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;
