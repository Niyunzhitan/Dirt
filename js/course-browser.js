(function () {
  "use strict";

  // 课程浏览器独立管理课时切换、课件横向阅读和进度条拖动。
  // 这里使用 window 命名空间而不是 import/export，是为了让根目录 index.html 在 file:// 下也能直接打开。
  window.NiyunCourseBrowser = {
    create(dependencies) {
      const { $, $$, escapeHtml, safeResourceUrl, prefersReducedMotion, mediaConfig } = dependencies;
      let courses = [];
      let activeCourse = null;
      let activeCourseSlideIndex = 0;
      const courseSlideMarkupCache = new Map();
      let courseRenderRequest = 0;
      let courseSlideRequest = 0;

      function configureCourseLink(link, value, options = {}) {
        if (!link) return;
        const resourceUrl = safeResourceUrl(value);
        link.hidden = !resourceUrl;
        if (!resourceUrl) {
          link.removeAttribute("href");
          return;
        }
        link.href = resourceUrl;
        if (options.downloadName) link.setAttribute("download", options.downloadName);
        else link.removeAttribute("download");
        if (options.openInNewTab) {
          link.target = "_blank";
          link.rel = "noopener";
        } else {
          link.removeAttribute("target");
          link.removeAttribute("rel");
        }
      }

      function configureCoursePackLinks() {
        const pack = mediaConfig?.coursePack || {};
        configureCourseLink($("#courseGuideLink"), pack.guideUrl, { downloadName: pack.guideFileName || "封泥教案与学习单.docx" });
        const recapVideo = $("#courseRecapVideo");
        const recapVideoUrl = safeResourceUrl(pack.recapVideoUrl);
        if (recapVideo && recapVideoUrl) {
          recapVideo.src = recapVideoUrl;
          recapVideo.hidden = false;
        } else if (recapVideo) {
          recapVideo.hidden = true;
          recapVideo.removeAttribute("src");
        }
      }

      function courseLessonLabel(course) {
        const lesson = Number(course?.lesson) || 1;
        const numeral = ["一", "二", "三"][lesson - 1] || String(lesson);
        return `第${numeral}课时`;
      }

      function courseSlideCount(course = activeCourse) {
        return Math.max(0, Number(course?.slideCount) || 0);
      }

      function courseSlideAnchors(viewport = $("#courseSlideViewport")) {
        if (!viewport) return [];
        const viewportRect = viewport.getBoundingClientRect();
        return $$(".course-slide", $("#courseSlideTrack")).map((panel) => {
          const panelRect = panel.getBoundingClientRect();
          return panelRect.left - viewportRect.left + viewport.scrollLeft;
        });
      }

      function syncCourseLessonPanelHeight() {
        const panel = $(".course-lesson-panel");
        const content = $("#courseScroll");
        if (!panel || !content) return;
        if (window.matchMedia("(max-width: 47.5rem)").matches) {
          panel.style.removeProperty("min-height");
          return;
        }
        panel.style.minHeight = `${Math.ceil(content.getBoundingClientRect().height)}px`;
      }

      async function prepareCourseSlide(index) {
        const panels = $$(".course-slide", $("#courseSlideTrack"));
        const image = panels[index]?.querySelector("img");
        if (!image) return;
        if (!image.complete) {
          await new Promise((resolve) => {
            image.addEventListener("load", resolve, { once: true });
            image.addEventListener("error", resolve, { once: true });
          });
        }
        if (image.decode) await image.decode().catch(() => {});
      }

      async function updateCourseSlideState(index, behavior = "smooth") {
        const count = courseSlideCount();
        if (!count || !activeCourse) return;
        const nextIndex = Math.max(0, Math.min(index, count - 1));
        const requestId = ++courseSlideRequest;
        await prepareCourseSlide(nextIndex);
        // 用户快速切换课件时，旧课件的图片可能晚一步加载；只接受最后一次请求的结果。
        if (requestId !== courseSlideRequest || !activeCourse) return;
        activeCourseSlideIndex = nextIndex;
        const panels = $$(".course-slide", $("#courseSlideTrack"));
        panels.forEach((panel, panelIndex) => panel.toggleAttribute("data-current", panelIndex === activeCourseSlideIndex));
        const viewport = $("#courseSlideViewport");
        const targetLeft = courseSlideAnchors(viewport)[activeCourseSlideIndex];
        if (viewport && Number.isFinite(targetLeft)) {
          viewport.scrollTo({ left: targetLeft, behavior: prefersReducedMotion() ? "auto" : behavior });
        }
        $("#courseSlideStatus").innerHTML = `<span>${escapeHtml(courseLessonLabel(activeCourse))}</span><b>${String(activeCourseSlideIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}</b>`;
        $("#courseSlidePrev").disabled = activeCourseSlideIndex === 0;
        $("#courseSlideNext").disabled = activeCourseSlideIndex === count - 1;
      }

      function getCourseSlideMarkup(course) {
        const count = Number(course.slideCount) || 0;
        const basePath = String(course.slideBasePath || "").replace(/\/$/, "");
        if (courseSlideMarkupCache.has(course.id)) return courseSlideMarkupCache.get(course.id);
        const markup = count && basePath
          ? Array.from({ length: count }, (_, index) => {
              const number = String(index + 1).padStart(2, "0");
              const source = safeResourceUrl(`${basePath}/slide-${number}.webp`);
              return `<figure class="course-slide" data-course-slide="${index}"><img src="${escapeHtml(source)}" alt="${escapeHtml(courseLessonLabel(course))}课件第 ${index + 1} 页" loading="eager" decoding="async" draggable="false"></figure>`;
            }).join("")
          : '<div class="empty-state"><strong>课件预览暂不可用</strong><p>请点击下方按钮打开原始 PDF。</p></div>';
        courseSlideMarkupCache.set(course.id, markup);
        return markup;
      }

      async function renderCourseSlides(course) {
        const track = $("#courseSlideTrack");
        const viewport = $("#courseSlideViewport");
        if (!track || !viewport) return;
        const requestId = ++courseRenderRequest;
        courseSlideRequest += 1;
        // 先在临时容器中加载首张图，避免切换课时时页面短暂出现空白或旧画面。
        const staging = document.createElement("div");
        staging.innerHTML = getCourseSlideMarkup(course);
        const firstImage = staging.querySelector(".course-slide img");
        if (firstImage && !firstImage.complete) {
          await new Promise((resolve) => {
            firstImage.addEventListener("load", resolve, { once: true });
            firstImage.addEventListener("error", resolve, { once: true });
          });
        }
        if (firstImage?.decode) await firstImage.decode().catch(() => {});
        if (requestId !== courseRenderRequest) return;
        activeCourse = course;
        activeCourseSlideIndex = 0;
        track.replaceChildren(...Array.from(staging.children));
        viewport.style.setProperty("--course-slide-width", `${viewport.clientWidth}px`);
        viewport.scrollTo({ left: 0, behavior: "auto" });
        $("#courseSlideProgress").style.transform = "scaleX(0)";
        $("#courseSlideProgressTrack")?.setAttribute("aria-valuenow", "0");
        await updateCourseSlideState(0, "auto");
        window.requestAnimationFrame(() => viewport.scrollTo({ left: 0, behavior: "auto" }));
      }

      function selectCourse(id, options = {}) {
        const course = courses.find((item) => item.id === id) || courses[0];
        if (!course) return;
        $("#courseMeta").textContent = `第 ${course.lesson} 课 · ${course.duration}`;
        const lessonProgress = $("#courseLessonProgress");
        if (lessonProgress) lessonProgress.textContent = `${String(course.lesson).padStart(2, "0")} / ${String(courses.length || 3).padStart(2, "0")}`;
        $("#courseScrollTitle").textContent = course.title;
        $("#courseDescription").textContent = course.description;
        $$(`[data-course-id]`).forEach((button) => {
          const active = button.dataset.courseId === course.id;
          button.classList.toggle("active", active);
          if (active) {
            button.classList.remove("is-switching");
            window.requestAnimationFrame(() => button.classList.add("is-switching"));
            window.setTimeout(() => button.classList.remove("is-switching"), 240);
          }
          button.setAttribute("aria-selected", String(active));
          button.tabIndex = active ? 0 : -1;
        });
        const resourceLink = $("#courseResourceLink");
        const isPdf = String(course.resourceType || "").toUpperCase() === "PDF";
        resourceLink.textContent = isPdf ? "打开原始 PDF" : "下载原始 PPTX";
        configureCourseLink(resourceLink, course.resourceUrl, {
          downloadName: isPdf ? "" : course.resourceFileName,
          openInNewTab: isPdf
        });
        renderCourseSlides(course);
        if (options.scrollToContent) {
          window.requestAnimationFrame(() => {
            $("#courseScroll")?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
          });
        }
      }

      function renderCourses(items) {
        courses = items;
        $("#courseLessonTabs").innerHTML = items.map((course, index) => {
          const label = Number(course.lesson) === 3 ? "手绘实践" : course.title.split("：")[0];
          return `<button type="button" role="tab" aria-selected="${index === 0}" aria-controls="courseSlideViewport" data-course-id="${escapeHtml(course.id)}" tabindex="${index === 0 ? 0 : -1}"><span class="card-index">0${Number(course.lesson) || 0}</span><strong>${escapeHtml(label)}</strong><small>${escapeHtml(course.duration)}</small></button>`;
        }).join("");
        configureCoursePackLinks();
        selectCourse(items[0]?.id);
        syncCourseLessonPanelHeight();
      }

      function initCourseScroll() {
        const viewport = $("#courseSlideViewport");
        const progressTrack = $("#courseSlideProgressTrack");
        const tabs = $("#courseLessonTabs");
        if (!viewport || !progressTrack || !tabs) return;
        let dragging = false;
        let dragStart = 0;
        let scrollStart = 0;

        function syncCourseSlideFromScroll() {
          const panels = $$(".course-slide", $("#courseSlideTrack"));
          if (!panels.length) return;
          const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          const scrollRatio = maxScroll > 0 ? viewport.scrollLeft / maxScroll : 0;
          const percent = Math.min(100, Math.max(0, scrollRatio * 100));
          $("#courseSlideProgress").style.transform = `scaleX(${scrollRatio})`;
          progressTrack.setAttribute("aria-valuenow", String(Math.round(percent)));
          progressTrack.setAttribute("aria-valuetext", `课件浏览位置 ${Math.round(percent)}%`);
          const anchors = courseSlideAnchors(viewport);
          const nextIndex = anchors.findIndex((anchor) => Math.abs(anchor - viewport.scrollLeft) <= 2);
          const count = panels.length;
          if (nextIndex < 0) {
            activeCourseSlideIndex = -1;
            panels.forEach((panel) => panel.removeAttribute("data-current"));
            $("#courseSlideStatus").innerHTML = `<span>${escapeHtml(courseLessonLabel(activeCourse))}</span><b>-- / ${String(count).padStart(2, "0")}</b>`;
            $("#courseSlidePrev").disabled = viewport.scrollLeft <= 1;
            $("#courseSlideNext").disabled = viewport.scrollLeft >= maxScroll - 1;
            return;
          }
          if (nextIndex === activeCourseSlideIndex) return;
          activeCourseSlideIndex = nextIndex;
          panels.forEach((panel, panelIndex) => panel.toggleAttribute("data-current", panelIndex === nextIndex));
          $("#courseSlideStatus").innerHTML = `<span>${escapeHtml(courseLessonLabel(activeCourse))}</span><b>${String(nextIndex + 1).padStart(2, "0")} / ${String(count).padStart(2, "0")}</b>`;
          $("#courseSlidePrev").disabled = nextIndex === 0;
          $("#courseSlideNext").disabled = nextIndex === count - 1;
        }

        function setCourseScrollPercent(percent) {
          const clamped = Math.min(100, Math.max(0, percent));
          const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          viewport.scrollLeft = maxScroll * clamped / 100;
        }

        function setCourseScrollFromPointer(event) {
          const bounds = progressTrack.getBoundingClientRect();
          const percent = bounds.width > 0 ? ((event.clientX - bounds.left) / bounds.width) * 100 : 0;
          setCourseScrollPercent(percent);
        }

        function moveToCourseAnchor(direction) {
          const anchors = courseSlideAnchors(viewport);
          const current = viewport.scrollLeft;
          const tolerance = 4;
          const targetIndex = direction > 0
            ? anchors.findIndex((anchor) => anchor > current + tolerance)
            : (() => {
                for (let index = anchors.length - 1; index >= 0; index -= 1) {
                  if (anchors[index] < current - tolerance) return index;
                }
                return -1;
              })();
          if (targetIndex >= 0) updateCourseSlideState(targetIndex);
        }
        tabs.addEventListener("click", (event) => {
          const button = event.target.closest("[data-course-id]");
          if (button) selectCourse(button.dataset.courseId, { scrollToContent: true });
        });
        tabs.addEventListener("keydown", (event) => {
          if (!["ArrowLeft", "ArrowRight"].includes(event.key)) return;
          event.preventDefault();
          const tabButtons = $$(`[data-course-id]`, tabs);
          const current = tabButtons.findIndex((button) => button.getAttribute("aria-selected") === "true");
          const next = (current + (event.key === "ArrowRight" ? 1 : -1) + tabButtons.length) % tabButtons.length;
          tabButtons[next].focus();
          selectCourse(tabButtons[next].dataset.courseId, { scrollToContent: true });
        });
        $("#courseSlidePrev").addEventListener("click", () => moveToCourseAnchor(-1));
        $("#courseSlideNext").addEventListener("click", () => moveToCourseAnchor(1));
        viewport.addEventListener("keydown", (event) => {
          if (event.key === "ArrowLeft") { event.preventDefault(); moveToCourseAnchor(-1); }
          if (event.key === "ArrowRight") { event.preventDefault(); moveToCourseAnchor(1); }
          if (event.key === "Home") { event.preventDefault(); updateCourseSlideState(0); }
          if (event.key === "End") { event.preventDefault(); updateCourseSlideState(courseSlideCount() - 1); }
        });
        viewport.addEventListener("scroll", syncCourseSlideFromScroll, { passive: true });
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
        progressTrack.addEventListener("pointerdown", (event) => {
          if (event.button !== 0) return;
          progressTrack.setPointerCapture(event.pointerId);
          progressTrack.classList.add("is-dragging");
          setCourseScrollFromPointer(event);
        });
        progressTrack.addEventListener("pointermove", (event) => {
          if (progressTrack.hasPointerCapture(event.pointerId)) setCourseScrollFromPointer(event);
        });
        const stopProgressDrag = (event) => {
          if (progressTrack.hasPointerCapture(event.pointerId)) progressTrack.releasePointerCapture(event.pointerId);
          progressTrack.classList.remove("is-dragging");
        };
        progressTrack.addEventListener("pointerup", stopProgressDrag);
        progressTrack.addEventListener("pointercancel", stopProgressDrag);
        progressTrack.addEventListener("keydown", (event) => {
          const maxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          const currentPercent = maxScroll > 0 ? viewport.scrollLeft / maxScroll * 100 : 0;
          const steps = { ArrowLeft: -2, ArrowDown: -2, ArrowRight: 2, ArrowUp: 2, PageUp: -10, PageDown: 10 };
          if (event.key === "Home" || event.key === "End") {
            event.preventDefault();
            setCourseScrollPercent(event.key === "Home" ? 0 : 100);
          } else if (Object.hasOwn(steps, event.key)) {
            event.preventDefault();
            setCourseScrollPercent(currentPercent + steps[event.key]);
          }
        });
        window.addEventListener("resize", () => {
          const oldMaxScroll = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
          const oldRatio = oldMaxScroll > 0 ? viewport.scrollLeft / oldMaxScroll : 0;
          viewport.style.setProperty("--course-slide-width", `${viewport.clientWidth}px`);
          window.requestAnimationFrame(() => setCourseScrollPercent(oldRatio * 100));
          syncCourseLessonPanelHeight();
        });
      }

      return { renderCourses, initCourseScroll };
    }
  };
}());
