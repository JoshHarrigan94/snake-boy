const mount = document.getElementById("threeMount");
const snakeCanvas = document.getElementById("snakeCanvas");
const ctx = snakeCanvas.getContext("2d");

const GRID = 16;
const CELL = snakeCanvas.width / GRID;
const BASE_TICK_MS = 140;
const HIGH_SCORE_KEY = "snakeboy-high-score";

let snake;
let food;
let direction;
let nextDirection;
let score;
let highScore;
let running;
let gameOver;
let paused;
let lastTick = 0;

let scene;
let camera;
let renderer;
let screenTexture;
let gameBoy;
let buttons = {};

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const clickableControls = [];

initSnake();
drawSnakeCanvas();
initThree();
bindControls();
animate(0);

function initSnake() {
  snake = [
    { x: 8, y: 9 },
    { x: 7, y: 9 },
    { x: 6, y: 9 }
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };

  score = 0;
  highScore = Number(localStorage.getItem(HIGH_SCORE_KEY) || 0);

  running = false;
  paused = false;
  gameOver = false;

  food = spawnFood();
}

function spawnFood() {
  let spot;

  do {
    spot = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * (GRID - 2)) + 2
    };
  } while (snake.some(part => part.x === spot.x && part.y === spot.y));

  return spot;
}

function startPauseRestart() {
  if (gameOver) {
    initSnake();
    running = true;
    paused = false;
    pressButton("start");
    return;
  }

  if (!running) {
    running = true;
    paused = false;
    pressButton("start");
    return;
  }

  paused = !paused;
  running = !paused;
  pressButton("start");
}

function setDirection(control) {
  if (!running && !gameOver) {
    running = true;
    paused = false;
  }

  if (gameOver || paused) return;

  if (control === "up" && direction.y !== 1) {
    nextDirection = { x: 0, y: -1 };
    pressButton("dpad");
  }

  if (control === "down" && direction.y !== -1) {
    nextDirection = { x: 0, y: 1 };
    pressButton("dpad");
  }

  if (control === "left" && direction.x !== 1) {
    nextDirection = { x: -1, y: 0 };
    pressButton("dpad");
  }

  if (control === "right" && direction.x !== -1) {
    nextDirection = { x: 1, y: 0 };
    pressButton("dpad");
  }
}

function triggerControl(control) {
  if (!control) return;

  if (control === "start" || control === "select") {
    startPauseRestart();
    return;
  }

  if (control === "a" || control === "b") {
    pressButton(control);

    if (!running && !gameOver) {
      startPauseRestart();
    }

    return;
  }

  setDirection(control);
}

function updateSnake() {
  if (!running || paused || gameOver) return;

  direction = nextDirection;

  const head = snake[0];

  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= GRID ||
    nextHead.y < 2 ||
    nextHead.y >= GRID;

  const hitSelf = snake.some(
    part => part.x === nextHead.x && part.y === nextHead.y
  );

  if (hitWall || hitSelf) {
    gameOver = true;
    running = false;
    paused = false;
    saveHighScore();
    return;
  }

  snake.unshift(nextHead);

  const ateFood = nextHead.x === food.x && nextHead.y === food.y;

  if (ateFood) {
    score += 10;
    saveHighScore();
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function saveHighScore() {
  if (score > highScore) {
    highScore = score;
    localStorage.setItem(HIGH_SCORE_KEY, String(highScore));
  }
}

function currentTickSpeed() {
  const speedBoost = Math.floor(score / 50) * 6;
  return Math.max(76, BASE_TICK_MS - speedBoost);
}

function drawSnakeCanvas() {
  drawLCDBase();
  drawLCDGrid();
  drawScoreBar();

  if (running && !paused && !gameOver) {
    drawFood();
    drawSnake();
  } else {
    drawFood();
    drawSnake();
  }

  drawScreenVignette();

  if (!running && !paused && !gameOver && score === 0) {
    drawBootScreen();
  }

  if (paused) {
    drawMessagePanel("PAUSED", "PRESS START");
  }

  if (gameOver) {
    drawMessagePanel("DEAD LOL", "START TO REBOOT");
  }
}

function drawLCDBase() {
  ctx.fillStyle = "#9bbc0f";
  ctx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  ctx.fillStyle = "rgba(15, 56, 15, 0.05)";
  ctx.fillRect(0, 0, 256, 28);
}

function drawLCDGrid() {
  ctx.fillStyle = "rgba(15, 56, 15, 0.07)";

  for (let x = 0; x < GRID; x++) {
    for (let y = 2; y < GRID; y++) {
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  ctx.fillStyle = "rgba(15, 56, 15, 0.08)";

  for (let y = 0; y < snakeCanvas.height; y += 4) {
    ctx.fillRect(0, y, snakeCanvas.width, 1);
  }
}

function drawScoreBar() {
  ctx.fillStyle = "#0f380f";
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText(`SCORE ${String(score).padStart(3, "0")}`, 8, 14);

  ctx.textAlign = "right";
  ctx.fillText(`HI ${String(highScore).padStart(3, "0")}`, 248, 14);

  ctx.fillStyle = "rgba(15, 56, 15, 0.35)";
  ctx.fillRect(0, 27, 256, 2);
}

function drawSnake() {
  snake.forEach((part, index) => {
    ctx.fillStyle = index === 0 ? "#0f380f" : "#306230";

    ctx.fillRect(
      part.x * CELL + 2,
      part.y * CELL + 2,
      CELL - 4,
      CELL - 4
    );
  });
}

function drawFood() {
  ctx.fillStyle = "#0f380f";
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2,
    food.y * CELL + CELL / 2,
    CELL * 0.32,
    0,
    Math.PI * 2
  );
  ctx.fill();

  ctx.fillStyle = "rgba(155,188,15,0.45)";
  ctx.beginPath();
  ctx.arc(
    food.x * CELL + CELL / 2 - 2,
    food.y * CELL + CELL / 2 - 2,
    CELL * 0.12,
    0,
    Math.PI * 2
  );
  ctx.fill();
}

function drawScreenVignette() {
  const gradient = ctx.createRadialGradient(128, 128, 40, 128, 128, 180);
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(1, "rgba(15,56,15,0.16)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);
}

function drawBootScreen() {
  ctx.fillStyle = "rgba(15, 56, 15, 0.9)";
  ctx.fillRect(24, 78, 208, 96);

  ctx.fillStyle = "#9bbc0f";
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("SNAKEBOY", 128, 106);

  ctx.font = "bold 10px monospace";
  ctx.fillText("3D HANDHELD EDITION", 128, 130);
  ctx.fillText("PRESS START", 128, 153);
}

function drawMessagePanel(title, subtitle) {
  ctx.fillStyle = "rgba(15, 56, 15, 0.9)";
  ctx.fillRect(26, 88, 204, 78);

  ctx.strokeStyle = "#9bbc0f";
  ctx.lineWidth = 2;
  ctx.strokeRect(30, 92, 196, 70);

  ctx.fillStyle = "#9bbc0f";
  ctx.font = "bold 22px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(title, 128, 116);

  ctx.font = "bold 10px monospace";
  ctx.fillText(subtitle, 128, 142);
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e13);

  camera = new THREE.PerspectiveCamera(
    38,
    mount.clientWidth / mount.clientHeight,
    0.1,
    100
  );

  setCameraForViewport();

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.35);
  key.position.set(4, 5, 6);
  scene.add(key);

  const rim = new THREE.PointLight(0xa8c96d, 1.25, 10);
  rim.position.set(-3, 1.5, 3);
  scene.add(rim);

  const warm = new THREE.PointLight(0xffd8aa, 0.7, 10);
  warm.position.set(3, -2, 4);
  scene.add(warm);

  screenTexture = new THREE.CanvasTexture(snakeCanvas);
  screenTexture.magFilter = THREE.NearestFilter;
  screenTexture.minFilter = THREE.NearestFilter;

  gameBoy = buildGameBoy();
  scene.add(gameBoy);

  renderer.domElement.addEventListener("pointerdown", handleThreePointer);
  window.addEventListener("resize", onResize);
}

function setCameraForViewport() {
  const width = mount.clientWidth;
  const height = mount.clientHeight;
  const isPhone = width < 720;
  const isLandscape = width > height;

  if (isPhone && !isLandscape) {
    camera.fov = 34;
    camera.position.set(0, -0.05, 9.75);
    camera.lookAt(0, -0.22, 0);
  } else if (isPhone && isLandscape) {
    camera.fov = 40;
    camera.position.set(0, 0.12, 8.4);
    camera.lookAt(0, -0.1, 0);
  } else {
    camera.fov = 35;
    camera.position.set(0, 0.28, 8.15);
    camera.lookAt(0, -0.12, 0);
  }

  camera.updateProjectionMatrix();
}

function buildGameBoy() {
  const group = new THREE.Group();

  const plastic = new THREE.MeshStandardMaterial({
    color: 0xd8d2bd,
    roughness: 0.68,
    metalness: 0.03
  });

  const darkPlastic = new THREE.MeshStandardMaterial({
    color: 0x2d3240,
    roughness: 0.54
  });

  const rubber = new THREE.MeshStandardMaterial({
    color: 0x20232b,
    roughness: 0.48
  });

  const red = new THREE.MeshStandardMaterial({
    color: 0xde3156,
    roughness: 0.35,
    emissive: 0x330006
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(3.85, 5.85, 0.48), plastic);
  body.position.y = -0.05;
  group.add(body);

  const facePlate = new THREE.Mesh(new THREE.BoxGeometry(3.58, 5.52, 0.08), plastic);
  facePlate.position.set(0, -0.05, 0.29);
  group.add(facePlate);

  const lowerLip = new THREE.Mesh(
    new THREE.BoxGeometry(3.7, 0.18, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xc3bda8,
      roughness: 0.72
    })
  );
  lowerLip.position.set(0, -2.82, 0.35);
  group.add(lowerLip);

  const screenBezel = new THREE.Mesh(new THREE.BoxGeometry(3.15, 2.38, 0.16), darkPlastic);
  screenBezel.position.set(0, 1.33, 0.42);
  group.add(screenBezel);

  const screenGlass = new THREE.Mesh(
    new THREE.BoxGeometry(2.48, 1.84, 0.035),
    new THREE.MeshStandardMaterial({
      color: 0x151913,
      roughness: 0.28,
      metalness: 0.03
    })
  );
  screenGlass.position.set(0, 1.26, 0.525);
  group.add(screenGlass);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.18, 1.58),
    new THREE.MeshBasicMaterial({
      map: screenTexture
    })
  );
  screen.position.set(0, 1.26, 0.548);
  group.add(screen);

  const screenShine = new THREE.Mesh(
    new THREE.PlaneGeometry(2.18, 1.58),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.035
    })
  );
  screenShine.position.set(0, 1.26, 0.552);
  screenShine.rotation.z = -0.18;
  group.add(screenShine);

  const led = new THREE.Mesh(new THREE.SphereGeometry(0.055, 20, 20), red);
  led.position.set(-1.32, 1.78, 0.54);
  group.add(led);

  group.add(makeSmallLabel("BATTERY", -1.12, 1.77, 0.55, 0.26));
  group.add(makeSmallLabel("DOT MATRIX WITH SNAKE", 0, 0.17, 0.55, 0.38));
  group.add(makeSmallLabel("SNAKEBOY", 0, -0.17, 0.51, 0.55));

  buttons.dpad = buildDpad(rubber);
  buttons.dpad.position.set(-1.0, -1.28, 0.55);
  group.add(buttons.dpad);

  addControlHitbox(group, "up", -1.0, -0.91, 0.82, 0.72, 0.64);
addControlHitbox(group, "down", -1.0, -1.65, 0.82, 0.72, 0.64);
addControlHitbox(group, "left", -1.37, -1.28, 0.82, 0.64, 0.72);
addControlHitbox(group, "right", -0.63, -1.28, 0.82, 0.64, 0.72);

  buttons.a = makeButton(0xbe2450);
  buttons.a.position.set(1.14, -1.16, 0.58);
  buttons.a.rotation.x = Math.PI / 2;
  buttons.a.userData.control = "a";
  group.add(buttons.a);
  clickableControls.push(buttons.a);
  addControlHitbox(group, "a", 1.14, -1.16, 0.84, 0.72, 0.72);

  buttons.b = makeButton(0xbe2450);
  buttons.b.position.set(0.58, -1.47, 0.58);
  buttons.b.rotation.x = Math.PI / 2;
  buttons.b.userData.control = "b";
  group.add(buttons.b);
  clickableControls.push(buttons.b);
  addControlHitbox(group, "b", 0.58, -1.47, 0.84, 0.72, 0.72);

  buttons.start = makePillButton(rubber);
  buttons.start.position.set(0.38, -2.18, 0.56);
  buttons.start.rotation.z = -0.16;
  buttons.start.userData.control = "start";
  group.add(buttons.start);
  clickableControls.push(buttons.start);
  addControlHitbox(group, "start", 0.38, -2.18, 0.84, 0.92, 0.56);
addControlHitbox(group, "select", -0.38, -2.18, 0.84, 0.92, 0.56);

  buttons.select = makePillButton(rubber);
  buttons.select.position.set(-0.38, -2.18, 0.56);
  buttons.select.rotation.z = -0.16;
  buttons.select.userData.control = "select";
  group.add(buttons.select);

  group.add(makeSmallLabel("SELECT", -0.38, -2.42, 0.51, 0.22));
  group.add(makeSmallLabel("START", 0.38, -2.42, 0.51, 0.22));

  const speaker = buildSpeaker();
  speaker.position.set(1.0, -2.45, 0.52);
  group.add(speaker);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(2.35, 0.16, 0.07),
    new THREE.MeshStandardMaterial({
      color: 0xb7b09c,
      roughness: 0.75
    })
  );
  slot.position.set(0, 2.72, 0.36);
  group.add(slot);

  addScrews(group);
  addCornerDots(group);

  group.rotation.x = -0.018;
group.rotation.y = -0.055;
group.position.y = 0.08;

  return group;
}

function buildDpad(material) {
  const group = new THREE.Group();

  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.96, 0.16), material);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.3, 0.16), material);

  const centre = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.05, 28),
    new THREE.MeshStandardMaterial({
      color: 0x15171d,
      roughness: 0.5
    })
  );

  centre.rotation.x = Math.PI / 2;
  centre.position.z = 0.1;

  group.add(vertical);
  group.add(horizontal);
  group.add(centre);

  return group;
}

function makeButton(color) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.25, 0.25, 0.18, 40),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.34
    })
  );
}

function makePillButton(material) {
  return new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.17, 0.11), material);
}

function buildSpeaker() {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8f8977,
    roughness: 0.75
  });

  for (let i = 0; i < 6; i++) {
    const groove = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.48, 0.035), mat);
    groove.position.x = i * 0.16;
    groove.rotation.z = -0.52;
    group.add(groove);
  }

  group.position.x -= 0.4;
  return group;
}

function addScrews(group) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xaaa38e,
    roughness: 0.65
  });

  const positions = [
    [-1.68, 2.55],
    [1.68, 2.55],
    [-1.68, -2.62],
    [1.68, -2.62]
  ];

  positions.forEach(([x, y]) => {
    const screw = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.025, 22), mat);
    screw.rotation.x = Math.PI / 2;
    screw.position.set(x, y, 0.55);
    group.add(screw);
  });
}

function addCornerDots(group) {
  const mat = new THREE.MeshStandardMaterial({
    color: 0xc8c1ac,
    roughness: 0.7
  });

  for (let i = 0; i < 4; i++) {
    const dot = new THREE.Mesh(new THREE.SphereGeometry(0.035, 14, 14), mat);
    dot.position.set(-1.48 + i * 0.22, 2.42, 0.55);
    group.add(dot);
  }
}

function addControlHitbox(group, control, x, y, z, width, height) {
  const hitbox = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.08),
    new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false
    })
  );

  hitbox.position.set(x, y, z);
  hitbox.userData.control = control;
  hitbox.name = `hitbox-${control}`;

  group.add(hitbox);
  clickableControls.push(hitbox);

  return hitbox;
}

function makeSmallLabel(text, x, y, z, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const labelCtx = canvas.getContext("2d");
  labelCtx.clearRect(0, 0, canvas.width, canvas.height);
  labelCtx.fillStyle = "#282b33";
  labelCtx.font = "bold 44px monospace";
  labelCtx.textAlign = "center";
  labelCtx.textBaseline = "middle";
  labelCtx.fillText(text, 256, 64);

  const texture = new THREE.CanvasTexture(canvas);

  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 3.2, size * 0.8),
    new THREE.MeshBasicMaterial({
      map: texture,
      transparent: true
    })
  );

  mesh.position.set(x, y, z);
  return mesh;
}

function handleThreePointer(event) {
  event.preventDefault();

  const rect = renderer.domElement.getBoundingClientRect();

  pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

  raycaster.setFromCamera(pointer, camera);

  const hits = raycaster.intersectObjects(clickableControls, true);

  if (!hits.length) return;

  const hit = hits.find(item => item.object.userData.control);

  if (!hit) return;

  const control = hit.object.userData.control;

  triggerControl(control);
}

function bindControls() {
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", releaseButtons);
}

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  const blockedKeys = [
    "arrowup",
    "arrowdown",
    "arrowleft",
    "arrowright",
    "w",
    "a",
    "s",
    "d",
    " "
  ];

  if (blockedKeys.includes(key)) {
    event.preventDefault();
  }

  if (key === " ") {
    triggerControl("start");
    return;
  }

  if (key === "arrowup" || key === "w") triggerControl("up");
  if (key === "arrowdown" || key === "s") triggerControl("down");
  if (key === "arrowleft" || key === "a") triggerControl("left");
  if (key === "arrowright" || key === "d") triggerControl("right");
}

function pressButton(name) {
  const button = buttons[name];
  if (!button) return;

  button.position.z -= 0.08;

  clearTimeout(button.pressTimer);
  button.pressTimer = setTimeout(() => {
    releaseButtons();
  }, 110);
}

function releaseButtons() {
  if (buttons.dpad) buttons.dpad.position.z = 0.55;
  if (buttons.a) buttons.a.position.z = 0.58;
  if (buttons.b) buttons.b.position.z = 0.58;
  if (buttons.start) buttons.start.position.z = 0.56;
  if (buttons.select) buttons.select.position.z = 0.56;
}

function onResize() {
  setCameraForViewport();

  camera.aspect = mount.clientWidth / mount.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(mount.clientWidth, mount.clientHeight);
}

function animate(time) {
  requestAnimationFrame(animate);

  if (time - lastTick > currentTickSpeed()) {
    updateSnake();
    drawSnakeCanvas();

    if (screenTexture) {
      screenTexture.needsUpdate = true;
    }

    lastTick = time;
  }

  if (gameBoy) {
  const isPhone = mount.clientWidth < 720;
  const wobbleAmount = isPhone ? 0.004 : 0.018;
  const floatAmount = isPhone ? 0.008 : 0.018;

  gameBoy.rotation.y = -0.055 + Math.sin(time * 0.0007) * wobbleAmount;
  gameBoy.rotation.x = -0.018 + Math.sin(time * 0.0009) * 0.004;
  gameBoy.position.y = 0.08 + Math.sin(time * 0.001) * floatAmount;
}

  renderer.render(scene, camera);
}