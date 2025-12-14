const kursService = require('../services/kursService');

// Get kurs Jisdor (with API fetch, cache, and DB fallback)
exports.getKurs = async (req, res) => {
  try {
    const forceRefresh = req.query.refresh === 'true';
    const kursData = await kursService.getKurs(forceRefresh);

    res.json({
      success: true,
      data: {
        id: 'jisdor',
        value: kursData.value,
        source: kursData.source,
        fetchedAt: kursData.fetchedAt || kursData.cachedAt || kursData.updatedAt
      }
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
};

// Get kurs for a specific date (YYYY-MM-DD) – historical
exports.getKursByDate = async (req, res) => {
  try {
    const date = req.params.date;
    if (!date) return res.status(400).json({ success: false, error: 'Tanggal diperlukan dalam format YYYY-MM-DD' });
    const kursData = await kursService.getKursByDate(date);

    res.json({ success: true, data: { value: kursData.value, source: kursData.source, date: kursData.date || date } });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({ success: false, error: error.message });
  }
};

// Update kurs Jisdor manually
exports.updateKurs = async (req, res) => {
  try {
    const kursData = await kursService.updateKurs(req.body.value, req.user?.uid);
    res.locals.resourceId = 'jisdor';

    res.json({
      success: true,
      data: {
        id: 'jisdor',
        ...kursData
      }
    });
  } catch (error) {
    const status = error.status || 500;
    res.status(status).json({
      success: false,
      error: error.message
    });
  }
};
