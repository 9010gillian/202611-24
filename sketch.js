let bgImage; // 儲存背景圖片 bg/3.png[cite: 1]
let bgOffsetX = 0; // 記錄背景水平捲動偏移量（負值代表背景往左移動）[cite: 1]
let characterSprite; // 儲存角色一的精靈圖[cite: 1]
let walkSprite; // 儲存角色一的走路精靈圖[cite: 1]
let magicSprite; // 儲存角色一的施法精靈圖[cite: 1]
let magicEffectSprite; // 儲存角色一的魔法特效精靈圖[cite: 1]
let char2ActionSprite; // 儲存角色二的動作精靈圖（2/動作/動作的.png）
let char2StopSprite; // 儲存角色二的恢復精靈圖（2/stop/停.png）
let loadErrors = []; // 記錄載入失敗的圖片路徑方便除錯

let characterX; // 儲存角色一目前的水平中心位置[cite: 1]
let isWalking = false; // 記錄角色是否已切換為走路動畫[cite: 1]
let facingDirection = 1; // 記錄角色朝向（1 為右，-1 為左）[cite: 1]
let isCasting = false; // 記錄角色是否正在播放施法動畫[cite: 1]
let magicStartFrame = 0; // 記錄施法動畫開始時的畫面計數[cite: 1]
let magicDirection = 1; // 記錄施法時鎖定的方向[cite: 1]
let spaceIsDown = false; // 記錄空白鍵是否已按住以避免重複觸發[cite: 1]
let activeEffects = []; // 儲存目前畫面上飛行中的魔法特效[cite: 1]
let char2State = "action"; // 記錄角色二目前的狀態（"action" 顯示動作的.png，"stop" 顯示 2/stop/停.png）

// 數學加法選擇題狀態
let wasNearChar2 = false; // 記錄上一幀角色一是否接近角色二
let currentQuiz = null; // 儲存目前加法選擇題資料
let selectedAnswerIndex = -1; // 記錄玩家選擇的選項索引（0~2）
let answerFeedback = ""; // 記錄作答回饋文字

const frameCountInSprite = 10; // 設定精靈圖包含的影格數[cite: 1]
const frameWidth = 139.5; // 設定每個影格的寬度（1395 除以 10）[cite: 1]
const frameHeight = 196; // 設定每個影格的高度[cite: 1]
const walkFrameCount = 9; // 設定走路精靈圖包含的影格數[cite: 1]
const walkFrameWidth = 1246 / walkFrameCount; // 計算走路動畫每格的寬度[cite: 1]
const walkFrameHeight = 198; // 設定走路動畫每格的高度[cite: 1]
const magicFrameCount = 4; // 設定施法精靈圖包含的影格數[cite: 1]
const magicFrameWidth = 1039 / magicFrameCount; // 計算施法動畫每格的寬度[cite: 1]
const magicFrameHeight = 146; // 設定施法動畫每格的高度[cite: 1]
const effectFrameCount = 5; // 設定魔法特效精靈圖包含的影格數[cite: 1]
const effectFrameWidth = 740 / effectFrameCount; // 計算魔法特效每格的寬度[cite: 1]
const effectFrameHeight = 19; // 設定魔法特效每格的高度[cite: 1]

// 角色二動作精靈圖參數（2\動作\動作的.png：16 張圖片，全寬 2523，高 170）
const char2ActionFrameCount = 16;
const char2ActionTotalWidth = 2523;
const char2ActionFrameWidth = char2ActionTotalWidth / char2ActionFrameCount;
const char2ActionFrameHeight = 170;

// 角色二恢復精靈圖參數（2\stop\停.png：18 張圖片，全寬 1597，高 191）
const char2StopFrameCount = 18;
const char2StopTotalWidth = 1597;
const char2StopFrameWidth = char2StopTotalWidth / char2StopFrameCount;
const char2StopFrameHeight = 191;

const framesPerStep = 8; // 設定動畫每隔幾個畫面更新一格[cite: 1]

function safeLoadImage(path) {
  return loadImage(
    path,
    () => {},
    () => {
      loadErrors.push(path);
      console.warn("圖片載入失敗:", path);
    }
  );
}

function isImageReady(img) {
  return Boolean(img && img.width > 0 && img.height > 0);
}

function generateAdditionQuiz() {
  const a = floor(random(5, 26));
  const b = floor(random(5, 26));
  const correctAnswer = a + b;

  const optionSet = new Set([correctAnswer]);
  while (optionSet.size < 3) {
    const offset = floor(random(-8, 9));
    const candidate = correctAnswer + offset;
    if (candidate >= 0 && candidate !== correctAnswer) {
      optionSet.add(candidate);
    }
  }

  const options = shuffle(Array.from(optionSet));
  return {
    question: `${a} + ${b} = ?`,
    options,
    correctIndex: options.indexOf(correctAnswer)
  };
}

function preload() {
  bgImage = safeLoadImage("bg/3.png");
  characterSprite = safeLoadImage("1/stop/stop.png");
  walkSprite = safeLoadImage("1/walk/walk.png");
  magicSprite = safeLoadImage("1/magic/magic.png");
  magicEffectSprite = safeLoadImage("1/magic_effect/magic_effect.png");
  char2ActionSprite = safeLoadImage("2/動作/動作的.png");
  char2StopSprite = safeLoadImage("2/stop/停.png");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  imageMode(CENTER);
  characterX = (width * 2) / 3;
  currentQuiz = generateAdditionQuiz();
  frameRate(60);
}

function draw() {
  background("#87CEEB");

  const bgAspect = isImageReady(bgImage) ? bgImage.width / bgImage.height : 16 / 9;
  const singleBgWidth = max(width, height * bgAspect);
  const singleBgHeight = height;

  const minBgOffset = width - singleBgWidth * 2;
  const maxBgOffset = singleBgWidth;
  const anchorX = (width * 2) / 3;

  const movingRight = keyIsDown(RIGHT_ARROW);
  const movingLeft = keyIsDown(LEFT_ARROW);
  isWalking = movingRight || movingLeft;
  const movementStep = constrain(width * 0.004, 2, 8);

  const characterScale = (height / 3) / frameHeight;
  const characterWidth = frameWidth * characterScale;
  const characterHeight = height / 3;

  if (movingRight) {
    isWalking = true;
    facingDirection = 1;
    if (characterX < anchorX) {
      characterX = min(anchorX, characterX + movementStep);
    } else if (bgOffsetX > minBgOffset) {
      bgOffsetX = max(minBgOffset, bgOffsetX - movementStep);
    } else {
      characterX += movementStep;
    }
  } else if (movingLeft) {
    isWalking = true;
    facingDirection = -1;
    if (characterX > anchorX) {
      characterX = max(anchorX, characterX - movementStep);
    } else if (bgOffsetX < maxBgOffset) {
      bgOffsetX = min(maxBgOffset, bgOffsetX + movementStep);
    } else {
      characterX -= movementStep;
    }
  }

  bgOffsetX = constrain(bgOffsetX, minBgOffset, maxBgOffset);
  characterX = constrain(characterX, characterWidth / 2, width - characterWidth / 2);

  // 繪製三張左右串接的背景圖片（最左 i = -1、中 i = 0、右 i = 1）
  if (isImageReady(bgImage)) {
    push();
    imageMode(CORNER);
    for (let i = -1; i <= 1; i++) {
      const drawX = bgOffsetX + i * singleBgWidth;
      image(bgImage, drawX, 0, singleBgWidth, singleBgHeight);
    }
    pop();
  }

  // --- 繪製角色二（位於角色一左邊，最左邊背景圖 i = -1 的中間） ---
  const char2X = bgOffsetX - singleBgWidth / 2;
  const char2Distance = abs(characterX - char2X);
  const interactionThreshold = characterWidth * 1.5;
  const isNearChar2 = char2Distance <= interactionThreshold;

  // 當角色一遠離時，角色二恢復為顯示 2\stop\停.png（寬 1597，高 191）
  if (!isNearChar2) {
    char2State = "stop";
    if (wasNearChar2) {
      selectedAnswerIndex = -1;
      answerFeedback = "";
    }
  } else {
    char2State = "action";
    if (!wasNearChar2) {
      currentQuiz = generateAdditionQuiz();
      selectedAnswerIndex = -1;
      answerFeedback = "";
    }
  }
  wasNearChar2 = isNearChar2;

  const isChar2Stop = char2State === "stop";
  const char2ActiveSprite = isChar2Stop ? char2StopSprite : char2ActionSprite;
  const char2FrameCount = isChar2Stop ? char2StopFrameCount : char2ActionFrameCount;
  const char2FrameWidth = isChar2Stop ? char2StopFrameWidth : char2ActionFrameWidth;
  const char2FrameHeight = isChar2Stop ? char2StopFrameHeight : char2ActionFrameHeight;

  const char2Scale = (height / 3) / char2FrameHeight;
  const char2Width = char2FrameWidth * char2Scale;
  const char2Height = char2FrameHeight * char2Scale;
  const char2Y = height - char2Height / 2;

  const char2FrameIndex = floor(frameCount / framesPerStep) % char2FrameCount;
  const char2SourceX = char2FrameIndex * char2FrameWidth;

  if (isImageReady(char2ActiveSprite) && char2X > -char2Width && char2X < width + char2Width) {
    push();
    translate(char2X, char2Y);
    image(
      char2ActiveSprite,
      0,
      0,
      char2Width,
      char2Height,
      char2SourceX,
      0,
      char2FrameWidth,
      char2FrameHeight
    );
    pop();
  }

  // --- 繪製角色一 ---
  if (isCasting && frameCount - magicStartFrame >= magicFrameCount * framesPerStep) {
    isCasting = false;
    activeEffects.push({
      x: characterX + magicDirection * characterWidth / 2,
      y: height - characterHeight * 0.58,
      direction: magicDirection
    });
  }

  const activeSprite = isCasting ? magicSprite : isWalking ? walkSprite : characterSprite;
  const activeFrameCount = isCasting ? magicFrameCount : isWalking ? walkFrameCount : frameCountInSprite;
  const activeFrameWidth = isCasting ? magicFrameWidth : isWalking ? walkFrameWidth : frameWidth;
  const activeFrameHeight = isCasting ? magicFrameHeight : isWalking ? walkFrameHeight : frameHeight;
  const elapsedMagicFrames = frameCount - magicStartFrame;
  const frameIndex = isCasting
    ? floor(elapsedMagicFrames / framesPerStep)
    : floor(frameCount / framesPerStep) % activeFrameCount;
  const sourceX = frameIndex * activeFrameWidth;
  const activeWidth = activeFrameWidth * characterScale;
  const activeHeight = activeFrameHeight * characterScale;
  const characterY = height - activeHeight / 2;

  if (isImageReady(activeSprite)) {
    push();
    translate(characterX, characterY);
    scale(isCasting ? magicDirection : facingDirection, 1);
    image(activeSprite, 0, 0, activeWidth, activeHeight, sourceX, 0, activeFrameWidth, activeFrameHeight);
    pop();
  }

  // --- 更新並繪製魔法特效 ---
  if (isImageReady(magicEffectSprite)) {
    const effectScale = characterScale;
    const effectWidth = effectFrameWidth * effectScale;
    const effectHeight = effectFrameHeight * effectScale;
    const effectSpeed = max(6, width * 0.008);
    for (let effectIndex = activeEffects.length - 1; effectIndex >= 0; effectIndex--) {
      const effect = activeEffects[effectIndex];
      effect.x += effect.direction * effectSpeed;
      if (effect.x > width || effect.x < 0) {
        activeEffects.splice(effectIndex, 1);
        continue;
      }
      const effectFrameIndex = floor(frameCount / framesPerStep) % effectFrameCount;
      push();
      translate(effect.x, effect.y);
      scale(effect.direction, 1);
      image(
        magicEffectSprite,
        0,
        0,
        effectWidth,
        effectHeight,
        effectFrameIndex * effectFrameWidth,
        0,
        effectFrameWidth,
        effectFrameHeight
      );
      pop();
    }
  }

  // --- 當角色一接近角色二時，在畫布上方中央顯示透明度為 80 的黃色加法選擇題方框 ---
  if (isNearChar2 && currentQuiz) {
    const boxW = width / 3;
    const boxH = height / 2;
    const boxX = width / 2 - boxW / 2;
    const boxY = 8;

    push();
    rectMode(CORNER);
    fill(255, 220, 0, 80);
    stroke(160, 110, 0, 200);
    strokeWeight(2);
    rect(boxX, boxY, boxW, boxH, 12);

    noStroke();
    fill(20);
    textAlign(CENTER, TOP);
    const titleSize = constrain(min(boxW * 0.08, boxH * 0.12), 14, 28);
    const questionSize = constrain(min(boxW * 0.11, boxH * 0.16), 18, 36);
    const optionSize = constrain(min(boxW * 0.075, boxH * 0.1), 14, 24);

    textSize(titleSize);
    text("加法選擇題（按 1~3 或 A~C）", boxX + boxW / 2, boxY + boxH * 0.06);

    textSize(questionSize);
    textStyle(BOLD);
    text(currentQuiz.question, boxX + boxW / 2, boxY + boxH * 0.22);

    textStyle(NORMAL);
    textSize(optionSize);
    const labels = ["A", "B", "C"];
    for (let idx = 0; idx < currentQuiz.options.length; idx++) {
      const prefix = selectedAnswerIndex === idx ? "▶ " : "";
      const optionText = `${prefix}(${labels[idx]}) ${currentQuiz.options[idx]}`;
      text(optionText, boxX + boxW / 2, boxY + boxH * (0.44 + idx * 0.13));
    }

    if (answerFeedback) {
      textSize(optionSize);
      textStyle(BOLD);
      fill(selectedAnswerIndex === currentQuiz.correctIndex ? color(0, 120, 40) : color(180, 20, 20));
      text(answerFeedback, boxX + boxW / 2, boxY + boxH * 0.84);
    }
    pop();
  }

  // 若有圖片載入失敗，在左下角顯示提示方便排查路徑
  if (loadErrors.length > 0) {
    push();
    fill(0, 0, 0, 170);
    noStroke();
    rect(10, height - 34, min(width - 20, 560), 24, 6);
    fill(255, 230, 120);
    textAlign(LEFT, CENTER);
    textSize(13);
    text("找不到圖片：" + loadErrors.join(" , "), 18, height - 22);
    pop();
  }
}

function handleQuizAnswer(index) {
  if (!wasNearChar2 || !currentQuiz || index < 0 || index >= currentQuiz.options.length) {
    return;
  }
  selectedAnswerIndex = index;
  if (index === currentQuiz.correctIndex) {
    answerFeedback = "答對了！";
  } else {
    answerFeedback = "再試試看！";
  }
}

function keyPressed() {
  if (keyCode === RIGHT_ARROW) {
    isWalking = true;
    facingDirection = 1;
    return false;
  }
  if (keyCode === LEFT_ARROW) {
    isWalking = true;
    facingDirection = -1;
    return false;
  }
  if (keyCode === 32) {
    if (!spaceIsDown && !isCasting) {
      isCasting = true;
      magicStartFrame = frameCount;
      magicDirection = facingDirection;
    }
    spaceIsDown = true;
    return false;
  }

  if (key === "1" || key === "a" || key === "A") {
    handleQuizAnswer(0);
  } else if (key === "2" || key === "b" || key === "B") {
    handleQuizAnswer(1);
  } else if (key === "3" || key === "c" || key === "C") {
    handleQuizAnswer(2);
  }
}

function keyReleased() {
  if (keyCode === 32) {
    spaceIsDown = false;
  }
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  characterX = constrain(characterX, 1, width - 1);
}