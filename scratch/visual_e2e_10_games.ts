import { chromium } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

const SCREENSHOT_DIR = path.join(process.cwd(), "public", "screenshots");

// 스크린샷 폴더 확인 및 생성
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

// 튜토리얼 팝업 모달이 노출되면 자동으로 닫아주는 헬퍼
async function closeTutorialModalIfVisible(page: any): Promise<boolean> {
  let closed = false;
  
  // 모달 내부에 있는 '확인' 버튼만 정확히 타겟팅
  const confirmBtn = await page.$("div.fixed.inset-0 button:has-text('확인'), div[class*='backdrop-blur'] button:has-text('확인'), button:has-text('확인')");
  if (confirmBtn) {
    const isVisible = await confirmBtn.isVisible();
    if (isVisible) {
      await confirmBtn.click({ force: true });
      console.log("Closed compact tutorial modal ('확인').");
      await page.waitForTimeout(800);
      closed = true;
    }
  }
  
  // 가이드북 닫기 버튼
  const guideCloseBtn = await page.$("div.fixed.inset-0 button:has-text('가이드북 닫기'), div[class*='backdrop-blur'] button:has-text('가이드북 닫기')");
  if (guideCloseBtn) {
    const isVisible = await guideCloseBtn.isVisible();
    if (isVisible) {
      await guideCloseBtn.click({ force: true });
      console.log("Closed full manual modal ('가이드북 닫기').");
      await page.waitForTimeout(800);
      closed = true;
    }
  }

  // 상단 X 버튼
  const xBtn = await page.$("div.fixed.inset-0 button:has(svg.lucide-x), div[class*='backdrop-blur'] button:has(svg.lucide-x)");
  if (xBtn && !closed) {
    const isVisible = await xBtn.isVisible();
    if (isVisible) {
      await xBtn.click({ force: true });
      console.log("Closed modal using X button.");
      await page.waitForTimeout(800);
      closed = true;
    }
  }

  return closed;
}

async function run() {
  console.log("==============================================================");
  console.log("STARTING 10-RUN E2E VISUAL INTERACTION SIMULATION");
  console.log(`Screenshots will be saved to: ${SCREENSHOT_DIR}`);
  console.log("==============================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 }
  });
  const page = await context.newPage();

  // 에러 로깅
  page.on("pageerror", (err) => {
    console.error("[Page Uncaught Error]:", err.message);
  });
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      console.log("[Page Console Error]:", msg.text());
    }
  });

  const RUNS = 2;

  for (let run = 1; run <= RUNS; run++) {
    console.log(`\n>>> STARTING GAME RUN #${run}/${RUNS} <<<`);
    let hasReported = false; // 해당 런의 최종 신고 완료 여부 플래그
    
    // 1. 메인 화면 접속
    console.log("Navigating to http://localhost:4000/game ...");
    await page.goto("http://localhost:4000/game");
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_1_lobby.png`) });
    console.log(`[Run ${run}] Saved lobby screen.`);

    // 2. 닉네임 입력 및 봇 테스트 방 생성
    const nameInput = await page.$("input[placeholder*='이름'], input[type='text']");
    if (nameInput) {
      await nameInput.fill(`E2E테스터_${run}`);
    }
    
    const botTestBtn = await page.$("button:has-text('봇 테스트로 시작')");
    if (botTestBtn) {
      await botTestBtn.click();
      console.log(`[Run ${run}] Clicked '봇 테스트로 시작'`);
    } else {
      console.error(`[Run ${run}] Bot test button not found!`);
      continue;
    }

    await page.waitForTimeout(2000);
    
    // 대기방 튜토리얼 팝업이 있다면 제거
    await closeTutorialModalIfVisible(page);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_2_waiting_room.png`) });
    console.log(`[Run ${run}] Saved waiting room.`);

    // 3. 봇 4명 추가
    const addBotBtn = await page.$("button:has-text('봇 추가')");
    if (addBotBtn) {
      for (let b = 1; b <= 4; b++) {
        await closeTutorialModalIfVisible(page);
        await addBotBtn.click();
        await page.waitForTimeout(600);
        console.log(`[Run ${run}] Added Bot #${b}`);
      }
      await page.waitForTimeout(1000);
      await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_3_waiting_room_full.png`) });
      console.log(`[Run ${run}] Room is now full of bots.`);
    } else {
      console.error(`[Run ${run}] Add bot button not found!`);
    }

    // 4. 게임 시작
    await closeTutorialModalIfVisible(page);
    const startBtn = await page.$("button:has-text('게임 시작')");
    if (startBtn) {
      await startBtn.click();
      console.log(`[Run ${run}] Clicked '게임 시작'`);
    } else {
      console.error(`[Run ${run}] Start game button not found!`);
      continue;
    }

    await page.waitForTimeout(2000);
    
    // 준비 단계 튜토리얼 팝업 닫기
    await closeTutorialModalIfVisible(page);
    
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_4_preparing.png`) });
    console.log(`[Run ${run}] Entered Preparation Step.`);

    // 5. 상품 등록 완료
    // 빌런인 경우 벽돌 위장용 셀렉트 박스가 뜰 수 있으므로 선택 처리
    const brickSelect = await page.$("select:has-text('위장할 제품 선택'), select");
    if (brickSelect) {
      const pageText = await page.textContent("body") ?? "";
      if (pageText.includes("위장할 제품 선택") || pageText.includes("위장 필수")) {
        const options = await brickSelect.$$eval("option", (opts) => opts.map(o => o.value));
        const validOption = options.find(v => v !== "");
        if (validOption) {
          await brickSelect.selectOption(validOption);
          console.log(`[Run ${run}] Selected fake item target for brick masquerade.`);
          await page.waitForTimeout(600);
        }
      }
    }

    const fixPrepBtn = await page.$("button:has-text('등록 및 준비 완료')");
    if (fixPrepBtn) {
      await fixPrepBtn.click();
      console.log(`[Run ${run}] Clicked '등록 및 준비 완료'`);
    } else {
      // 혹시 텍스트가 바뀐 경우 예비 클릭 시도
      const altBtn = await page.$("button:has-text('위장할 제품을 선택'), button:has-text('등록')");
      if (altBtn) {
        await altBtn.click();
        console.log(`[Run ${run}] Clicked alternative preparation button.`);
      } else {
        console.error(`[Run ${run}] Preparation submit button not found!`);
      }
    }

    await page.waitForTimeout(2500);
    
    // 플레이 단계 진입 튜토리얼 팝업 닫기
    await closeTutorialModalIfVisible(page);

    await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_5_game_started.png`) });
    console.log(`[Run ${run}] In-game playing phase started.`);

    // 6. 인게임 무한 루프 시뮬레이션
    let playLoop = 0;
    const maxPlayLoops = 150; // 최대 액션 회수

    while (playLoop < maxPlayLoops) {
      playLoop++;
      await page.waitForTimeout(1200); // UI 갱신 기다림
      
      // 매 루프마다 현재 실시간 화면 덮어쓰기 저장 (디버깅용)
      try {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, "current_state.png") });
      } catch (e) {}

      // 모달 수시 닫기
      await closeTutorialModalIfVisible(page);

      const currentUrl = page.url();
      // 혹시 메인으로 튕겼는지 확인
      if (!currentUrl.includes("/game")) {
        console.log(`[Run ${run}] Navigated away from game. Breaking loop.`);
        break;
      }

      // 게임 상태 점검을 위해 화면 텍스트 분석
      const pageText = await page.textContent("body") ?? "";
      
      if (pageText.includes("최종 게임 결과") || pageText.includes("게임이 종료되었습니다") || pageText.includes("우승 진영")) {
        await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_finished_result.png`) });
        console.log(`[Run ${run}] Game Finished! Captured result screen.`);
        
        // 로비로 돌아가기
        const lobbyBtn = await page.$("button:has-text('로비로 돌아가기'), button:has-text('로비로')");
        if (lobbyBtn) {
          await lobbyBtn.click();
          await page.waitForTimeout(1500);
        }
        break;
      }

      // 최종 신고 단계 (이미 신고하지 않은 경우에만 클릭)
      if ((pageText.includes("최종 신고") || pageText.includes("빌런으로 의심되는")) && !hasReported) {
        const reportTargetBtns = await page.$$("section:has-text('최종 신고') button");
        if (reportTargetBtns.length > 0) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_reporting_choice.png`) });
          // 첫 번째 플레이어(나를 제외한 다른 플레이어) 신고 클릭
          const targetBtn = reportTargetBtns[0]!;
          await targetBtn.click({ force: true });
          console.log(`[Run ${run}] Submitted final report via UI player button.`);
          hasReported = true; // 신고 완료 처리
          await page.waitForTimeout(1200);
        } else {
          console.log(`[Run ${run}] Reporting buttons not found in ReportPanel.`);
        }
        continue;
      }

      // 거래 제안 오버레이 (PendingDealPanel) 처리
      const hasPendingDeal = await page.$("section.deal-note");
      if (hasPendingDeal) {
        // 내가 의사결정 대상인지 버튼 존재 여부로 확인
        const coolBtn = await page.$("button:has-text('쿨거래')");
        const cancelBtn = await page.$("button:has-text('거래취소')");
        const inspectTokenBtn = await page.$("button:has-text('감정 토큰')");
        const negoTokenBtn = await page.$("button:has-text('네고 토큰')");

        if (coolBtn && cancelBtn) {
          // 거래 당사자임!
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_deal_choice_active.png`) });

          if (inspectTokenBtn && Math.random() < 0.4) {
            await inspectTokenBtn.click();
            console.log(`[Run ${run}] Used Inspect Token in E2E.`);
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_deal_after_inspect.png`) });
          } else if (negoTokenBtn && Math.random() < 0.4) {
            await negoTokenBtn.click();
            console.log(`[Run ${run}] Used Nego Token in E2E.`);
            await page.waitForTimeout(1000);
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_deal_after_nego.png`) });
          } else {
            // 일반 쿨거래 혹은 거절
            const chooseCool = Math.random() < 0.7;
            if (chooseCool) {
              await coolBtn.click();
              console.log(`[Run ${run}] Selected Cool Deal in E2E.`);
            } else {
              await cancelBtn.click();
              console.log(`[Run ${run}] Selected Cancel Deal in E2E.`);
            }
          }
        }
        continue;
      }

      // 거래 후기 등록 단계 (ReviewPanel) 처리
      const reviewSubmitBtn = await page.$("button:has-text('만족'), button:has-text('불만족'), button:has-text('후기 등록')");
      if (reviewSubmitBtn) {
        // 만족 또는 불만족 버튼 랜덤 클릭
        const satisfiedBtns = await page.$$("button:has-text('만족'), button:has-text('좋아요')");
        if (satisfiedBtns.length > 0) {
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_review_pending.png`) });
          const targetBtn = satisfiedBtns[Math.floor(Math.random() * satisfiedBtns.length)]!;
          await targetBtn.click();
          console.log(`[Run ${run}] Submitted review (Satisfied/Unsatisfied).`);
        }
        continue;
      }

      // 내 차례인지 확인 (MarketView 전환 및 콜론 기호 유무에 안전하도록 클래스/텍스트 조합으로 검출)
      const isMyTurnTag = await page.$("section.border-orange-400, section:has-text('내 턴')");
      if (isMyTurnTag) {
        // 1. 행동 카드 뽑기 버튼이 보이면 뽑음
        const drawBtn = await page.$("button:has-text('행동카드 뽑기')");
        if (drawBtn) {
          await drawBtn.click();
          console.log(`[Run ${run}] Drew Action Card.`);
          await page.waitForTimeout(800);
          await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_action_card_drawn.png`) });
          continue;
        }

        // 2. 뽑은 액션 카드가 있어서 타겟팅이 필요한 경우
        const skipBtn = await page.$("button:has-text('넘기기')");
        const tradeSubmitBtn = await page.$("div.grid-cols-2 button:has-text('거래 신청'), div.grid-cols-2 button:has-text('강매'), div.grid-cols-2 button:has-text('강탈'), div.grid-cols-2 button:has-text('나눔')");
        
        if (tradeSubmitBtn) {
          console.log(`[Run ${run}] Found trade submit button. Trying to activate it...`);
          let activated = false;

          for (let attempt = 0; attempt < 5; attempt++) {
            // 버튼 활성화 여부 확인
            const isEnabled = await tradeSubmitBtn.isEnabled();
            if (isEnabled) {
              activated = true;
              break;
            }

            // 아이템 클릭 시도 (내 손패 혹은 마켓 매물)
            const items = await page.$$("button.hand-item-card, div.motion-card, button.table-card");
            if (items.length > 0) {
              const item = items[attempt % items.length]!;
              await item.click({ force: true });
              console.log(`[Run ${run}] Clicked item card (attempt ${attempt + 1}).`);
              await page.waitForTimeout(400);
            }

            // 대상 플레이어 선택 시도
            const selectElement = await page.$("select");
            if (selectElement) {
              const options = await selectElement.$$eval("option", (opts) => opts.map(o => o.value));
              const validOptions = options.filter(v => v !== "");
              if (validOptions.length > 0) {
                const targetVal = validOptions[attempt % validOptions.length]!;
                await selectElement.selectOption(targetVal);
                console.log(`[Run ${run}] Selected target player option (attempt ${attempt + 1}).`);
                await page.waitForTimeout(400);
              }
            }
          }

          if (activated || await tradeSubmitBtn.isEnabled()) {
            await page.screenshot({ path: path.join(SCREENSHOT_DIR, `run_${run}_proposing_trade.png`) });
            await tradeSubmitBtn.click({ force: true });
            console.log(`[Run ${run}] Proposed a trade request via UI successfully.`);
          } else {
            console.log(`[Run ${run}] Trade button remains disabled. Trying skip button.`);
            if (skipBtn) {
              await skipBtn.click({ force: true });
              console.log(`[Run ${run}] Clicked skip button.`);
            }
          }
        } else if (skipBtn) {
          // 거래 외의 액션 카드(분리수거, 악플테러 등)나 거래할 수 없는 상황
          const selectElement = await page.$("select");
          if (selectElement) {
            const options = await selectElement.$$eval("option", (opts) => opts.map(o => o.value));
            const targetVal = options.find(v => v !== "");
            if (targetVal) {
              await selectElement.selectOption(targetVal);
            }
          }

          // 분리수거용 벽돌 선택 (옵션)
          const recycleBtn = await page.$("button:has-text('분리수거')");
          if (recycleBtn && await recycleBtn.isEnabled()) {
            await recycleBtn.click({ force: true });
            console.log(`[Run ${run}] Executed Recycle Action via UI.`);
          } else {
            if (skipBtn) {
              await skipBtn.click({ force: true });
              console.log(`[Run ${run}] Clicked skip/end turn instead of disabled recycle.`);
            }
          }
        }
      }
    }
  }

  await browser.close();
  console.log("==============================================================");
  console.log("VISUAL E2E INTERACTION SIMULATION COMPLETED SUCCESSFULLY!");
  console.log("==============================================================");
}

run();
