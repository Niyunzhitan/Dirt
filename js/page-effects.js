(function () {
  "use strict";

  window.NiyunPageEffects = {
    create(dependencies) {
      const { $, $$, prefersReducedMotion, getSettings, visualEffects, motionSettingRanges } = dependencies;

      function init() {
        const pageScrollTrack = $("#pageScrollTrack");
        const pageProgressBar = $("#pageProgressBar");
        let scrollTicking = false;
        const getPageScrollRange = () => Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
        const updatePageScrollPosition = (percent) => {
          const clamped = Math.min(100, Math.max(0, percent));
          window.scrollTo({ top: getPageScrollRange() * clamped / 100, behavior: "auto" });
        };
        const updateFromPointer = (event) => {
          if (!pageScrollTrack) return;
          const bounds = pageScrollTrack.getBoundingClientRect();
          updatePageScrollPosition(bounds.width > 0 ? ((event.clientX - bounds.left) / bounds.width) * 100 : 0);
        };
        if (pageScrollTrack) {
          pageScrollTrack.addEventListener("pointerdown", (event) => {
            if (event.button !== 0) return;
            pageScrollTrack.setPointerCapture(event.pointerId);
            pageScrollTrack.classList.add("is-dragging");
            document.documentElement.classList.add("is-page-scrubbing");
            updateFromPointer(event);
          });
          pageScrollTrack.addEventListener("pointermove", (event) => { if (pageScrollTrack.hasPointerCapture(event.pointerId)) updateFromPointer(event); });
          const stopDrag = (event) => {
            if (pageScrollTrack.hasPointerCapture(event.pointerId)) pageScrollTrack.releasePointerCapture(event.pointerId);
            pageScrollTrack.classList.remove("is-dragging");
            document.documentElement.classList.remove("is-page-scrubbing");
          };
          pageScrollTrack.addEventListener("pointerup", stopDrag);
          pageScrollTrack.addEventListener("pointercancel", stopDrag);
          pageScrollTrack.addEventListener("keydown", (event) => {
            const current = getPageScrollRange() > 0 ? window.scrollY / getPageScrollRange() * 100 : 0;
            const steps = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageUp: -10, PageDown: 10 };
            if (event.key === "Home" || event.key === "End") { event.preventDefault(); updatePageScrollPosition(event.key === "Home" ? 0 : 100); }
            else if (Object.hasOwn(steps, event.key)) { event.preventDefault(); updatePageScrollPosition(current + steps[event.key]); }
          });
        }
        window.addEventListener("scroll", () => {
          if (scrollTicking) return;
          window.requestAnimationFrame(() => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const percent = docHeight > 0 ? scrollTop / docHeight * 100 : 0;
            if (pageProgressBar) {
              const clamped = Math.min(100, Math.max(0, percent));
              pageProgressBar.style.width = `${clamped}%`;
              pageScrollTrack?.setAttribute("aria-valuenow", String(Math.round(clamped)));
              pageScrollTrack?.setAttribute("aria-valuetext", clamped <= 0 ? "页面顶部" : clamped >= 100 ? "页面底部" : `页面 ${Math.round(clamped)}%`);
            }
            if (!prefersReducedMotion()) {
              const shift = Math.min(scrollTop, window.innerHeight) / window.innerHeight;
              const settings = getSettings();
              $$(`[data-parallax]`).forEach((item) => item.style.setProperty("--parallax-y", `${shift * Number(item.dataset.parallax || 0) * (settings.motionIntensity / motionSettingRanges.pageMotion.max)}px`));
            }
            scrollTicking = false;
          });
          scrollTicking = true;
        }, { passive: true });
        window.dispatchEvent(new Event("scroll"));
        document.addEventListener("click", (event) => {
          const target = event.target instanceof Element ? event.target.closest(".button, .filter-chip, .search-row button, .chat-form button, .scroll-story-controls button, .course-scroll-controls button, .quick-prompts button, .source-index-more") : null;
          if (!target) return;
          const rect = target.getBoundingClientRect();
          const ripple = document.createElement("span");
          ripple.className = "stamp-ripple";
          const size = Math.max(rect.width, rect.height);
          ripple.style.width = ripple.style.height = `${size}px`;
          ripple.style.left = `${event.clientX - rect.left - size / 2}px`;
          ripple.style.top = `${event.clientY - rect.top - size / 2}px`;
          target.appendChild(ripple);
          window.setTimeout(() => ripple.remove(), visualEffects.rippleLifetime);
        });
        document.addEventListener("pointerdown", (event) => event.target instanceof Element && event.target.closest(".course-scroll-controls button")?.classList.add("is-pressing"));
        ["pointerup", "pointercancel", "pointerleave"].forEach((name) => document.addEventListener(name, (event) => event.target instanceof Element && event.target.closest(".course-scroll-controls button")?.classList.remove("is-pressing")));

        if (window.matchMedia("(pointer: fine)").matches) {
          const cardSelector = [
            ".relic-card", ".story-card", ".knowledge-functions article", ".story-details article",
            ".course-list button", ".source-findings article", ".source-index article"
          ].join(", ");
          document.addEventListener("mousemove", (event) => {
            const card = event.target instanceof Element ? event.target.closest(cardSelector) : null;
            if (!card) return;
            const settings = getSettings();
            if (settings.tiltDegrees === 0) { card.style.transform = ""; return; }
            const rect = card.getBoundingClientRect();
            const rotateX = ((event.clientY - rect.top - rect.height / 2) / (rect.height / 2)) * -visualEffects.cardTiltDegrees;
            const rotateY = ((event.clientX - rect.left - rect.width / 2) / (rect.width / 2)) * visualEffects.cardTiltDegrees;
            card.style.transform = `perspective(${visualEffects.cardPerspective}px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-${visualEffects.cardLift}px)`;
          });
          document.addEventListener("mouseout", (event) => {
            const card = event.target instanceof Element ? event.target.closest(cardSelector) : null;
            if (card && (!event.relatedTarget || !card.contains(event.relatedTarget))) card.style.transform = "";
          });
        }

        const canvas = $("#ambientCanvas");
        if (canvas) {
          const context = canvas.getContext("2d");
          let width = canvas.width = window.innerWidth;
          let height = canvas.height = window.innerHeight;
          window.addEventListener("resize", () => { width = canvas.width = window.innerWidth; height = canvas.height = window.innerHeight; });
          const particles = Array.from({ length: visualEffects.dustMaxParticles }, () => ({
            x: Math.random() * width, y: Math.random() * height,
            size: Math.random() * visualEffects.dustSizeRange + visualEffects.dustSizeMin,
            speedX: (Math.random() - .5) * visualEffects.dustHorizontalSpeed,
            speedY: Math.random() * visualEffects.dustVerticalSpeedRange + visualEffects.dustVerticalSpeedMin,
            opacity: Math.random() * visualEffects.dustOpacityRange + visualEffects.dustOpacityMin,
            color: Math.random() < visualEffects.dustPrimaryRatio ? visualEffects.dustPrimaryColor : visualEffects.dustAccentColor
          }));
          let frameId = 0;
          let lastTime = 0;
          let visible = true;
          const animateDust = (timestamp = 0) => {
            if (document.hidden || !visible) { frameId = 0; return; }
            if (timestamp - lastTime < visualEffects.dustFrameIntervalMs) { frameId = requestAnimationFrame(animateDust); return; }
            const frameFactor = lastTime ? Math.min(2, Math.max(0, (timestamp - lastTime) / visualEffects.dustFrameIntervalMs)) : 1;
            lastTime = timestamp;
            context.clearRect(0, 0, width, height);
            const settings = getSettings();
            for (let index = 0; index < Math.min(particles.length, settings.dustQuantity); index += 1) {
              const particle = particles[index];
              const speed = visualEffects.dustBaseSpeedScale * visualEffects.dustSpeedScale * frameFactor;
              particle.x += particle.speedX * speed; particle.y += particle.speedY * speed;
              if (particle.y > height) { particle.y = -5; particle.x = Math.random() * width; }
              if (particle.x > width) particle.x = 0;
              if (particle.x < 0) particle.x = width;
              context.fillStyle = `rgba(${particle.color}, ${particle.opacity})`;
              context.beginPath(); context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2); context.fill();
            }
            frameId = requestAnimationFrame(animateDust);
          };
          new IntersectionObserver(([entry]) => {
            visible = entry.isIntersecting;
            if (visible && !document.hidden && !frameId) frameId = requestAnimationFrame(animateDust);
          }, { threshold: .01 }).observe(canvas);
          document.addEventListener("visibilitychange", () => {
            if (document.hidden && frameId) { cancelAnimationFrame(frameId); frameId = 0; }
            else if (!document.hidden && visible && !frameId) frameId = requestAnimationFrame(animateDust);
          });
          frameId = requestAnimationFrame(animateDust);
        }

        const lazyImages = $$('img[loading="lazy"]');
        if ("IntersectionObserver" in window) {
          const imageObserver = new IntersectionObserver((entries) => entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const image = entry.target;
            if (image.complete) image.classList.add("loaded");
            else image.addEventListener("load", () => image.classList.add("loaded"), { once: true });
            imageObserver.unobserve(image);
          }), { rootMargin: "50px" });
          lazyImages.forEach((image) => { if (image.complete) image.classList.add("loaded"); else imageObserver.observe(image); });
        } else lazyImages.forEach((image) => image.classList.add("loaded"));

        const heroVisualArea = $("#heroVisualArea");
        if (heroVisualArea) {
          const mascotFigure = $("#heroMascotFigure");
          const mascotSpeech = $("#heroMascotSpeech");
          const compassOuter = $(".compass-outer-ring", heroVisualArea);
          const greetings = ["你好，我是印小灵。我们一起看看两千年前的封泥吧。", "临淄、琅琊等地留下了不少封泥，我们可以从一方小泥块讲起。", "今天想了解哪一方齐鲁封泥？你可以到下面的 AI 导览中问我。"];
          let greetingIndex = 0;
          let frameId = null;
          let targetX = 0; let targetY = 0; let currentX = 0; let currentY = 0;
          const updateParallax = () => {
            currentX += (targetX - currentX) * .1; currentY += (targetY - currentY) * .1;
            if (compassOuter) compassOuter.style.transform = `translate3d(${currentX * -15}px, ${currentY * -15}px, 0)`;
            if (Math.abs(targetX - currentX) + Math.abs(targetY - currentY) > .001) frameId = requestAnimationFrame(updateParallax);
            else frameId = null;
          };
          heroVisualArea.addEventListener("mousemove", (event) => {
            if (prefersReducedMotion()) return;
            const rect = heroVisualArea.getBoundingClientRect();
            targetX = (event.clientX - rect.left) / rect.width - .5; targetY = (event.clientY - rect.top) / rect.height - .5;
            if (!frameId) frameId = requestAnimationFrame(updateParallax);
          });
          heroVisualArea.addEventListener("mouseleave", () => { targetX = 0; targetY = 0; if (!frameId) frameId = requestAnimationFrame(updateParallax); });
          mascotFigure?.addEventListener("click", () => {
            if (!mascotSpeech) return;
            greetingIndex = (greetingIndex + 1) % greetings.length;
            const text = $("span", mascotSpeech); if (text) text.textContent = greetings[greetingIndex];
            mascotSpeech.style.opacity = "1"; mascotSpeech.style.transform = "translateY(0) scale(1)";
          });
        }
      }

      return { init };
    }
  };
}());
