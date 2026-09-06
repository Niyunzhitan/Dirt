(function () {
  "use strict";

  window.NiyunScrollStory = {
    create(dependencies) {
      const { $, $$, escapeHtml, prefersReducedMotion } = dependencies;

      function init() {
        const viewport = $("#scrollViewport");
        if (!viewport) return;
        const track = $("#scrollTrack");
        const panels = $$(".scroll-panel", viewport);
        const previous = $("#scrollPrev");
        const next = $("#scrollNext");
        const progress = $("#scrollProgress");
        const status = $("#scrollStatus");
        $$(`[data-scroll-image]`, viewport).forEach((illustration) => {
          const imagePath = illustration.dataset.scrollImage?.trim();
          if (!imagePath) return;
          const image = document.createElement("img");
          image.className = "scroll-custom-image";
          image.alt = illustration.getAttribute("aria-label") || "数字手卷配图";
          image.draggable = false;
          image.loading = "lazy";
          image.decoding = "async";
          image.src = imagePath;
          image.addEventListener("load", () => {
            image.classList.add("loaded");
            illustration.classList.add("has-custom-image");
          }, { once: true });
          image.addEventListener("error", () => image.remove(), { once: true });
          illustration.prepend(image);
        });
        let dragging = false;
        let dragStart = 0;
        let scrollStart = 0;
        let chapterStops = [];

        function refreshChapterStops() {
          const firstPanel = panels[0];
          const lastPanel = panels[panels.length - 1];
          track.style.paddingInlineStart = `${Math.max(0, (viewport.clientWidth - firstPanel.offsetWidth) / 2)}px`;
          track.style.paddingInlineEnd = `${Math.max(0, (viewport.clientWidth - lastPanel.offsetWidth) / 2)}px`;
          const max = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          const viewportRect = viewport.getBoundingClientRect();
          chapterStops = panels.map((panel) => {
            const panelRect = panel.getBoundingClientRect();
            const panelStart = panelRect.left - viewportRect.left + viewport.scrollLeft;
            const centered = panelStart - (viewport.clientWidth - panelRect.width) / 2;
            return Math.max(0, Math.min(centered, max));
          });
        }

        function updateStory() {
          const max = Math.max(1, viewport.scrollWidth - viewport.clientWidth);
          const ratio = Math.min(1, viewport.scrollLeft / max);
          progress.style.transform = `scaleX(${Math.max(.02, ratio)})`;
          const viewportCenter = viewport.scrollLeft + viewport.clientWidth / 2;
          const activeIndex = panels.reduce((closest, panel, index) => {
            const panelCenter = panel.offsetLeft + panel.offsetWidth / 2;
            const closestCenter = panels[closest].offsetLeft + panels[closest].offsetWidth / 2;
            return Math.abs(panelCenter - viewportCenter) < Math.abs(closestCenter - viewportCenter) ? index : closest;
          }, 0);
          status.innerHTML = `<span>${escapeHtml(panels[activeIndex].dataset.scrollTitle || "展卷")}</span><b>${String(activeIndex + 1).padStart(2, "0")} / ${String(panels.length).padStart(2, "0")}</b>`;
          panels.forEach((panel, index) => panel.toggleAttribute("data-current", index === activeIndex));
          previous.disabled = viewport.scrollLeft <= 1;
          next.disabled = viewport.scrollLeft >= max - 1;
        }

        function moveToChapter(direction) {
          const tolerance = 4;
          const current = viewport.scrollLeft;
          const target = direction > 0
            ? chapterStops.find((stop) => stop > current + tolerance)
            : [...chapterStops].reverse().find((stop) => stop < current - tolerance);
          if (target !== undefined) viewport.scrollTo({ left: target, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        }

        function moveToEdge(edge) {
          viewport.scrollTo({ left: edge === "start" ? 0 : viewport.scrollWidth, behavior: prefersReducedMotion() ? "auto" : "smooth" });
        }

        previous.addEventListener("click", () => moveToChapter(-1));
        next.addEventListener("click", () => moveToChapter(1));
        viewport.addEventListener("scroll", updateStory, { passive: true });
        viewport.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); moveToChapter(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); moveToChapter(1); }
          if (event.key === "Home") { event.preventDefault(); moveToEdge("start"); }
          if (event.key === "End") { event.preventDefault(); moveToEdge("end"); }
        });
        viewport.addEventListener("wheel", (event) => {
          if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
          const atStart = viewport.scrollLeft <= 0 && event.deltaY < 0;
          const atEnd = viewport.scrollLeft >= viewport.scrollWidth - viewport.clientWidth - 1 && event.deltaY > 0;
          if (atStart || atEnd) return;
          event.preventDefault();
          viewport.scrollLeft += event.deltaY;
        }, { passive: false });
        viewport.addEventListener("pointerdown", (event) => {
          if (event.pointerType === "touch") return;
          dragging = true;
          dragStart = event.clientX;
          scrollStart = viewport.scrollLeft;
          viewport.setPointerCapture(event.pointerId);
          viewport.classList.add("is-dragging");
        });
        viewport.addEventListener("pointermove", (event) => {
          if (dragging) viewport.scrollLeft = scrollStart - (event.clientX - dragStart);
        });
        viewport.addEventListener("pointerup", (event) => {
          dragging = false;
          viewport.releasePointerCapture(event.pointerId);
          viewport.classList.remove("is-dragging");
        });
        viewport.addEventListener("pointercancel", () => {
          dragging = false;
          viewport.classList.remove("is-dragging");
        });
        window.addEventListener("resize", () => { refreshChapterStops(); updateStory(); });
        refreshChapterStops();
        updateStory();
      }

      return { init };
    }
  };
}());
