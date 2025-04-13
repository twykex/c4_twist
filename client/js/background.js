// client/js/background.js

const canvas = document.getElementById('background-canvas');
const ctx = canvas.getContext('2d');

let particles = [];
let animationFrameId;
const connectDistance = 100; // Max distance to draw lines between particles
const particleCount = 80; // Adjust for performance/density

// --- Utility Functions ---
function getCssVariable(varName) {
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
}

// --- Particle Class ---
class Particle {
    constructor(x, y, dx, dy, radius, color) {
        this.x = x;
        this.y = y;
        this.dx = dx; // Velocity x
        this.dy = dy; // Velocity y
        this.radius = radius;
        this.color = color;
        this.baseRadius = radius; // Store original radius
    }

    draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2, false);
        ctx.fillStyle = this.color;
        ctx.fill();
        ctx.closePath();
    }

    update(deltaTime) { // Add deltaTime for smoother animation (optional for now)
        // Bounce off edges
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
            this.dx = -this.dx;
            // Prevent sticking to edge
            this.x = Math.max(this.radius, Math.min(canvas.width - this.radius, this.x));
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
            this.dy = -this.dy;
             // Prevent sticking to edge
             this.y = Math.max(this.radius, Math.min(canvas.height - this.radius, this.y));
        }

        // Move particle
        this.x += this.dx * (deltaTime || 1); // Basic movement, multiply by deltaTime if implementing frame-rate independence
        this.y += this.dy * (deltaTime || 1);
    }
}

// --- Animation Functions ---
function initParticles() {
    particles = [];
    const particleColor = getCssVariable('--bg-canvas-particle-color');

    for (let i = 0; i < particleCount; i++) {
        const radius = Math.random() * 2 + 1; // Size between 1 and 3
        const x = Math.random() * (canvas.width - radius * 2) + radius;
        const y = Math.random() * (canvas.height - radius * 2) + radius;
        const dx = (Math.random() - 0.5) * 0.8; // Random velocity x (-0.4 to 0.4)
        const dy = (Math.random() - 0.5) * 0.8; // Random velocity y (-0.4 to 0.4)
        particles.push(new Particle(x, y, dx, dy, radius, particleColor));
    }
    console.log("Background particles initialized.");
}

function connectParticles() {
    const lineColor = getCssVariable('--bg-canvas-line-color');
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 0.5; // Thin lines

    for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) { // Start j from i+1 to avoid duplicates and self-connection
            const dx = particles[i].x - particles[j].x;
            const dy = particles[i].y - particles[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < connectDistance) {
                // Opacity based on distance
                const opacity = 1 - (distance / connectDistance);
                ctx.globalAlpha = opacity * 0.5; // Make lines even fainter, adjust base multiplier

                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(particles[j].x, particles[j].y);
                ctx.stroke();
                ctx.closePath();

                 ctx.globalAlpha = 1.0; // Reset global alpha
            }
        }
    }
}

function animate() {
    animationFrameId = requestAnimationFrame(animate); // Loop
    ctx.clearRect(0, 0, canvas.width, canvas.height); // Clear canvas

    // Update and draw particles
    particles.forEach(particle => {
        particle.update(); // Pass deltaTime here if calculated
        particle.draw();
    });

    // Connect nearby particles
    connectParticles();
}

// --- Resize Handling ---
function resizeCanvas() {
    // Debounce resize slightly? Optional.
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    console.log("Resizing background canvas:", canvas.width, "x", canvas.height);
    // Re-initialize particles to fit new size and prevent clumping/gaps
    initParticles();
}

// --- Theme Change Handling ---
// Update particle/line colors if theme changes
function updateThemeColors() {
    console.log("Updating background theme colors");
    const particleColor = getCssVariable('--bg-canvas-particle-color');
    const lineColor = getCssVariable('--bg-canvas-line-color'); // Re-fetch line color too
    particles.forEach(p => p.color = particleColor);
    // Line color is set dynamically in connectParticles()
}

// Use MutationObserver to detect body class changes (theme switch)
const observer = new MutationObserver(mutations => {
    mutations.forEach(mutation => {
        if (mutation.attributeName === 'class') {
            updateThemeColors();
        }
    });
});
observer.observe(document.body, { attributes: true });


// --- Initialization ---
window.addEventListener('resize', resizeCanvas);

// Initial setup
resizeCanvas(); // Set initial size and create particles
animate(); // Start animation loop

// Ensure initial colors are correct after potential theme load delay
setTimeout(updateThemeColors, 50); // Short delay to ensure CSS vars are applied