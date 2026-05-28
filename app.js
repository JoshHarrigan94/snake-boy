const mount = document.getElementById("threeMount");
const snakeCanvas = document.getElementById("snakeCanvas");
const ctx = snakeCanvas.getContext("2d");
const scoreValue = document.getElementById("scoreValue");
const statusText = document.getElementById("statusText");

const GRID = 16;
const CELL = snakeCanvas.width / GRID;
const TICK_MS = 135;

let snake;
let food;
let direction;
let nextDirection;
let score;
let running;
let gameOver;
let lastTick = 0;

let scene;
let camera;
let renderer;
let screenTexture;
let gameBoy;
let buttons = {};

initSnake();
drawSnakeCanvas();
initThree();
animate(0);

function initSnake() {
  snake = [
    { x: 8, y: 8 },
    { x: 7, y: 8 },
    { x: 6, y: 8 }
  ];

  direction = { x: 1, y: 0 };
  nextDirection = { x: 1, y: 0 };

  score = 0;
  running = false;
  gameOver = false;

  food = spawnFood();

  scoreValue.textContent = score;
  statusText.textContent = "Press Space to start";
}

function spawnFood() {
  let spot;

  do {
    spot = {
      x: Math.floor(Math.random() * GRID),
      y: Math.floor(Math.random() * GRID)
    };
  } while (snake.some(part => part.x === spot.x && part.y === spot.y));

  return spot;
}

function updateSnake() {
  if (!running || gameOver) return;

  direction = nextDirection;

  const head = snake[0];
  const nextHead = {
    x: head.x + direction.x,
    y: head.y + direction.y
  };

  const hitWall =
    nextHead.x < 0 ||
    nextHead.x >= GRID ||
    nextHead.y < 0 ||
    nextHead.y >= GRID;

  const hitSelf = snake.some(part => part.x === nextHead.x && part.y === nextHead.y);

  if (hitWall || hitSelf) {
    gameOver = true;
    running = false;
    statusText.textContent = "You crashed. Space to reboot the tiny idiot.";
    return;
  }

  snake.unshift(nextHead);

  const ateFood = nextHead.x === food.x && nextHead.y === food.y;

  if (ateFood) {
    score += 10;
    scoreValue.textContent = score;
    food = spawnFood();
  } else {
    snake.pop();
  }
}

function drawSnakeCanvas() {
  ctx.fillStyle = "#9bbc0f";
  ctx.fillRect(0, 0, snakeCanvas.width, snakeCanvas.height);

  drawLCDGrid();
  drawFood();
  drawSnake();

  if (!running && !gameOver && score === 0) {
    drawBootText("SNAKEBOY");
  }

  if (gameOver) {
    drawBootText("DEAD LOL");
  }
}

function drawLCDGrid() {
  ctx.fillStyle = "rgba(15, 56, 15, 0.08)";

  for (let x = 0; x < GRID; x++) {
    for (let y = 0; y < GRID; y++) {
      ctx.fillRect(x * CELL + 1, y * CELL + 1, CELL - 2, CELL - 2);
    }
  }

  ctx.fillStyle = "rgba(15, 56, 15, 0.08)";

  for (let y = 0; y < snakeCanvas.height; y += 4) {
    ctx.fillRect(0, y, snakeCanvas.width, 1);
  }
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
}

function drawBootText(text) {
  ctx.fillStyle = "rgba(15, 56, 15, 0.84)";
  ctx.fillRect(22, 94, 212, 68);

  ctx.fillStyle = "#9bbc0f";
  ctx.font = "bold 24px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 128, 118);

  ctx.font = "10px monospace";
  ctx.fillText("PRESS SPACE", 128, 143);
}

function initThree() {
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0c0e13);

  camera = new THREE.PerspectiveCamera(
    45,
    mount.clientWidth / mount.clientHeight,
    0.1,
    100
  );

  camera.position.set(0, 1.2, 8);

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(mount.clientWidth, mount.clientHeight);
  mount.appendChild(renderer.domElement);

  const ambient = new THREE.AmbientLight(0xffffff, 0.75);
  scene.add(ambient);

  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 5, 6);
  scene.add(key);

  const fill = new THREE.PointLight(0xa8c96d, 1.4, 10);
  fill.position.set(-3, 2, 3);
  scene.add(fill);

  screenTexture = new THREE.CanvasTexture(snakeCanvas);
  screenTexture.magFilter = THREE.NearestFilter;
  screenTexture.minFilter = THREE.NearestFilter;

  gameBoy = buildGameBoy();
  scene.add(gameBoy);

  window.addEventListener("resize", onResize);
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
}

function buildGameBoy() {
  const group = new THREE.Group();

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 5.7, 0.45),
    new THREE.MeshStandardMaterial({
      color: 0xd8d3bd,
      roughness: 0.62,
      metalness: 0.05
    })
  );

  body.position.y = -0.1;
  group.add(body);

  const screenBezel = new THREE.Mesh(
    new THREE.BoxGeometry(3.05, 2.35, 0.12),
    new THREE.MeshStandardMaterial({
      color: 0x333844,
      roughness: 0.5
    })
  );

  screenBezel.position.set(0, 1.25, 0.32);
  group.add(screenBezel);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(2.28, 1.72),
    new THREE.MeshBasicMaterial({
      map: screenTexture
    })
  );

  screen.position.set(0, 1.25, 0.39);
  group.add(screen);

  const logo = makeLabel("SNAKEBOY", 0, -0.08, 0.39, 0.5);
  group.add(logo);

  buttons.dpad = buildDpad();
  buttons.dpad.position.set(-0.95, -1.35, 0.4);
  group.add(buttons.dpad);

  buttons.a = makeButton(0xff4f87);
  buttons.a.position.set(1.13, -1.25, 0.43);
  buttons.a.rotation.z = -0.25;
  group.add(buttons.a);

  buttons.b = makeButton(0xff4f87);
  buttons.b.position.set(0.55, -1.55, 0.43);
  buttons.b.rotation.z = -0.25;
  group.add(buttons.b);

  buttons.start = makePillButton();
  buttons.start.position.set(0.38, -2.25, 0.43);
  buttons.start.rotation.z = -0.18;
  group.add(buttons.start);

  buttons.select = makePillButton();
  buttons.select.position.set(-0.38, -2.25, 0.43);
  buttons.select.rotation.z = -0.18;
  group.add(buttons.select);

  const speaker = buildSpeaker();
  speaker.position.set(1.1, -2.45, 0.39);
  group.add(speaker);

  const slot = new THREE.Mesh(
    new THREE.BoxGeometry(2.25, 0.18, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xbab49d,
      roughness: 0.7
    })
  );

  slot.position.set(0, 2.65, 0.35);
  group.add(slot);

  group.rotation.x = -0.12;
  group.rotation.y = -0.34;

  return group;
}

function buildDpad() {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x20232b,
    roughness: 0.48
  });

  const vertical = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.9, 0.15), mat);
  const horizontal = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.28, 0.15), mat);

  group.add(vertical);
  group.add(horizontal);

  return group;
}

function makeButton(color) {
  return new THREE.Mesh(
    new THREE.CylinderGeometry(0.24, 0.24, 0.16, 32),
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.38
    })
  );
}

function makePillButton() {
  return new THREE.Mesh(
    new THREE.BoxGeometry(0.55, 0.16, 0.11),
    new THREE.MeshStandardMaterial({
      color: 0x2a2d35,
      roughness: 0.45
    })
  );
}

function buildSpeaker() {
  const group = new THREE.Group();

  const mat = new THREE.MeshStandardMaterial({
    color: 0x8d8875,
    roughness: 0.7
  });

  for (let i = 0; i < 6; i++) {
    const hole = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.42, 0.05),
      mat
    );

    hole.position.x = i * 0.16;
    hole.rotation.z = -0.5;
    group.add(hole);
  }

  group.position.x -= 0.4;

  return group;
}

function makeLabel(text, x, y, z, size) {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 128;

  const labelCtx = canvas.getContext("2d");
  labelCtx.clearRect(0, 0, canvas.width, canvas.height);
  labelCtx.fillStyle = "#2a2d35";
  labelCtx.font = "bold 54px monospace";
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

function handleKeyDown(event) {
  const key = event.key.toLowerCase();

  if (["arrowup", "arrowdown", "arrowleft", "arrowright", "w", "a", "s", "d", " "].includes(key)) {
    event.preventDefault();
  }

  if (key === " ") {
    if (gameOver) {
      initSnake();
    }

    running = !running;
    statusText.textContent = running ? "SnakeBoy is running badly." : "Paused. Space to continue.";
    pressButton("start");
    return;
  }

  if ((key === "arrowup" || key === "w") && direction.y !== 1) {
    nextDirection = { x: 0, y: -1 };
    pressButton("dpad");
  }

  if ((key === "arrowdown" || key === "s") && direction.y !== -1) {
    nextDirection = { x: 0, y: 1 };
    pressButton("dpad");
  }

  if ((key === "arrowleft" || key === "a") && direction.x !== 1) {
    nextDirection = { x: -1, y: 0 };
    pressButton("dpad");
  }

  if ((key === "arrowright" || key === "d") && direction.x !== -1) {
    nextDirection = { x: 1, y: 0 };
    pressButton("dpad");
  }
}

function handleKeyUp() {
  releaseButtons();
}

function pressButton(name) {
  const button = buttons[name];

  if (!button) return;

  button.position.z = 0.34;
}

function releaseButtons() {
  Object.values(buttons).forEach(button => {
    if (!button) return;
    button.position.z = 0.43;
  });

  if (buttons.dpad) {
    buttons.dpad.position.z = 0.4;
  }
}

function onResize() {
  camera.aspect = mount.clientWidth / mount.clientHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(mount.clientWidth, mount.clientHeight);
}

function animate(time) {
  requestAnimationFrame(animate);

  if (time - lastTick > TICK_MS) {
    updateSnake();
    drawSnakeCanvas();

    if (screenTexture) {
      screenTexture.needsUpdate = true;
    }

    lastTick = time;
  }

  if (gameBoy) {
    gameBoy.rotation.y = -0.34 + Math.sin(time * 0.0007) * 0.08;
    gameBoy.rotation.x = -0.12 + Math.sin(time * 0.0009) * 0.035;
    gameBoy.position.y = Math.sin(time * 0.001) * 0.08;
  }

  renderer.render(scene, camera);
}