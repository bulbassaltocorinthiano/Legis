// Capturas de tela para conferência visual (desktop, tablet e celular).
// Uso: node scripts/screenshots.cjs http://localhost:3000 login senha pasta-de-saida
const { chromium, devices } = require("playwright");

(async () => {
  const [base, user, pass, out = "shots"] = process.argv.slice(2);
  const browser = await chromium.launch();
  const targets = [
    { name: "desktop", opts: { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 } },
    { name: "tablet", opts: { ...devices["iPad (gen 7)"] } },
    { name: "celular", opts: { ...devices["iPhone 13"] } },
  ];
  for (const t of targets) {
    const ctx = await browser.newContext(t.opts);
    const page = await ctx.newPage();
    await page.goto(`${base}/login`);
    await page.fill('input[name="username"]', user);
    await page.fill('input[name="password"]', pass);
    await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login")), page.click('button:has-text("Entrar")')]);
    const pages = [
      ["home", "/"],
      ["cc-art406", "/lei/lei-10406-2002#art406"],
      ["cpc-juris", "/lei/lei-13105-2015?aba=jurisprudencia#art85"],
      ["cp-art121", "/lei/dl-2848-1940#art121"],
      ["doutrina", "/doutrina"],
      ["busca", "/busca?q=prescri%C3%A7%C3%A3o%20intercorrente"],
      ["cobertura", "/admin/cobertura"],
    ];
    for (const [name, path] of pages) {
      await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
      await page.waitForTimeout(400);
      await page.screenshot({ path: `${out}/${t.name}-${name}.png` });
    }
    // popover da doutrina
    await page.goto(`${base}/lei/lei-10406-2002#art189`, { waitUntil: "networkidle" });
    const term = page.locator("[data-term]").first();
    if (await term.count()) {
      await term.scrollIntoViewIfNeeded();
      await term.click();
      await page.waitForTimeout(700);
      await page.screenshot({ path: `${out}/${t.name}-popover.png` });
    }
    await ctx.close();
  }
  await browser.close();
})();
