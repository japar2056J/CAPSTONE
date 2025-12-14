const { db } = require('./firebase');

// Firestore collections
const collections = {
  users: db.collection('users'),
  vendors: db.collection('vendors'),
  products: db.collection('products'),
  components: db.collection('components'),
  estimations: db.collection('estimations'),
  riwayat: db.collection('riwayat'),
  kurs: db.collection('kurs'),
  kursHistory: db.collection('kurs_history')
};

module.exports = {
  db,
  collections
};
