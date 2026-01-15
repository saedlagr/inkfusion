/**
 * InkFusion Website - Interactive JavaScript
 * Premium scroll animations, before/after slider, and interactions
 */

// ================================================
// Configuration
// ================================================

const CONFIG = {
    frameCount: 41,
    frameFolder: 'fixed frames',
    framePrefix: 'ezgif-frame-',
    frameExtension: '.jpg',
    scrollAnimationHeight: 3, // viewport heights
    preloadBatch: 20
};

// ================================================
// Utility Functions
// ================================================

const debounce = (func, wait) => {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

const lerp = (start, end, factor) => start + (end - start) * factor;

const getFramePath = (frameNumber) => {
    const paddedNumber = String(frameNumber).padStart(3, '0');
    const folder = encodeURIComponent(CONFIG.frameFolder);
    return `${folder}/${CONFIG.framePrefix}${paddedNumber}${CONFIG.frameExtension}`;
};

// ================================================
// Loader
// ================================================

class Loader {
    constructor() {
        this.element = document.getElementById('loader');
        this.imagesLoaded = 0;
        this.totalImages = 0;
    }

    hide() {
        setTimeout(() => {
            this.element.classList.add('hidden');
            document.body.style.overflow = '';
        }, 500);
    }

    updateProgress(loaded, total) {
        this.imagesLoaded = loaded;
        this.totalImages = total;
    }
}

// ================================================
// Navigation
// ================================================

class Navigation {
    constructor() {
        this.nav = document.getElementById('nav');
        this.toggle = document.getElementById('navToggle');
        this.mobileMenu = document.getElementById('mobileMenu');
        this.scrolled = false;

        this.init();
    }

    init() {
        window.addEventListener('scroll', debounce(() => this.onScroll(), 10));
        this.toggle?.addEventListener('click', () => this.toggleMobileMenu());

        // Close mobile menu on link click
        this.mobileMenu?.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => this.closeMobileMenu());
        });

        // Close on escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeMobileMenu();
        });
    }

    onScroll() {
        const scrolled = window.scrollY > 50;
        if (scrolled !== this.scrolled) {
            this.scrolled = scrolled;
            this.nav?.classList.toggle('scrolled', scrolled);
        }
    }

    toggleMobileMenu() {
        this.toggle?.classList.toggle('active');
        this.mobileMenu?.classList.toggle('active');
        document.body.style.overflow = this.mobileMenu?.classList.contains('active') ? 'hidden' : '';
    }

    closeMobileMenu() {
        this.toggle?.classList.remove('active');
        this.mobileMenu?.classList.remove('active');
        document.body.style.overflow = '';
    }
}

// ================================================
// Hero Scroll Animation (Frame Sequence)
// ================================================

class ScrollAnimation {
    constructor() {
        this.canvas = document.getElementById('scrollCanvas');
        this.ctx = this.canvas?.getContext('2d');
        this.hero = document.querySelector('.hero');
        this.animationWrapper = document.querySelector('.hero-animation-wrapper');
        this.progressBar = document.getElementById('frameProgressBar');

        this.frames = [];
        this.currentFrame = 0;
        this.targetFrame = 0;
        this.isLoaded = false;
        this.rafId = null;

        if (this.canvas && this.ctx) {
            this.init();
        }
    }

    async init() {
        // Set initial canvas size
        this.setCanvasSize();

        // Start preloading frames
        await this.preloadFrames();

        this.setupEventListeners();
        this.render();
        this.isLoaded = true;

        // Initial scroll check
        this.onScroll();
    }

    setCanvasSize() {
        if (!this.canvas || !this.animationWrapper) return;

        // Set canvas to match wrapper size
        const wrapper = this.animationWrapper;
        const rect = wrapper.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;

        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // Scale context for high DPI
        this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        // Store display dimensions
        this.displayWidth = rect.width;
        this.displayHeight = rect.height;
    }

    async preloadFrames() {
        const loadPromises = [];
        let loadedCount = 0;

        for (let i = 1; i <= CONFIG.frameCount; i++) {
            const promise = new Promise((resolve) => {
                const img = new Image();
                img.onload = () => {
                    this.frames[i - 1] = img;
                    loadedCount++;

                    // Draw first frame as soon as it loads
                    if (i === 1) {
                        this.drawFrame(0);
                    }
                    resolve();
                };
                img.onerror = () => {
                    console.warn(`Failed to load frame ${i}`);
                    resolve();
                };
                img.src = getFramePath(i);
            });
            loadPromises.push(promise);
        }

        await Promise.all(loadPromises);
        console.log(`Loaded ${loadedCount} frames`);
    }

    setupEventListeners() {
        window.addEventListener('scroll', () => this.onScroll(), { passive: true });
        window.addEventListener('resize', debounce(() => {
            this.setCanvasSize();
            this.drawFrame(this.currentFrame);
        }, 100));
    }

    onScroll() {
        if (!this.hero) return;

        const rect = this.hero.getBoundingClientRect();
        const heroHeight = this.hero.offsetHeight;
        const windowHeight = window.innerHeight;

        // Calculate scroll progress through the hero section
        // The hero is 400vh tall, so we scroll through 300vh worth of animation
        const scrolled = -rect.top;
        const scrollRange = heroHeight - windowHeight;
        const progress = clamp(scrolled / scrollRange, 0, 1);

        // Map progress to frame index
        this.targetFrame = Math.floor(progress * (CONFIG.frameCount - 1));

        // Update progress bar
        if (this.progressBar) {
            this.progressBar.style.width = `${progress * 100}%`;
        }
    }

    render() {
        // Smooth interpolation using lerp for fluid animation
        const smoothFactor = 0.08; // Lower = smoother but slower response

        if (Math.abs(this.currentFrame - this.targetFrame) > 0.01) {
            this.currentFrame = lerp(this.currentFrame, this.targetFrame, smoothFactor);
            this.drawFrame(Math.round(this.currentFrame));
        }

        this.rafId = requestAnimationFrame(() => this.render());
    }

    drawFrame(frameIndex) {
        const frame = this.frames[frameIndex];
        if (!frame || !this.ctx || !this.canvas) return;

        const displayWidth = this.displayWidth || this.canvas.width;
        const displayHeight = this.displayHeight || this.canvas.height;

        // Clear canvas
        this.ctx.clearRect(0, 0, displayWidth, displayHeight);

        // Calculate dimensions to cover the canvas area
        const imgAspect = frame.width / frame.height;
        const canvasAspect = displayWidth / displayHeight;

        let drawWidth, drawHeight, x, y;

        if (imgAspect > canvasAspect) {
            // Image is wider - fit to height, crop sides
            drawHeight = displayHeight;
            drawWidth = drawHeight * imgAspect;
            x = (displayWidth - drawWidth) / 2;
            y = 0;
        } else {
            // Image is taller - fit to width, crop top/bottom
            drawWidth = displayWidth;
            drawHeight = drawWidth / imgAspect;
            x = 0;
            y = (displayHeight - drawHeight) / 2;
        }

        this.ctx.drawImage(frame, x, y, drawWidth, drawHeight);
    }
}

// ================================================
// Before/After Slider
// ================================================

class BeforeAfterSlider {
    constructor() {
        this.wrapper = document.querySelector('.before-after-wrapper');
        this.slider = document.getElementById('beforeAfterSlider');
        this.beforeImage = document.querySelector('.before-image');

        this.isDragging = false;
        this.position = 50;

        if (this.wrapper && this.slider && this.beforeImage) {
            this.init();
        }
    }

    init() {
        // Mouse events
        this.slider.addEventListener('mousedown', (e) => this.startDrag(e));
        document.addEventListener('mousemove', (e) => this.onDrag(e));
        document.addEventListener('mouseup', () => this.endDrag());

        // Touch events
        this.slider.addEventListener('touchstart', (e) => this.startDrag(e), { passive: true });
        document.addEventListener('touchmove', (e) => this.onDrag(e), { passive: true });
        document.addEventListener('touchend', () => this.endDrag());

        // Click on wrapper to move slider
        this.wrapper.addEventListener('click', (e) => this.onClick(e));

        // Keyboard support
        this.slider.setAttribute('tabindex', '0');
        this.slider.setAttribute('role', 'slider');
        this.slider.setAttribute('aria-valuenow', this.position);
        this.slider.setAttribute('aria-valuemin', '0');
        this.slider.setAttribute('aria-valuemax', '100');
        this.slider.addEventListener('keydown', (e) => this.onKeydown(e));
    }

    startDrag(e) {
        this.isDragging = true;
        this.wrapper.style.cursor = 'ew-resize';
    }

    endDrag() {
        this.isDragging = false;
        this.wrapper.style.cursor = '';
    }

    onDrag(e) {
        if (!this.isDragging) return;

        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        this.updatePosition(clientX);
    }

    onClick(e) {
        if (e.target === this.slider || this.slider.contains(e.target)) return;
        this.updatePosition(e.clientX);
    }

    onKeydown(e) {
        let newPosition = this.position;

        switch (e.key) {
            case 'ArrowLeft':
                newPosition = Math.max(0, this.position - 2);
                break;
            case 'ArrowRight':
                newPosition = Math.min(100, this.position + 2);
                break;
            default:
                return;
        }

        e.preventDefault();
        this.setPosition(newPosition);
    }

    updatePosition(clientX) {
        const rect = this.wrapper.getBoundingClientRect();
        const x = clientX - rect.left;
        const percentage = clamp((x / rect.width) * 100, 0, 100);
        this.setPosition(percentage);
    }

    setPosition(percentage) {
        this.position = percentage;
        this.slider.style.left = `${percentage}%`;
        this.beforeImage.style.clipPath = `inset(0 ${100 - percentage}% 0 0)`;
        this.slider.setAttribute('aria-valuenow', Math.round(percentage));
    }
}

// ================================================
// Animated Stats Counter
// ================================================

class StatsCounter {
    constructor() {
        this.stats = document.querySelectorAll('.stat-number');
        this.observed = new Set();

        if (this.stats.length > 0) {
            this.init();
        }
    }

    init() {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.observed.has(entry.target)) {
                    this.observed.add(entry.target);
                    this.animateNumber(entry.target);
                }
            });
        }, { threshold: 0.5 });

        this.stats.forEach(stat => observer.observe(stat));
    }

    animateNumber(element) {
        const target = parseInt(element.dataset.target, 10);
        const duration = 2000;
        const startTime = performance.now();

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = Math.floor(easeOut * target);

            element.textContent = current;

            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        requestAnimationFrame(animate);
    }
}

// ================================================
// Fade In Animation
// ================================================

class FadeInAnimation {
    constructor() {
        this.elements = document.querySelectorAll('.service-card, .about-content > *, .contact-content > *');
        this.init();
    }

    init() {
        this.elements.forEach(el => el.classList.add('fade-in'));

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        });

        this.elements.forEach(el => observer.observe(el));
    }
}

// ================================================
// Contact Form
// ================================================

class ContactForm {
    constructor() {
        this.form = document.getElementById('contactForm');

        if (this.form) {
            this.init();
        }
    }

    init() {
        this.form.addEventListener('submit', (e) => this.onSubmit(e));
    }

    onSubmit(e) {
        e.preventDefault();

        const formData = new FormData(this.form);
        const data = Object.fromEntries(formData);

        // Build mailto link
        const subject = `InkFusion Inquiry: ${data.service || 'General'}`;
        const body = `Name: ${data.name}
Email: ${data.email}
Phone: ${data.phone || 'Not provided'}
Service: ${data.service || 'Not specified'}

Message:
${data.message || 'No message provided'}`;

        const mailtoLink = `mailto:mattm@inkfusionwraps.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        // Open mail client
        window.location.href = mailtoLink;

        // Show feedback
        this.showFeedback('Opening your email client...');
    }

    showFeedback(message) {
        const btn = this.form.querySelector('button[type="submit"]');
        const originalText = btn.textContent;

        btn.textContent = message;
        btn.disabled = true;

        setTimeout(() => {
            btn.textContent = originalText;
            btn.disabled = false;
        }, 3000);
    }
}

// ================================================
// Smooth Scroll
// ================================================

class SmoothScroll {
    constructor() {
        this.init();
    }

    init() {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                const href = anchor.getAttribute('href');
                if (href === '#') return;

                const target = document.querySelector(href);
                if (target) {
                    e.preventDefault();
                    const navHeight = document.getElementById('nav')?.offsetHeight || 0;
                    const targetPosition = target.getBoundingClientRect().top + window.scrollY - navHeight;

                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }
}

// ================================================
// Initialize Everything
// ================================================

document.addEventListener('DOMContentLoaded', () => {
    const loader = new Loader();

    // Initialize components
    const navigation = new Navigation();
    const scrollAnimation = new ScrollAnimation();
    const beforeAfterSlider = new BeforeAfterSlider();
    const statsCounter = new StatsCounter();
    const fadeInAnimation = new FadeInAnimation();
    const contactForm = new ContactForm();
    const smoothScroll = new SmoothScroll();

    // Hide loader after initial content is ready
    window.addEventListener('load', () => {
        loader.hide();
    });

    // Fallback: hide loader after timeout
    setTimeout(() => {
        loader.hide();
    }, 5000);
});

// ================================================
// Performance: Pause animations when not visible
// ================================================

document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Pause heavy operations
    } else {
        // Resume operations
    }
});
