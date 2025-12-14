const axios = require('axios');
const xml2js = require('xml2js');
const { collections } = require('../config/db');

// In-memory cache for kurs value
let kursCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 6 * 60 * 60 * 1000; // 6 hours in milliseconds
// In-memory cache for historical kurs by date
const kursHistoryCache = new Map();

class HttpError extends Error {
  constructor(message, status = 500) {
    super(message);
    this.status = status;
  }
}

// Primary: BI SOAP official JISDOR
const fetchKursFromBISoap = async () => {
  try {
    const soapBody = `<?xml version="1.0" encoding="utf-8"?>
    <soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tns="http://www.bi.go.id/">
      <soap:Body>
        <tns:getSubKursJisdor2/>
      </soap:Body>
    </soap:Envelope>`;

    const response = await axios.post(
      'https://www.bi.go.id/biwebservice/wskursbi.asmx',
      soapBody,
      {
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          'SOAPAction': 'http://www.bi.go.id/getSubKursJisdor2'
        },
        timeout: 10000
      }
    );

    const parser = new xml2js.Parser({ explicitArray: false, ignoreAttrs: true });
    const parsed = await parser.parseStringPromise(response.data);

    const body = parsed['soap:Envelope']?.['soap:Body'];
    const resNode = body?.getSubKursJisdor2Response?.getSubKursJisdor2Result;
    const rate = resNode?.Rate;

    const kursValue = rate ? parseFloat(rate.replace(',', '.')) : null;

    if (Number.isFinite(kursValue) && kursValue > 0) {
      console.log(`✓ Kurs BI SOAP: ${kursValue}`);
      return kursValue;
    }

    throw new Error('Invalid kurs value from BI SOAP');
  } catch (error) {
    console.error('✗ BI SOAP error:', error.message);
    return null;
  }
};

// Secondary: scrape halaman publik BI
const fetchKursFromBIHtml = async () => {
  try {
    const url = 'https://www.bi.go.id/id/statistik/informasi-kurs/jisdor';
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; kurs-fetcher/1.0)',
        'Accept-Language': 'id,en;q=0.8'
      },
      timeout: 10000
    });

    // Cari angka pertama yang menyerupai kurs (format Indonesia, contoh: 16.652,00)
    const html = response.data || '';
    const match = html.match(/USD[^0-9]*([0-9.]+,[0-9]{2})/i);

    if (!match || !match[1]) {
      throw new Error('Tidak menemukan nilai kurs pada halaman BI');
    }

    const raw = match[1];
    const normalized = raw.replace(/\./g, '').replace(',', '.');
    const kursValue = parseFloat(normalized);

    if (Number.isFinite(kursValue) && kursValue > 0) {
      console.log(`✓ Kurs dari BI (HTML): ${kursValue}`);
      return kursValue;
    }

    throw new Error('Nilai kurs tidak valid');
  } catch (error) {
    console.error('✗ Error fetching from BI JISDOR page:', error.message);
    return null;
  }
};

// Tertiary: exchangerate.host (ECB rates, bukan JISDOR)
// Tertiary: Frankfurter API (free, no API key required)
const fetchKursFromFrankfurter = async () => {
  try {
    const url = 'https://api.frankfurter.app/latest?from=USD&to=IDR';
    const { data } = await axios.get(url, { timeout: 8000 });
    const rate = data?.rates?.IDR;
    if (Number.isFinite(rate) && rate > 0) {
      console.log(`✓ Kurs Frankfurter: ${rate}`);
      return rate;
    }
    throw new Error('Invalid rate from Frankfurter');
  } catch (error) {
    console.error('✗ Error fetching from Frankfurter:', error.message);
    return null;
  }
};

// Quaternary: Exchangerate-api (free tier available)
const fetchKursFromExchangerateApi = async () => {
  try {
    const url = 'https://open.er-api.com/v6/latest/USD';
    const { data } = await axios.get(url, { timeout: 8000 });
    const rate = data?.rates?.IDR;
    if (Number.isFinite(rate) && rate > 0) {
      console.log(`✓ Kurs Exchangerate-api: ${rate}`);
      return rate;
    }
    throw new Error('Invalid rate from Exchangerate-api');
  } catch (error) {
    console.error('✗ Error fetching from Exchangerate-api:', error.message);
    return null;
  }
};

// Historical Frankfurter fetch for a specific date (YYYY-MM-DD)
const fetchHistoricalKursFromFrankfurter = async (dateISO) => {
  try {
    const url = `https://api.frankfurter.app/${dateISO}?from=USD&to=IDR`;
    const { data } = await axios.get(url, { timeout: 8000 });
    const rate = data?.rates?.IDR;
    if (Number.isFinite(rate) && rate > 0) {
      console.log(`✓ Historical kurs Frankfurter (${dateISO}): ${rate}`);
      return rate;
    }
    throw new Error('Invalid historical rate from Frankfurter');
  } catch (error) {
    console.error(`✗ Error fetching historical kurs from Frankfurter for ${dateISO}:`, error.message);
    return null;
  }
};

// Get kurs from database
const getKursFromDB = async () => {
  try {
    const doc = await collections.kurs.doc('jisdor').get();
    
    if (doc.exists) {
      return doc.data();
    }

    return null;
  } catch (error) {
    console.error('Database error:', error.message);
    throw error;
  }
};

// Update kurs in database (async, non-blocking)
const updateKursInDB = async (value) => {
  try {
    await collections.kurs.doc('jisdor').set(
      {
        value: parseFloat(value),
        updatedAt: new Date().toISOString(),
        source: 'api_bi'
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating kurs in DB:', error.message);
    // Non-critical: Don't throw, just log
  }
};

// Store historical kurs in DB (non-blocking)
const saveHistoricalKursInDB = async (dateISO, value, source) => {
  try {
    await collections.kursHistory.doc(dateISO).set(
      {
        value: parseFloat(value),
        date: dateISO,
        source: source || 'exchangerate_host',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error('Error updating historical kurs in DB:', error.message);
  }
};

// Get kurs with cache and fallback strategy
// 4 Layer Fallback: BI SOAP 1.2 → BI Webpage Scraping → Frankfurter → Exchangerate-api → Cache/DB → Default (15750)
const getKurs = async (forceRefresh = false) => {
  const now = Date.now();

  // Return cached value if still valid
  if (!forceRefresh && kursCache && cacheTimestamp && (now - cacheTimestamp) < CACHE_DURATION) {
    return {
      value: kursCache,
      source: 'cache',
      cachedAt: new Date(cacheTimestamp).toISOString()
    };
  }

  // Try primary BI SOAP
  const soapKurs = await fetchKursFromBISoap();
  if (soapKurs) {
    kursCache = soapKurs;
    cacheTimestamp = now;
    updateKursInDB(soapKurs);
    return { value: soapKurs, source: 'api_bi_soap', fetchedAt: new Date().toISOString() };
  }

  // Fallback: BI HTML scrape
  const htmlKurs = await fetchKursFromBIHtml();
  if (htmlKurs) {
    kursCache = htmlKurs;
    cacheTimestamp = now;
    updateKursInDB(htmlKurs);
    return { value: htmlKurs, source: 'api_bi_html', fetchedAt: new Date().toISOString() };
  }

  // Layer 3: Frankfurter API (Tertiary - ECB rates)
  const frankfurterKurs = await fetchKursFromFrankfurter();
  if (frankfurterKurs) {
    kursCache = frankfurterKurs;
    cacheTimestamp = now;
    updateKursInDB(frankfurterKurs);
    return { value: frankfurterKurs, source: 'frankfurter', fetchedAt: new Date().toISOString(), note: 'ECB rate (bukan JISDOR)' };
  }

  // Layer 4: Exchangerate-api (Quaternary - Backup rates)
  const exchangerateKurs = await fetchKursFromExchangerateApi();
  if (exchangerateKurs) {
    kursCache = exchangerateKurs;
    cacheTimestamp = now;
    updateKursInDB(exchangerateKurs);
    return { value: exchangerateKurs, source: 'exchangerate_api', fetchedAt: new Date().toISOString(), note: 'Market rate (bukan JISDOR)' };
  }

  // Fallback to cached value if available
  if (kursCache) {
    return {
      value: kursCache,
      source: 'cache_fallback',
      cachedAt: new Date(cacheTimestamp).toISOString()
    };
  }

  // Final fallback: Get from Firestore database
  try {
    const dbKurs = await getKursFromDB();
    if (dbKurs) {
      kursCache = dbKurs.value;
      cacheTimestamp = now;

      return {
        value: dbKurs.value,
        source: 'database',
        updatedAt: dbKurs.updatedAt
      };
    }
  } catch (error) {
    console.error('Error fetching from database:', error.message);
  }

  // Jika semua sumber gagal, throw error
  throw new HttpError('Gagal mengambil data kurs dari semua sumber (BI SOAP, BI Webpage, Frankfurter, Exchangerate-api, cache, dan database)', 503);
};

// Get kurs for a specific date (YYYY-MM-DD) with caching and DB fallback
const getKursByDate = async (dateParam) => {
  try {
    if (!dateParam) throw new Error('dateParam is required');

    const dateObj = new Date(dateParam);
    if (isNaN(dateObj)) throw new Error('Invalid dateParam');

    const dateISO = dateObj.toISOString().slice(0, 10); // YYYY-MM-DD

    // Return memory cache if present
    if (kursHistoryCache.has(dateISO)) {
      return { value: kursHistoryCache.get(dateISO), source: 'cache' };
    }

    // Check DB history
    const doc = await collections.kursHistory.doc(dateISO).get();
    if (doc.exists) {
      const val = doc.data().value;
      kursHistoryCache.set(dateISO, val);
      return { value: val, source: 'database', date: dateISO };
    }

    // Try Frankfurter API for historical data
    const rate = await fetchHistoricalKursFromFrankfurter(dateISO);
    if (rate) {
      kursHistoryCache.set(dateISO, rate);
      saveHistoricalKursInDB(dateISO, rate, 'frankfurter');
      return { value: rate, source: 'frankfurter_historical', date: dateISO };
    }

    // Fallback: use current kurs
    const current = await getKurs();
    return { value: current.value, source: 'fallback_current', date: dateISO };
  } catch (error) {
    console.error('getKursByDate error:', error.message);
    const current = await getKurs();
    return { value: current.value, source: 'fallback_error' };
  }
};

// Manually update kurs
const updateKurs = async (value, userId) => {
  if (!value || isNaN(value)) {
    throw new HttpError('Valid value is required', 400);
  }

  const parsedValue = parseFloat(value);
  if (parsedValue <= 0) {
    throw new HttpError('Kurs value must be greater than 0', 400);
  }

  const kursData = {
    value: parsedValue,
    updatedAt: new Date().toISOString(),
    updatedBy: userId || 'system',
    source: 'manual'
  };

  await collections.kurs.doc('jisdor').set(kursData, { merge: true });

  // Update cache
  kursCache = parsedValue;
  cacheTimestamp = Date.now();

  return {
    id: 'jisdor',
    ...kursData
  };
};

// Clear cache (useful for testing)
const clearCache = () => {
  kursCache = null;
  cacheTimestamp = null;
};

module.exports = {
  HttpError,
  getKurs,
  getKursByDate,
  getKursFromDB,
  updateKurs,
  clearCache
};
