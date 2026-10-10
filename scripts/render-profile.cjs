const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const escape = (text) => text.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const icon = (body) => `<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
const arrow = icon('<path d="M12 24h24M27 15l9 9-9 9"/>').replace('<svg ', '<svg class="arrow" ');
const icons = {
  login: icon('<rect x="9" y="22" width="30" height="20" rx="5"/><path d="M15 22v-8a9 9 0 0 1 18 0v8M24 30v5"/>'),
  pokedex: icon('<circle cx="24" cy="24" r="18"/><path d="M6 24h12m12 0h12"/><circle cx="24" cy="24" r="6"/>'),
  todo: icon('<rect x="9" y="7" width="30" height="35" rx="5"/><path d="m16 18 3 3 6-6m-9 16 3 3 6-6m5-9h3m-3 12h3"/>'),
  eden: icon('<rect x="8" y="14" width="32" height="27" rx="9"/><path d="M24 14V7M5 23v10m38-10v10M18 33h12"/><circle cx="17" cy="25" r="2"/><circle cx="31" cy="25" r="2"/>'),
  menu: icon('<path d="M11 7v14a5 5 0 0 0 10 0V7m-5 0v35M35 7v35m0-35c-7 5-8 15 0 19"/>'),
  portfolio: icon('<rect x="5" y="7" width="38" height="34" rx="5"/><path d="M5 17h38M12 12h1m6 0h1"/>'),
  linkedin: icon('<rect x="6" y="6" width="36" height="36" rx="6"/><path d="M15 22v13m9 0V22m0 6c0-9 10-9 10 0v7"/><circle cx="15" cy="14" r="1"/>'),
  email: icon('<rect x="4" y="9" width="40" height="30" rx="5"/><path d="m6 13 18 14 18-14"/>'),
  code: icon('<path d="m17 12-12 12 12 12m14-24 12 12-12 12M27 7l-6 34"/>'),
  react: icon('<ellipse cx="24" cy="24" rx="21" ry="8"/><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(60 24 24)"/><ellipse cx="24" cy="24" rx="21" ry="8" transform="rotate(120 24 24)"/><circle cx="24" cy="24" r="3" fill="currentColor"/>'),
  javascript: icon('<rect x="5" y="5" width="38" height="38" rx="6"/><path d="M22 19v13c0 5-8 5-8 0m21-11c-5-5-11 1-6 5l5 2c5 5-4 10-8 4"/>'),
  html5: icon('<path d="M7 5h34l-3 33-14 6-14-6zM32 14H17l1 10h13l-1 8-6 3-6-3"/>'),
  css3: icon('<path d="M7 5h34l-3 33-14 6-14-6zM16 14h16l-1 10H20m11 0-1 8-6 3-7-3"/>'),
  vite: icon('<path d="M7 9 24 43 41 9 24 14z"/><path d="m27 4-9 20h8l-5 20 14-26h-9l7-14z" fill="#76b98d" stroke="#76b98d"/>'),
  git: icon('<rect x="8" y="8" width="32" height="32" rx="5" transform="rotate(45 24 24)"/><path d="m16 16 17 17m-9-9v13"/><circle cx="16" cy="16" r="3" fill="#8fc5a0"/><circle cx="33" cy="33" r="3" fill="#8fc5a0"/><circle cx="24" cy="37" r="3" fill="#8fc5a0"/>')
};

function panel(key, content, className = key) {
  return { key, html: `<section class="panel ${className}">${content}</section>` };
}

function makePanels(data) {
  return [
    panel('hero', `<div class="hero-copy"><div class="brand">FJ<i>.</i></div><h1>${escape(data.name)}</h1><p class="role">${escape(data.role)}</p><p class="copy">${escape(data.tagline)}</p></div><img src="illustrations/broto.webp" alt="">`),
    panel('about', `<div class="kicker">Sobre</div><h2>Ideias bem cuidadas.<br><span class="highlight">Interfaces que fazem sentido.</span></h2>${data.about.map((text) => `<p class="copy">${escape(text)}</p>`).join('')}`),
    panel('tech', `<div class="kicker">Tecnologias</div><h2>Minha base de trabalho.</h2><div class="tech-grid">${data.technologies.map((tech) => `<div class="medal"><div style="color:#8fc5a0">${icons[tech.id]}</div><div><strong>${escape(tech.name)}</strong><span>${escape(tech.label)}</span></div></div>`).join('')}</div>`),
    panel('principles', `<div class="kicker">Como trabalho</div><h2>Atenção em cada etapa.</h2><div class="principle-grid">${data.principles.map((item, i) => `<div class="principle"><span class="index">0${i + 1}</span><h3>${escape(item.title)}</h3><p>${escape(item.text)}</p></div>`).join('')}</div>`),
    panel('projects', '<div class="kicker">Projetos em destaque</div><h2>Da ideia à experiência.</h2><p class="copy">Cinco projetos que também estão no meu Portfólio.</p>', 'project-intro'),
    ...data.projects.map((project, i) => panel(project.id, `<div class="project-copy"><div class="project-id">0${i + 1} / PROJETO</div><h2>${escape(project.title)}</h2><p class="tag">${escape(project.tag)}</p><p class="copy">${escape(project.description)}</p><div class="cta">Ver aplicação ${arrow}</div></div><div class="project-icon">${icons[project.id]}</div>`, 'project')),
    panel('contact', `<div class="kicker">Contato</div><h2>Vamos construir algo?</h2><p class="copy">${escape(data.contactText)}</p><p class="email">felipejordao137@gmail.com</p>`)
  ];
}

function picture(key, alt) {
  return `<picture>\n    <source media="(max-width: 1011px)" srcset="./assets/profile/mobile/${key}.webp">\n    <img src="./assets/profile/desktop/${key}.webp" width="900" alt="${escape(alt)}">\n  </picture>`;
}

function makeReadme(data) {
  const imageBlock = (key, alt, url) => `<p align="center">\n  ${url ? `<a href="${url}">` : ''}${picture(key, alt)}${url ? '</a>' : ''}\n</p>`;
  const actions = `<p align="center">\n${data.contacts.map((contact) => `  <a href="${contact.url}"><img src="./assets/profile/actions/${contact.id}.webp" width="170" alt="${contact.id === 'email' ? 'Enviar e-mail' : `Acessar ${contact.name}`}"></a>`).join('\n')}\n</p>`;
  const projects = data.projects.map((project) => `${imageBlock(project.id, `${project.title}. ${project.tag}. ${project.description} Abrir aplicação.`, project.url)}\n\n<p align="left">\n  <a href="${project.code}"><img src="./assets/profile/actions/code.webp" width="150" alt="Ver código de ${escape(project.title)}"></a>\n</p>`).join('\n\n');
  const text = `### ${data.name}\n\n${data.role}. ${data.tagline}\n\n### Sobre\n\n${data.about.join('\n\n')}\n\n### Tecnologias\n\n${data.technologies.map((item) => item.name).join(' · ')}\n\n### Como trabalho\n\n${data.principles.map((item) => `- **${item.title}:** ${item.text}`).join('\n')}\n\n### Projetos\n\n${data.projects.map((project) => `#### ${project.title}\n\n${project.tag}. ${project.description}\n\n[Ver aplicação](${project.url}) · [Ver código](${project.code})`).join('\n\n')}\n\n### Contato\n\n${data.contactText}\n\n${data.contacts.map((contact) => `[${contact.name}](${contact.url})`).join(' · ')}`;
  return `${imageBlock('hero', `${data.name}. ${data.role}. ${data.tagline}`)}\n\n${imageBlock('about', `Sobre: ${data.about.join(' ')}`)}\n\n${imageBlock('tech', `Tecnologias: ${data.technologies.map((item) => `${item.name}, ${item.label}`).join('; ')}.`)}\n\n${imageBlock('principles', `Como trabalho: ${data.principles.map((item) => `${item.title}: ${item.text}`).join(' ')}`)}\n\n${imageBlock('projects', 'Projetos em destaque: cinco projetos que também estão no meu Portfólio.')}\n\n${projects}\n\n${imageBlock('contact', `${data.contactText} E-mail: felipejordao137@gmail.com.`)}\n\n${actions}\n\n<details>\n<summary>Sobre mim, projetos e contato em texto</summary>\n\n${text}\n\n</details>\n`;
}

async function main() {
  const data = JSON.parse(await fs.readFile(path.join(root, 'design/content.json'), 'utf8'));
  for (const key of [...data.projects, ...data.contacts, ...data.technologies].map((item) => item.id)) {
    if (!/^[a-z0-9-]+$/.test(key)) throw new Error(`Invalid asset identifier: ${key}`);
  }
  if (process.argv.includes('--readme-only')) {
    const manifest = JSON.parse(await fs.readFile(path.join(root, 'design/assets.json'), 'utf8'));
    manifest.breakpoint = 1011;
    await fs.writeFile(path.join(root, 'README.md'), makeReadme(data));
    await fs.writeFile(path.join(root, 'design/assets.json'), JSON.stringify(manifest, null, 2) + '\n');
    console.log('README regenerated using existing assets.');
    return;
  }
  const css = await fs.readFile(path.join(root, 'design/profile.css'), 'utf8');
  const base = pathToFileURL(path.join(root, 'design/')).href;
  const html = (content) => `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><base href="${base}"><style>${css}</style></head><body>${content}</body></html>`;
  const work = path.join(root, 'work');
  await fs.mkdir(work, { recursive: true });
  const browser = await chromium.launch({ headless: true, ...(process.env.PROFILE_BROWSER_PATH ? { executablePath: process.env.PROFILE_BROWSER_PATH } : {}) });
  const assets = [];
  try {
    for (const [mode, width] of [['desktop', 900], ['mobile', 360]]) {
      const page = await browser.newPage({ viewport: { width, height: 1200 }, deviceScaleFactor: 2 });
      for (const item of makePanels(data)) {
        const temp = path.join(work, 'panel.html');
        await fs.writeFile(temp, html(item.html));
        await page.goto(pathToFileURL(temp).href);
        await page.evaluate(() => document.fonts.ready);
        await page.waitForFunction(() => [...document.images].every((image) => image.complete && image.naturalWidth > 0));
        const valid = await page.evaluate(() => document.fonts.check('20px Inter') && document.fonts.check('20px Jakarta') && document.documentElement.scrollWidth === innerWidth);
        if (!valid) throw new Error(`Font or layout failed: ${mode}/${item.key}`);
        const png = await page.locator('.panel').screenshot({ omitBackground: true });
        const asset = path.join(root, `assets/profile/${mode}/${item.key}.webp`);
        await fs.mkdir(path.dirname(asset), { recursive: true });
        await sharp(png).webp({ quality: 94, alphaQuality: 100, effort: 6 }).toFile(asset);
        const dimensions = await sharp(asset).metadata();
        assets.push({ path: path.relative(root, asset).replace(/\\/g, '/'), width: dimensions.width, height: dimensions.height, bytes: (await fs.stat(asset)).size });
      }
      await page.close();
    }
    const page = await browser.newPage({ viewport: { width: 190, height: 60 }, deviceScaleFactor: 2 });
    for (const item of [...data.contacts, { id: 'code', name: 'Ver código' }]) {
      const temp = path.join(work, 'action.html');
      await fs.writeFile(temp, html(`<div class="action ${item.id === 'portfolio' ? 'primary' : item.id === 'code' ? 'code' : ''}">${icons[item.id]}<span>${escape(item.name)}</span></div>`));
      await page.goto(pathToFileURL(temp).href);
      await page.evaluate(() => document.fonts.ready);
      const png = await page.locator('.action').screenshot({ omitBackground: true });
      await sharp(png).webp({ quality: 96, alphaQuality: 100 }).toFile(path.join(root, `assets/profile/actions/${item.id}.webp`));
    }
    await page.close();
  } finally {
    await browser.close();
  }
  await fs.writeFile(path.join(root, 'README.md'), makeReadme(data));
  await fs.writeFile(path.join(root, 'design/assets.json'), JSON.stringify({ fonts: ['Plus Jakarta Sans', 'Inter'], breakpoint: 1011, deviceScaleFactor: 2, assets }, null, 2) + '\n');
  console.log(JSON.stringify({ panels: assets.length, images: assets.length + 4, totalPanelBytes: assets.reduce((sum, item) => sum + item.bytes, 0) }));
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
