(function () {
  "use strict";
  window.NiyunSiteNavigation = {
    create({ $, $$, prefersReducedMotion, interfaceConfig }) {
      // 导航模块只改变滚动位置和 active 状态，不负责渲染栏目内容。
      function setMenuOpen(open) {
        const mainNav = $("#mainNav");
        const menuToggle = $("#menuToggle");
        mainNav?.classList.toggle("open", open);
        menuToggle?.setAttribute("aria-expanded", String(open));
        menuToggle?.setAttribute("aria-label", open ? "关闭导航" : "打开导航");
      }

      function getLayoutTop(element) {
        let top = 0;
        for (let current = element; current; current = current.offsetParent) top += current.offsetTop;
        return top;
      }

      function navigateToMapIndex(siteId) {
        const mapToolbar = $("#map .map-toolbar");
        if (!mapToolbar) return;
        const rootStyle = getComputedStyle(document.documentElement);
        const fontSize = Number.parseFloat(rootStyle.fontSize) || 16;
        const headerVariable = window.matchMedia("(max-width: 47.5rem)").matches ? "--layout-header-height-mobile" : "--layout-header-height";
        const headerHeight = Number.parseFloat(rootStyle.getPropertyValue(headerVariable)) * fontSize;
        window.scrollTo({ top: Math.max(0, getLayoutTop(mapToolbar) - headerHeight - 6.5 * fontSize), behavior: prefersReducedMotion() ? "auto" : "smooth" });
        window.history.pushState(null, "", "#map");
        setMenuOpen(false);
        const marker = $(`[data-site-id="${siteId}"]`);
        if (marker) window.setTimeout(() => marker.click(), 400);
      }
      function init() {
        const menuToggle = $("#menuToggle");
        const mainNav = $("#mainNav");
        menuToggle?.addEventListener("click", () => setMenuOpen(!mainNav.classList.contains("open")));
        document.addEventListener("keydown", (event) => { if (event.key === "Escape" && mainNav.classList.contains("open")) { setMenuOpen(false); menuToggle.focus(); } });
        const links = $$("#mainNav a, .footer-links a, .hero-actions a, .scroll-cue");
        links.forEach((link) => link.addEventListener("click", (event) => {
          const target = $(link.getAttribute("href"));
          if (!target) return;
          event.preventDefault();
          setMenuOpen(false);
          const offset = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
          window.scrollTo({ top: Math.max(0, getLayoutTop(target) - offset), behavior: prefersReducedMotion() ? "auto" : "smooth" });
          history.pushState(null, "", link.getAttribute("href"));
        }));
        const clock = $("#headerClock");
        const updateClock = () => { if (clock) { const now = new Date(); clock.dateTime = now.toISOString(); clock.textContent = new Intl.DateTimeFormat(interfaceConfig.clockLocale, interfaceConfig.clockFormat).format(now); } };
        updateClock();
        window.setInterval(updateClock, interfaceConfig.clockRefreshInterval);
        const navLinks = $$("#mainNav a");
        const setActiveNav = (sectionId) => navLinks.forEach((link) => {
          link.classList.toggle("active", link.getAttribute("href") === `#${sectionId}`);
        });
        const observer = new IntersectionObserver((entries) => entries.forEach((entry) => { if (entry.isIntersecting) navLinks.forEach((link) => link.classList.toggle("active", link.getAttribute("href") === `#${entry.target.id}`)); }), { rootMargin: "-35% 0px -55%" });
        $$('main section[id]').forEach((section) => observer.observe(section));
        const hero = $(".hero");
        if (hero) new IntersectionObserver(([entry]) => { if (entry.isIntersecting) setActiveNav(hero.id); }, { threshold: .55 }).observe(hero);
        const reveal = new IntersectionObserver((entries) => entries.forEach((entry) => {
          const section = entry.target;
          if (entry.isIntersecting) { section.classList.remove("is-exiting-up", "is-exiting-down"); section.classList.add("is-visible"); return; }
          section.classList.remove("is-visible");
          const above = entry.boundingClientRect.top + entry.boundingClientRect.height / 2 < window.innerHeight / 2;
          section.classList.toggle("is-exiting-up", above); section.classList.toggle("is-exiting-down", !above);
        }), { rootMargin: "-8% 0px -8%", threshold: .01 });
        $$('[data-reveal]').forEach((section) => reveal.observe(section));
      }
      return { init, setMenuOpen, getLayoutTop, navigateToMapIndex };
    }
  };
}());
