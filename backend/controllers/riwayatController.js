// backend/controllers/riwayatController.js

const riwayatService = require("../services/riwayatService");

// GET all
exports.getAllRiwayat = async (req, res) => {
  try {
    const data = await riwayatService.getAllRiwayat();
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET by ID
exports.getRiwayatById = async (req, res) => {
  try {
    const data = await riwayatService.getRiwayatById(req.params.id);

    if (!data)
      return res.status(404).json({ success: false, error: "Riwayat tidak ditemukan" });

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GET by YEAR
exports.getRiwayatByYear = async (req, res) => {
  try {
    const data = await riwayatService.getRiwayatByYear(req.params.year);

    res.json({ success: true, year: req.params.year, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// DELETE
exports.deleteRiwayat = async (req, res) => {
  try {
    const deleted = await riwayatService.deleteRiwayat(req.params.id);

    if (!deleted)
      return res.status(404).json({ success: false, error: "Riwayat tidak ditemukan" });

    res.json({ success: true, message: "Riwayat berhasil dihapus" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// GENERATE PDF
exports.generatePdf = async (req, res) => {
  try {
    const PDFDocument = require("pdfkit");
    const data = await riwayatService.getRiwayatById(req.params.id);

    if (!data) {
      return res.status(404).json({
        success: false,
        error: "Riwayat tidak ditemukan"
      });
    }

    const doc = new PDFDocument({ size: "A4", margin: 40 });

    // Header PDF
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=riwayat_${req.params.id}.pdf`
    );

    doc.pipe(res);

    // ===== HEADER / JUDUL =====
    doc.fontSize(18).text("LAPORAN RIWAYAT PENGADAAN", { align: "center" });
    doc.moveDown(2);

    // ===== INFORMASI UTAMA =====
    doc.fontSize(12);
    doc.text(`Nama Produk: ${data.productName || "-"}`);
    doc.text(`User: ${data.user || "-"}`);
    doc.text(`Tanggal: ${data.date ? new Date(data.date).toLocaleDateString('id-ID') : "-"}`);
    doc.text(`Kurs JISDOR: ${data.kurs ? "Rp " + data.kurs.toLocaleString('id-ID') : "-"}`);
    doc.text(`Estimasi Harga: Rp ${data.estimatedPrice ? data.estimatedPrice.toLocaleString('id-ID') : "-"}`);
    doc.text(`Deskripsi: ${data.description || "-"}`);

    doc.moveDown(2);

    // ===== RINGKASAN =====
    doc.fontSize(14).text("Ringkasan Estimasi", { underline: true });
    doc.moveDown();

    if (data.estimatedPrice && data.kurs) {
      const estimatedUSD = Math.round(data.estimatedPrice / data.kurs);
      doc.fontSize(12);
      doc.text(`Estimasi USD: $ ${estimatedUSD.toLocaleString('en-US')}`);
      doc.text(`Estimasi Rupiah: Rp ${data.estimatedPrice.toLocaleString('id-ID')}`);
    }

    // ===== FOOTER =====
    const footer = () => {
      doc.fontSize(10).text(
        "Dicetak otomatis oleh Sistem Pengadaan",
        40,
        800,
        { align: "center" }
      );
      doc.text(`Halaman 1`, 0, 815, { align: "center" });
    };

    footer();

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({
      success: false,
      error: "Gagal membuat PDF"
    });
  }
};
