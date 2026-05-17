export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return; }

  const { type, stock_id, stock_name, start_date, end_date } = req.query;

  // Token 從 Vercel 環境變數讀取，不從前端傳入
  const token = process.env.FINMIND_TOKEN;
  if (!token && type !== 'news') {
    res.status(500).json({ error: 'Server Token 未設定，請聯絡管理員' });
    return;
  }

  const BASE = 'https://api.finmindtrade.com/api/v4/data';
  const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

  try {
    // 新聞：Google News RSS
    if (type === 'news') {
      const query = encodeURIComponent((stock_name || stock_id) + ' ' + stock_id + ' 股票');
      const rssUrl = `https://news.google.com/rss/search?q=${query}&hl=zh-TW&gl=TW&ceid=TW:zh-Hant`;
      const rssRes = await fetch(rssUrl);
      const xml = await rssRes.text();

      const items = [];
      const itemRegex = /<item>([\s\S]*?)<\/item>/g;
      let match;
      while ((match = itemRegex.exec(xml)) !== null && items.length < 5) {
        const item = match[1];
        const title = (item.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>/) || item.match(/<title>(.*?)<\/title>/) || [])[1] || '';
        const link = (item.match(/<link>(.*?)<\/link>/) || [])[1] || '';
        const pubDate = (item.match(/<pubDate>(.*?)<\/pubDate>/) || [])[1] || '';
        const source = (item.match(/<source[^>]*>(.*?)<\/source>/) || [])[1] || '';
        if (title && link) items.push({ title: title.replace(/ - .*$/, ''), link, pubDate, source });
      }
      res.status(200).json({ data: items });
      return;
    }

    // FinMind 查詢
    let url = '';
    if (type === 'price') {
      url = `${BASE}?dataset=TaiwanStockPrice&data_id=${stock_id}&start_date=${start_date}&end_date=${end_date}`;
    } else if (type === 'info') {
      url = `${BASE}?dataset=TaiwanStockInfo`;
    } else if (type === 'chip') {
      url = `${BASE}?dataset=TaiwanStockInstitutionalInvestorsBuySell&data_id=${stock_id}&start_date=${start_date}&end_date=${end_date}`;
    } else if (type === 'margin') {
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
