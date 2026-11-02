"""My Trading Cuh – news collector.
Runs on GitHub Actions every 2 hours (see .github/workflows/news.yml) and writes news.json,
which the app reads. Topics are organized for the News tab; each item has title, source, link, time.
"""
import json, re, sys, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime

UA = {'User-Agent': 'Mozilla/5.0 (MyTradingCuh news bot)'}

def gnews(q, he=False):
    return 'https://news.google.com/rss/search?q=' + urllib.parse.quote(q) + ('&hl=iw&gl=IL&ceid=IL:iw' if he else '&hl=en-US&gl=US&ceid=US:en')

# Topics shown in the News tab, in this order. "tracks" = which courses see it first under "For you".
TOPICS = [
    {'id': 'markets', 'title': '📈 Stock market today', 'tracks': ['day', 'swing'], 'feeds': [gnews('"stock market" OR "S&P 500" OR nasdaq OR "Dow Jones" when:1d')]},
    {'id': 'israel', 'title': '🇮🇱 Israel: markets & current events', 'tracks': [], 'he': True,
     'feeds': [gnews('בורסה OR מניות OR "תל אביב 35" when:2d', True), 'https://www.globes.co.il/webservice/rss/rssfeeder.asmx/FeederNode?iID=585']},
    {'id': 'earnings', 'title': '🧾 Earnings & big movers', 'tracks': ['day', 'swing'], 'feeds': [gnews('earnings stock shares jump OR fall when:2d')]},
    {'id': 'rates', 'title': '🏦 Interest rates & the economy', 'tracks': ['invest', 'swing'], 'feeds': [gnews('"interest rates" OR "Federal Reserve" OR inflation OR "jobs report" when:3d')]},
    {'id': 'crypto', 'title': '₿ Crypto & Bitcoin', 'tracks': ['crypto'], 'feeds': [gnews('bitcoin OR ethereum OR crypto when:1d')]},
    {'id': 'tech', 'title': '🤖 AI & tech stocks', 'tracks': ['day', 'swing'], 'feeds': [gnews('AI stocks OR nvidia OR semiconductors OR "big tech" when:2d')]},
    {'id': 'investing', 'title': '🌱 Investing & personal finance', 'tracks': ['invest'], 'feeds': [gnews('"index funds" OR ETF OR "long-term investing" OR "retirement savings" when:4d')]},
]

def fetch(url):
    for attempt in range(3):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                return r.read()
        except Exception as e:
            print('  retry', attempt, url[:80], e, file=sys.stderr)
            time.sleep(3 * (attempt + 1))
    return b''

def parse(xml_bytes, is_google):
    out = []
    try:
        root = ET.fromstring(xml_bytes)
    except Exception:
        return out
    for it in root.iter('item'):
        title = (it.findtext('title') or '').strip()
        link = (it.findtext('link') or '').strip()
        src_el = it.find('source')
        source = (src_el.text or '').strip() if src_el is not None and src_el.text else ''
        if is_google:
            m = re.match(r'^(.*\S)\s+[-–]\s+([^-–]{2,70})$', title)
            if m:
                title, source = m.group(1), source or m.group(2)
        if not source:
            source = 'Globes' if 'globes' in link else 'News'
        try:
            ts = int(parsedate_to_datetime(it.findtext('pubDate')).timestamp() * 1000)
        except Exception:
            ts = None
        if title and link:
            out.append({'title': title, 'source': source, 'url': link, 'date': ts})
    return out

def main():
    data = {'updated': int(time.time() * 1000), 'topics': []}
    seen = set()
    for t in TOPICS:
        items = []
        for f in t['feeds']:
            items += parse(fetch(f), 'news.google' in f)
            time.sleep(1.5)
        items.sort(key=lambda x: x['date'] or 0, reverse=True)
        picked = []
        for x in items:
            key = re.sub(r'\W+', '', x['title'].lower())[:60]
            if key in seen:
                continue
            seen.add(key)
            picked.append(x)
            if len(picked) >= 8:
                break
        print(f"{t['id']}: {len(picked)} items", file=sys.stderr)
        data['topics'].append({'id': t['id'], 'title': t['title'], 'tracks': t['tracks'], 'he': t.get('he', False), 'items': picked})
    if sum(len(t['items']) for t in data['topics']) < 10:
        print('Too few items, keeping the old news.json', file=sys.stderr)
        sys.exit(0)
    with open('news.json', 'w', encoding='utf-8') as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(',', ':'))

if __name__ == '__main__':
    main()
