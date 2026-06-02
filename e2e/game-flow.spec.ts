import { test, expect } from '@playwright/test';

test.describe('믿거래 게임 E2E 흐름', () => {
  test('방 생성, 봇 3명 추가, 빠른 턴 진행 후 게임 종료까지 시뮬레이션', async ({ page }) => {
    await page.goto('/game');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'screenshot_after_goto.png', fullPage: true });
    
    // 호스트 닉네임
    const nameInput = page.getByPlaceholder('예: 경수');
    await nameInput.fill('호스트 E2E');

    // 봇 테스트 방 생성 버튼
    const createBotRoomBtn = page.getByRole('button', { name: /봇 테스트로 시작/ });
    await createBotRoomBtn.click();

    // 봇 3명 추가
    const addBotBtn = page.getByRole('button', { name: /자동 봇 추가/ });
    await expect(addBotBtn).toBeVisible({ timeout: 10000 });
    await addBotBtn.click();
    await addBotBtn.click();
    await addBotBtn.click();

    // 게임 시작
    const startBtn = page.getByRole('button', { name: /게임 시작/ });
    await expect(startBtn).toBeEnabled({ timeout: 5000 });
    await startBtn.click();

    // 튜토리얼 모달이 뜨면 "확인" 버튼 눌러서 닫기
    const tutorialOkBtn = page.getByRole('button', { name: /확인/ });
    if (await tutorialOkBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await tutorialOkBtn.click();
      await page.waitForTimeout(500);
    }

    // 게임 턴 루프
    for (let i = 0; i < 50; i++) {
      const reportTitle = page.getByRole('heading', { name: /최종 신고/ });
      if (await reportTitle.isVisible()) {
        console.log(`[E2E] ${i}번째 액션에서 신고 단계 진입`);
        break; 
      }
      
      await page.waitForTimeout(1500);
      
      const drawBtn = page.getByRole('button', { name: /행동카드 뽑기/ });
      const coolDealBtn = page.getByRole('button', { name: /쿨거래/ });
      const skipBtn = page.getByRole('button', { name: /턴 종료/ });
      const selectTargetBtn = page.getByRole('button', { name: /적용하기|리뷰 쓰기|선택 완료/ });

      if (await coolDealBtn.isVisible()) {
        await coolDealBtn.click();
        await page.waitForTimeout(500);
      } else if (await drawBtn.isVisible() && await drawBtn.isEnabled()) {
        await drawBtn.click();
        await page.waitForTimeout(1000);

        // 시장 매물이 보이면 하나 선택 (거래/흥정/구매 액션을 위해)
        const marketCard = page.locator('.motion-card').first();
        if (await marketCard.isVisible()) {
          await marketCard.click();
          await page.waitForTimeout(500);
        }

        const dealRequestBtn = page.getByRole('button', { name: /거래 신청/ });
        if (await dealRequestBtn.isVisible() && await dealRequestBtn.isEnabled()) {
           await dealRequestBtn.click();
        } else if (await selectTargetBtn.isVisible()) {
           await selectTargetBtn.first().click();
        } else if (await skipBtn.isVisible() && await skipBtn.isEnabled()) {
           await skipBtn.click();
        }
      } else if (await skipBtn.isVisible() && await skipBtn.isEnabled()) {
        await skipBtn.click();
      }
    }

    // 최종 신고(상소문)
    const reportTitle = page.getByRole('heading', { name: /최종 신고/ });
    await expect(reportTitle).toBeVisible({ timeout: 15000 });

    const reportBtn = page.locator('section.border-red-500 button.motion-button').first();
    await expect(reportBtn).toBeVisible();
    await reportBtn.click();

    // 결과창 확인
    const resultTitle = page.getByRole('heading', { name: /결과 공개/ });
    await expect(resultTitle).toBeVisible({ timeout: 10000 });

    const rankingTitle = page.getByRole('heading', { name: /최종 순위 및 평판/ });
    await expect(rankingTitle).toBeVisible();

    console.log('[E2E] 게임 흐름 테스트 모두 통과');
  });
});
