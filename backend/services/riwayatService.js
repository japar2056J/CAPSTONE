// backend/services/riwayat.service.js

const { db, admin } = require("../config/firebase");

const COLLECTION = "riwayat";

module.exports = {
  // CREATE – dipanggil setelah estimasi selesai dihitung
  async createRiwayat(payload) {
    const docRef = db.collection(COLLECTION).doc();

    const data = {
      ...payload,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await docRef.set(data);

    const saved = await docRef.get();
    return { id: docRef.id, ...saved.data() };
  },

  // GET ALL
  async getAllRiwayat() {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("createdAt", "desc")
      .get();

    const data = [];
    snapshot.forEach((doc) => {
      data.push({ id: doc.id, ...doc.data() });
    });

    return data;
  },

  // GET BY ID
  async getRiwayatById(id) {
    const doc = await db.collection(COLLECTION).doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  },

  // GET BY YEAR
  async getRiwayatByYear(year) {
    const snapshot = await db
      .collection(COLLECTION)
      .orderBy("tanggal", "desc")
      .get();

    const result = [];

    snapshot.forEach((doc) => {
      const tgl = doc.data().tanggal;
      if (!tgl) return;

      const thn = new Date(tgl).getFullYear();

      if (thn == year) {
        result.push({ id: doc.id, ...doc.data() });
      }
    });

    return result;
  },

  // DELETE
  async deleteRiwayat(id) {
    const docRef = db.collection(COLLECTION).doc(id);
    const exists = (await docRef.get()).exists;
    if (!exists) return false;

    await docRef.delete();
    return true;
  },
};
