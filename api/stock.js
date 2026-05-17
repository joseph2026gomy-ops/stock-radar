export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, stock_id, start_date, end_date, token } = req.query;
  if (!token) { res.status(400).json({ error: '缺少 token' }); return; }

  const BASE = 'https://api.finmindtrade.com/api/v4/data';
  const headers = { 'Authorization': `Bearer ${token}` };

  try {
    let url = '';

    if (type === 'price') {
      // 股價
      url = `${BASE}?dataset=TaiwanStockPrice&data_id=${stock_id}&start_date=${start_date}&end_date=${end_date}`;
    } else if (type === 'info') {
      // 股票名稱、產業別
      url = `${BASE}?dataset=TaiwanStockInfo`;
    } else if (type === 'chip') {
      // 三大法人買賣超
      url = `${BASE}?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${stock_id}&start_date=${start_date}&end_date=${end_date}`;
    } else if (type === 'margin') {
      // 融資融券
      url = `${BASE}?dataset=TaiwanStockMarginPurchaseShortSale&data_id=${stock_id}&start_date=${start_date}&end_date=${end_date}`;
    } else {
      res.status(400).json({ error: '不支援的查詢類型' }); return;
    }

    const response = await fetch(url, { headers });
    if (!response.ok) {
      const txt = await response.text();
      res.status(response.status).json({ error: txt }); return;
    }
    const data = await response.json();
    res.status(200).json(data);

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
