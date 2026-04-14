/**
 * ローカルでキャプチャ処理をテストするスクリプト
 * 使い方: npx tsx scripts/test-capture.ts <tweet_url>
 */

import Browserbase from "@browserbasehq/sdk";
import { chromium } from "playwright-core";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const testUrl = process.argv[2] || "https://x.com/elikiuchi/status/1911369781824127051";

async function testCapture() {
  console.log("=== キャプチャテスト開始 ===");
  console.log("Target URL:", testUrl);
  console.log("");

  const browserbaseApiKey = process.env.BROWSERBASE_API_KEY;
  const browserbaseProjectId = process.env.BROWSERBASE_PROJECT_ID;
  const xAuthToken = process.env.X_AUTH_TOKEN;
  const xCt0 = process.env.X_CT0;

  console.log("環境変数チェック:");
  console.log("  BROWSERBASE_API_KEY:", browserbaseApiKey ? "設定済み" : "未設定");
  console.log("  BROWSERBASE_PROJECT_ID:", browserbaseProjectId ? "設定済み" : "未設定");
  console.log("  X_AUTH_TOKEN:", xAuthToken ? `設定済み (${xAuthToken.slice(0, 10)}...)` : "未設定");
  console.log("  X_CT0:", xCt0 ? `設定済み (${xCt0.slice(0, 10)}...)` : "未設定");
  console.log("");

  if (!browserbaseApiKey || !browserbaseProjectId) {
    console.error("Browserbaseの設定が必要です");
    process.exit(1);
  }

  const bb = new Browserbase({ apiKey: browserbaseApiKey });
  const session = await bb.sessions.create({ projectId: browserbaseProjectId });
  console.log("Browserbase session created:", session.id);

  const browser = await chromium.connectOverCDP(session.connectUrl);
  const context = browser.contexts()[0];
  const page = context.pages()[0];

  await page.setViewportSize({ width: 1280, height: 900 });

  if (xAuthToken && xCt0) {
    await context.addCookies([
      {
        name: "auth_token",
        value: xAuthToken,
        domain: ".x.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
      {
        name: "ct0",
        value: xCt0,
        domain: ".x.com",
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
      {
        name: "auth_token",
        value: xAuthToken,
        domain: ".twitter.com",
        path: "/",
        httpOnly: true,
        secure: true,
        sameSite: "None",
      },
      {
        name: "ct0",
        value: xCt0,
        domain: ".twitter.com",
        path: "/",
        httpOnly: false,
        secure: true,
        sameSite: "Lax",
      },
    ]);
    console.log("Cookies injected for x.com and twitter.com");

    await page.setExtraHTTPHeaders({ "x-csrf-token": xCt0 });
    console.log("CSRF header set");
  }

  // セッション確立
  console.log("\n=== セッション確立 ===");
  console.log("Navigating to x.com/home...");
  await page.goto("https://x.com/home", { waitUntil: "networkidle", timeout: 20000 });
  await page.waitForTimeout(3000);

  const homeUrl = page.url();
  console.log("Current URL after home visit:", homeUrl);

  // ログイン状態確認
  const isLoggedIn = await page.evaluate(() => {
    const accountSwitcher = document.querySelector('[data-testid="SideNav_AccountSwitcher_Button"]');
    const composeLink = document.querySelector('a[href="/compose/tweet"]');
    const tweetButton = document.querySelector('[data-testid="SideNav_NewTweet_Button"]');
    return {
      hasAccountSwitcher: !!accountSwitcher,
      hasComposeLink: !!composeLink,
      hasTweetButton: !!tweetButton,
    };
  });
  console.log("Login status indicators:", isLoggedIn);

  if (!isLoggedIn.hasAccountSwitcher && !isLoggedIn.hasTweetButton) {
    console.log("\n警告: ログインしていない可能性があります");
    const bodyText = await page.evaluate(() => document.body.innerText.slice(0, 1000));
    console.log("Page body preview:", bodyText);
  }

  // ツイートページへ移動
  console.log("\n=== ツイートページへ移動 ===");
  const normalizedUrl = testUrl.replace("twitter.com", "x.com");
  console.log("Navigating to:", normalizedUrl);

  await page.goto(normalizedUrl, { waitUntil: "domcontentloaded", timeout: 30000 });
  await Promise.race([
    page.waitForLoadState("networkidle"),
    page.waitForTimeout(10000),
  ]);
  await page.waitForTimeout(3000);

  console.log("Current URL:", page.url());
  console.log("Page title:", await page.title());

  // tweetText要素を探す
  console.log("\n=== ツイート要素の探索 ===");

  const tweetTextExists = await page.$('[data-testid="tweetText"]');
  console.log("tweetText element found:", !!tweetTextExists);

  const articleExists = await page.$('article');
  console.log("article element found:", !!articleExists);

  // 詳細な要素チェック
  const elementCheck = await page.evaluate(() => {
    const results: Record<string, unknown> = {};

    // tweetText
    const tweetText = document.querySelector('[data-testid="tweetText"]');
    results.tweetText = tweetText ? tweetText.textContent?.slice(0, 200) : null;

    // article内のlang div
    const article = document.querySelector('article');
    if (article) {
      const langDiv = article.querySelector('div[lang]');
      results.articleLangDiv = langDiv ? langDiv.textContent?.slice(0, 200) : null;
    }

    // time要素
    const time = document.querySelector('time');
    results.timeElement = time ? time.getAttribute('datetime') : null;

    // 全体のテキスト量
    results.bodyTextLength = document.body.innerText.length;

    // data-testid属性を持つ要素のリスト
    const testIds = Array.from(document.querySelectorAll('[data-testid]'))
      .map(el => el.getAttribute('data-testid'))
      .filter((v, i, a) => a.indexOf(v) === i)
      .slice(0, 30);
    results.dataTestIds = testIds;

    return results;
  });

  console.log("\n要素チェック結果:");
  console.log("  tweetText content:", elementCheck.tweetText || "(not found)");
  console.log("  article lang div:", elementCheck.articleLangDiv || "(not found)");
  console.log("  time element:", elementCheck.timeElement || "(not found)");
  console.log("  body text length:", elementCheck.bodyTextLength);
  console.log("  data-testid elements:", elementCheck.dataTestIds);

  // HTML出力
  console.log("\n=== HTML抜粋 ===");
  const htmlSnippet = await page.evaluate(() => {
    const article = document.querySelector('article');
    if (article) {
      return article.outerHTML.slice(0, 3000);
    }
    return document.body.innerHTML.slice(0, 3000);
  });
  console.log(htmlSnippet);

  // スクリーンショット保存
  await page.screenshot({ path: "test-capture-screenshot.png", fullPage: false });
  console.log("\nスクリーンショット保存: test-capture-screenshot.png");

  await browser.close();
  console.log("\n=== テスト完了 ===");
}

testCapture().catch(console.error);
