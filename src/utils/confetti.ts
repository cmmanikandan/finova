// Custom lightweight particle confetti system.
// Requires 0 external dependencies, high performance 60fps canvas.

export function fireConfetti(): void {
  const canvas = document.createElement('canvas');
  canvas.style.position = 'fixed';
  canvas.style.inset = '0';
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  canvas.style.zIndex = '99999';
  canvas.style.pointerEvents = 'none';
  document.body.appendChild(canvas);

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  let W = window.innerWidth;
  let H = window.innerHeight;
  canvas.width = W;
  canvas.height = H;

  // Handle window resizing
  const handleResize = () => {
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
  };
  window.addEventListener('resize', handleResize);

  const colors = ['#2D7DFF', '#22D3EE', '#34D399', '#F59E0B', '#EF4444', '#7C3AED'];
  const particles: Array<{
    x: number;
    y: number;
    vx: number;
    vy: number;
    r: number;
    color: string;
    opacity: number;
    rotation: number;
    rotationSpeed: number;
  }> = [];

  // Spawn particles from bottom center pushing up
  for (let i = 0; i < 90; i++) {
    particles.push({
      x: W / 2,
      y: H + 15,
      vx: (Math.random() - 0.5) * 14,
      vy: -Math.random() * 18 - 12,
      r: Math.random() * 6 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      opacity: 1,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 12,
    });
  }

  
  const render = () => {
    ctx.clearRect(0, 0, W, H);
    let alive = false;

    particles.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.42; // gravity
      p.vx *= 0.975; // air resistance friction
      p.rotation += p.rotationSpeed;

      if (p.vy > 0) {
        p.opacity -= 0.018; // fade out as they fall
      }

      if (p.opacity > 0 && p.y < H + 50 && p.x > -50 && p.x < W + 50) {
        alive = true;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate((p.rotation * Math.PI) / 180);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.opacity;
        ctx.fillRect(-p.r, -p.r, p.r * 2, p.r * 2);
        ctx.restore();
      }
    });

    if (alive) {
      requestAnimationFrame(render);
    } else {
      window.removeEventListener('resize', handleResize);
      if (document.body.contains(canvas)) {
        document.body.removeChild(canvas);
      }
    }
  };

  render();
}
