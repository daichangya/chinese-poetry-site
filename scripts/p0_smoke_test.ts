/**
 * P0 烟雾测试：在静态站点运行中请求关键 URL，校验 200 与关键内容。
 * 使用方式：先 npx serve out -p 3787，再 BASE_URL=http://127.0.0.1:3787 tsx scripts/p0_smoke_test.ts
 * @author poetry
 */

const BASE = process.env.BASE_URL ?? "http://127.0.0.1:3787";

async function fetchOk(url: string): Promise<{ status: number; text: string }> {
  const res = await fetch(url, { redirect: "follow" });
  const text = await res.text();
  return { status: res.status, text };
}

async function main(): Promise<void> {
  let failed = false;

  const cases: { name: string; url: string; expectInBody?: string }[] = [
    { name: "首页", url: `${BASE}/` },
    { name: "诗文列表", url: `${BASE}/poems/` },
    { name: "诗人列表", url: `${BASE}/authors/` },
    { name: "朝代列表", url: `${BASE}/dynasties/` },
    {
      name: "诗词详情",
      url: `${BASE}/poems/shang-tiao-liang-ting-le-tan-shi/`,
      expectInBody: "商调",
    },
  ];

  for (const { name, url, expectInBody } of cases) {
    const { status, text } = await fetchOk(url);
    if (status !== 200) {
      console.error(`P0 烟雾: ${name} ${url} → ${status}`);
      failed = true;
    } else if (expectInBody && !text.includes(expectInBody)) {
      console.error(`P0 烟雾: ${name} 响应中未包含 "${expectInBody}"`);
      failed = true;
    } else {
      console.log(`P0 烟雾: ${name} OK`);
    }
  }

  if (failed) process.exit(1);
  console.log("P0 烟雾: 全部通过");
}

main();
