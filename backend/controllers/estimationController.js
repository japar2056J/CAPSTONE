// backend/controllers/estimationController.js
const { collections } = require("../config/db");
const estimasiService = require("../services/estimasiService");
const riwayatService = require("../services/riwayatService");
const kursService = require("../services/kursService");

// FE expects: productName, estimatedPrice (IDR), estimatedPriceUSD, kursSekarang,
// riwayatPengadaan[{tahun, hargaAsli, kursAsli, hargaNormalisasi}], jumlahRiwayat, tanggal.
exports.calculateEstimation = async (req, res) => {
  try {
    console.log('calculateEstimation called by user:', req.user);
    const { productName } = req.body;

    if (!productName) {
      return res.status(400).json({ success: false, error: "productName wajib diisi" });
    }

    // Ambil kurs terbaru dari service (punya cache dan fallback)
    const kursNow = await kursService.getKurs();
    const kursSekarang = kursNow.value;

    // Ambil semua produk dengan nama yang sama (riwayat pengadaan)
    const snapshot = await collections.products.where("name", "==", productName).get();
    if (snapshot.empty) {
      return res.status(404).json({ success: false, error: "Produk tidak ditemukan" });
    }

    // Collect unique exact dates from snapshot to fetch historical kurs (avoid duplicated calls)
    const datesSet = new Set();
    const docsList = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      const hargaAsli = data.totalPrice || 0;
      const rawDate = data.releaseDate;
      // Normalize dateISO (YYYY-MM-DD) and full ISO string for later serialization
      let dateISO = null;
      let fullISO = null;
      try {
        if (rawDate && typeof rawDate === 'object' && typeof rawDate.toDate === 'function') {
          // Firestore Timestamp
          const dt = rawDate.toDate();
          dateISO = dt.toISOString().slice(0, 10);
          fullISO = dt.toISOString();
        } else if (rawDate) {
          const dt = new Date(rawDate);
          if (!isNaN(dt.getTime())) {
            dateISO = dt.toISOString().slice(0, 10);
            fullISO = dt.toISOString();
          }
        }
      } catch (e) {
        dateISO = null;
        fullISO = null;
      }

      docsList.push({ id: doc.id, data, hargaAsli, dateISO, fullISO });
      if (dateISO) datesSet.add(dateISO);
    });

    // Build map with kurs for each unique exact date by calling kursService.getKursByDate
    const dates = Array.from(datesSet);
    const kursDateMap = {};
    if (dates.length > 0) {
      const datePromises = dates.map(async (d) => {
        const kursData = await kursService.getKursByDate(d);
        return { d, kursValue: kursData?.value };
      });

      const fetched = await Promise.all(datePromises);
      fetched.forEach((r) => {
        kursDateMap[r.d] = r.kursValue;
      });
    }

    const riwayatPengadaan = [];
    docsList.forEach(({ data, hargaAsli, dateISO }) => {
      const year = dateISO ? new Date(dateISO).getFullYear() : null;
      const kursAsli = dateISO && kursDateMap[dateISO] ? kursDateMap[dateISO] : kursSekarang;
      const hargaNormalisasi = Math.round(hargaAsli * (kursSekarang / (kursAsli || kursSekarang)));

      riwayatPengadaan.push({
        tahun: year,
        hargaAsli,
        kursAsli,
        hargaNormalisasi,
      });
    });

    // Choose product components detail from the most recent product record (by releaseDate)
    let componentsDetail = [];
    try {
      const withDates = docsList
        .map(d => ({...d, dateVal: d.data && d.data.releaseDate ? new Date(d.data.releaseDate).getTime() : 0}));
      withDates.sort((a, b) => b.dateVal - a.dateVal);
      if (withDates.length > 0 && withDates[0].data && Array.isArray(withDates[0].data.componentsDetail)) {
        componentsDetail = withDates[0].data.componentsDetail;
      }
    } catch (e) {
      // ignore and leave componentsDetail empty
      console.warn('Failed to compute componentsDetail for estimation:', e.message);
    }

    // Build relatedProducts list (include vendor name and components for each procurement record)
    let relatedProducts = [];
    try {
      const vendorIds = Array.from(new Set(docsList.map(d => d.data.vendorId).filter(Boolean)));
      const vendorMap = {};
      if (vendorIds.length > 0) {
        const vendorPromises = vendorIds.map(async (vid) => {
          try {
            const vdoc = await collections.vendors.doc(vid).get();
            if (vdoc && vdoc.exists) {
              vendorMap[vid] = vdoc.data().name || '';
            } else {
              vendorMap[vid] = '';
            }
          } catch (e) {
            vendorMap[vid] = '';
          }
        });
        await Promise.all(vendorPromises);
      }

      relatedProducts = docsList.map(d => ({
        id: d.id,
        // Use normalized ISO string (fullISO) if available, otherwise attempt best-effort conversion
        releaseDate: d.fullISO || (d.data.releaseDate && typeof d.data.releaseDate.toDate === 'function' ? d.data.releaseDate.toDate().toISOString() : (d.data.releaseDate ? new Date(d.data.releaseDate).toISOString() : null)),
        totalPrice: d.data.totalPrice || d.hargaAsli || 0,
        vendorId: d.data.vendorId || null,
        vendorName: d.data.vendorId ? (vendorMap[d.data.vendorId] || '') : '',
        componentsDetail: Array.isArray(d.data.componentsDetail) ? d.data.componentsDetail : []
      }));
      // Debug log: show per-related-product components count and releaseDate
      try {
        console.log('calculateEstimation: relatedProducts debug ->', relatedProducts.map(p => ({ id: p.id, releaseDate: p.releaseDate, components: (p.componentsDetail || []).length })));
      } catch (e) {
        // ignore
      }
    } catch (e) {
      console.warn('Failed to build relatedProducts for estimation:', e.message);
    }

    const totalNormalisasi = riwayatPengadaan.reduce((sum, r) => sum + r.hargaNormalisasi, 0);
    const estimatedPrice = riwayatPengadaan.length > 0 ? Math.round(totalNormalisasi / riwayatPengadaan.length) : 0;
    const estimatedPriceUSD = Number((estimatedPrice / kursSekarang).toFixed(2));

    return res.json({
      success: true,
      data: {
        productName,
        estimatedPrice,
        estimatedPriceUSD,
        kursSekarang,
        riwayatPengadaan,
        componentsDetail,
        relatedProducts,
        jumlahRiwayat: riwayatPengadaan.length,
        tanggal: new Date().toISOString(),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

exports.saveEstimation = async (req, res) => {
  try {
    console.log('saveEstimation called by user:', req.user);
    const { productName, estimatedPrice, kurs } = req.body;

    if (!productName || !estimatedPrice || !kurs) {
      return res.status(400).json({
        success: false,
        error: "productName, estimatedPrice, dan kurs wajib diisi",
      });
    }

    const payloadRiwayat = {
      productName,
      estimatedPrice,
      kurs,
      date: new Date().toISOString(),
      user: req.user?.email || 'unknown'
    };

    const saved = await riwayatService.createRiwayat(payloadRiwayat);

    res.json({
      success: true,
      message: "Estimasi berhasil disimpan ke riwayat",
      data: saved,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};
