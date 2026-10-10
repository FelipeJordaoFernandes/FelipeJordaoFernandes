const fs = require('node:fs/promises');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '..');
const escape = (text) => text.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[char]));

async function main() {
  const readme = await fs.readFile(path.join(root, 'README.md'), 'utf8');
  const body = readme.split('<details>')[0] + `<details><summary>Sobre mim, projetos e contato em texto</summary><pre>${escape(readme.split('<details>')[1].replace(/<summary>.*<\/summary>/, '').replace('</details>', '').trim())}</pre></details>`;
  const styles = `*{box-sizing:border-box}body{margin:0;font:16px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:var(--bg);color:var(--fg)}main{width:min(910px,100%);margin:auto;padding:32px}img{max-width:100%;vertical-align:middle}p{margin:0 0 16px}a{color:inherit}a:focus-visible{outline:3px solid #76b98d;outline-offset:4px}pre{white-space:pre-wrap;font:inherit}details{padding:12px 0}summary{cursor:pointer}@media(max-width:1011px){main{width:min(480px,100%);padding:24px 41px}}`;
  const server = http.createServer(async (req, res) => {
    try {
      if (req.url === '/') {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.end(`<!doctype html><html lang="pt-BR"><head><meta name="viewport" content="width=device-width,initial-scale=1"><style>${styles}</style></head><body style="--bg:#0d1117;--fg:#edf3ed"><main>${body}</main></body></html>`);
        return;
      }
      const file = path.resolve(root, '.' + decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(path.join(root, 'assets') + path.sep)) { res.writeHead(403).end(); return; }
      res.setHeader('Content-Type', file.endsWith('.webp') ? 'image/webp' : 'image/svg+xml');
      res.end(await fs.readFile(file));
    } catch { res.writeHead(404).end(); }
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, ...(process.env.PROFILE_BROWSER_PATH ? { executablePath: process.env.PROFILE_BROWSER_PATH } : {}) });
  const report = [];
  try {
    for (const width of [1280, 768, 390, 320]) {
      const page = await browser.newPage({ viewport: { width, height: 1100 } });
      await page.goto(`http://127.0.0.1:${server.address().port}`);
      await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
      const metrics = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        images: [...document.images].map((image) => ({ alt: image.alt, currentSrc: image.currentSrc, naturalWidth: image.naturalWidth, width: Math.round(image.getBoundingClientRect().width) })),
        links: [...document.querySelectorAll('a')].map((link) => ({ href: link.href, name: link.querySelector('img')?.alt }))
      }));
      if (metrics.overflow) throw new Error(`Overflow at ${width}px`);
      if (metrics.images.some((image) => !image.alt)) throw new Error('Missing accessible image name');
      const firstPanel = metrics.images[0];
      if (!firstPanel.currentSrc.includes(width <= 1011 ? '/mobile/' : '/desktop/')) throw new Error('Wrong responsive asset');
      await page.screenshot({ path: path.join(root, `work/preview-${width}.png`), fullPage: true });
      if (width === 1280 || width === 390) {
        await page.screenshot({ path: path.join(root, `work/preview-top-${width}.png`) });
        await page.evaluate(() => { document.body.style.setProperty('--bg', '#ffffff'); document.body.style.setProperty('--fg', '#202824'); });
        await page.screenshot({ path: path.join(root, `work/preview-light-${width}.png`) });
      }
      report.push({ width, ...metrics });
      await page.close();
    }
    await fs.writeFile(path.join(root, 'work/preview-validation.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report.map(({ width, overflow, images, links }) => ({ width, overflow, imageCount: images.length, linkCount: links.length, selectedAsset: images[0].currentSrc }))));
  } finally {
    await browser.close();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
