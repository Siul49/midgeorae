import { chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

async function run() {
  console.log("Starting visual E2E verification using Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    // 1. 게임 메인 페이지 접속
    console.log("Navigating to http://localhost:3000/game ...");
    await page.goto("http://localhost:3000/game");
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "visual_1_lobby.png" });
    console.log("Saved visual_1_lobby.png");

    // 2. 방 만들기 시도
    // 입력창 탐색: 이름 필드에 "시각테스터" 입력
    const nameInput = await page.$("input[placeholder*='이름'], input[type='text']");
    if (nameInput) {
      await nameInput.fill("시각테스터");
    } else {
      console.log("Name input not found, searching other inputs...");
      const inputs = await page.$$("input");
      if (inputs.length > 0) {
        await inputs[0]!.fill("시각테스터");
      }
    }

    // 봇 테스트 방 모드 선택 (라디오 버튼 또는 셀렉트 박스 또는 버튼)
    // 버튼 텍스트나 라벨로 찾기
    const botTestRadio = await page.$("text=봇 테스트 방, label:has-text('봇 테스트')");
    if (botTestRadio) {
      await botTestRadio.click();
    } else {
      console.log("Bot test mode selection not found, trying selectors...");
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text?.includes("봇 테스트")) {
          await btn.click();
          break;
        }
      }
    }

    // 방 만들기 버튼 클릭
    const createRoomBtn = await page.$("button:has-text('방 만들기'), button:has-text('시작')");
    if (createRoomBtn) {
      await createRoomBtn.click();
    } else {
      console.log("Create room button not found, searching all buttons...");
      const buttons = await page.$$("button");
      for (const btn of buttons) {
        const text = await btn.textContent();
        if (text?.includes("만들기") || text?.includes("생성")) {
          await btn.click();
          break;
        }
      }
    }

    await page.waitForTimeout(2000);
    await page.screenshot({ path: "visual_2_waiting_room.png" });
    console.log("Saved visual_2_waiting_room.png");

    // 3. 봇 추가하기
    const addBotBtn = await page.$("button:has-text('봇 추가')");
    if (addBotBtn) {
      await addBotBtn.click();
      await page.waitForTimeout(1000);
      // 총 봇 4명 추가
      await addBotBtn.click();
      await page.waitForTimeout(1000);
      await addBotBtn.click();
      await page.waitForTimeout(1000);
      await addBotBtn.click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: "visual_3_bots_added.png" });
      console.log("Saved visual_3_bots_added.png");
    } else {
      console.log("Add bot button not found");
    }

    // 4. 게임 시작
    const startGameBtn = await page.$("button:has-text('게임 시작'), button:has-text('시작')");
    if (startGameBtn) {
      await startGameBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "visual_4_preparing.png" });
      console.log("Saved visual_4_preparing.png");
    } else {
      console.log("Start game button not found");
    }

    // 5. 매물 설정 완료 (fixPreparation)
    // 폼 안에 등록 버튼 클릭
    const submitPrepBtn = await page.$("button:has-text('매물 등록 완료'), button:has-text('완료'), button:has-text('등록')");
    if (submitPrepBtn) {
      await submitPrepBtn.click();
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "visual_5_playing.png" });
      console.log("Saved visual_5_playing.png");
    } else {
      console.log("Submit preparation button not found");
    }

  } catch (err) {
    console.error("Error during visual E2E:", err);
  } finally {
    await browser.close();
  }
}

run();
