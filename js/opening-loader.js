(function () {
  "use strict";

  window.NiyunOpeningLoader = {
    create({ $ }) {
      // 开屏动画只负责展示层；正文数据加载完成后由 app.js 调用 finish() 让它退场。
      const config = {
        // “你知道吗”轮换节奏（毫秒）：改这里即可，数字越大换得越慢。
        didYouKnowIntervalMs: 3200,
        didYouKnowFadeMs: 220,
        stages: [
          { text: "正在辨识战国秦汉封泥……", progress: 15 },
          { text: "封缄受力，封泥渐生细纹……", progress: 38 },
          { text: "卷轴晃动，封泥将裂……", progress: 54 },
          { text: "展厅已开启，欢迎进入泥云智探", progress: 100 }
        ],
        stageIntervalMs: 750,
        preBreakHoldMs: 1400,
        completedHoldMs: 900,
        removeDelayMs: 1100,
        resourceReadyTimeoutMs: 1200,
        initialProgress: 8,
        progressEase: 0.12,
        progressStopThreshold: 0.2,
        particleFrameIntervalMs: 32,
        debrisCount: { finalBurst: 14 },
        mobileBreakpoint: 640,
        earlyExpandHalfWidth: { mobile: 110, desktop: 160 },
        earlyExpandRatio: 0.35,
        finalWidthRatio: { mobile: 0.86, desktop: 0.78 },
        finalExtraWidth: 96,
        contentRevealRatio: 0.4
      };

      const didYouKnowFacts = [
        "封泥不是印章，是印章按在湿泥上留下的壳。",
        "古人寄公文：捆绳、糊泥、按官印，三道关。",
        "封泥外号“简牍之锁”，是公文的一次性封条。",
        "山东临淄是封泥大户，单区就有 54 个印文品类。",
        "清代陈介祺认出了封泥，齐鲁封泥学由此重光。",
        "史书不写麋圈、橘官，封泥替它们留了名。",
        "秦印规整，汉印圆润，封泥里藏着篆书演变。",
        "拆信前先验封：印文对不对，泥面完不完整。",
        "绳痕、指纹和裂纹，是封泥留下的两千年档案。",
        "“临淄守印”相当于古代公文的防伪标签。",
        "纸张普及后，封泥成了“冷门绝学”。",
        "一枚封泥，能把古地名、官职和出土地对上号。",
        "昌乐东圈汉墓集中出土了 85 枚“菑川后府”封泥。",
        "邾国故城官署区出土封泥 821 枚、陶文 243 枚。",
        "两枚“兰陵丞印”发现于楚王陵瓮、壶附近，提示物资封缄线索。",
        "秦封泥常见田字格，西汉早期也曾短暂沿用界格。",
        "“观阳丞印”说明诸侯王国之下仍设有县级官署。",
        "同一方封泥，要分清印文地名、出土地与历史归属。"
      ];

      const loader = $("#openingLoader");
      const animationEnabled = window.localStorage.getItem("niyun-opening-animation-enabled") !== "false";
      const status = $("#openingLoaderStatus");
      const progressBar = $("#openingLoaderProgress");
      const progressPercent = $("#openingProgressPercent");
      const rollerLeft = $("#scrollRollerLeft");
      const rollerRight = $("#scrollRollerRight");
      const paperContainer = $("#scrollPaperContainer");
      const paper = paperContainer?.querySelector(".scroll-paper");
      const content = $("#scrollContent");
      const cord = $("#scrollCord");
      const seal = $("#claySealEntity");
      const cracks = $("#sealCracksSvg");
      const crackPaths = cracks ? [...cracks.querySelectorAll(".crack-path, .crack-highlight")] : [];
      const particleCanvas = $("#sealParticlesCanvas");
      const fragments = [
        [$("#fragNW"), "shatter-nw"],
        [$("#fragNE"), "shatter-ne"],
        [$("#fragSW"), "shatter-sw"],
        [$("#fragSE"), "shatter-se"]
      ];
      const didYouKnowText = $("#openingDidYouKnowText");

      let particles = [];
      let didYouKnowIndex = -1;
      let didYouKnowTimer = null;
      let didYouKnowSwitchTimer = null;
      let particleFrame = null;
      let lastParticleFrame = 0;
      let particleEngine = null;
      let currentProgress = 0;
      let targetProgress = config.initialProgress;
      let progressFrame = null;
      let stageIndex = 0;
      let intervalTimer = null;
      let fallbackTimer = null;
      let removeTimer = null;
      let cachedPaperWidth = null;
      let particlesPlayed = false;
      let pageReadyPromise = null;
      let finishPromise = null;
      let fragmentsStarted = false;

      function initParticles() {
        if (!particleCanvas) return null;
        const context = particleCanvas.getContext("2d");
        if (!context) return null;
        const width = particleCanvas.width;
        const height = particleCanvas.height;
        const centerX = width / 2;
        const centerY = height / 2;

        function wake() {
          if (!particleFrame) particleFrame = requestAnimationFrame(render);
        }

        function createDebris(count = 5, burst = false) {
          for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 45;
            const speed = burst ? 2.5 + Math.random() * 5.5 : 0.6 + Math.random() * 2.2;
            particles.push({
              x: centerX + Math.cos(angle) * distance,
              y: centerY + Math.sin(angle) * distance,
              vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2,
              vy: Math.sin(angle) * speed + (burst ? -1.5 + Math.random() * 3 : 1.2),
              gravity: 0.12,
              size: burst ? 2 + Math.random() * 5.5 : 1.2 + Math.random() * 3.5,
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 0.25,
              color: Math.random() > 0.4 ? "#8c3323" : (Math.random() > 0.5 ? "#ba5d45" : "#4a180e"),
              alpha: 1,
              decay: burst ? 0.015 + Math.random() * 0.02 : 0.02 + Math.random() * 0.03
            });
          }
          wake();
        }

        function render(timestamp = 0) {
          if (!particles.length) {
            particleFrame = null;
            return;
          }
          if (timestamp - lastParticleFrame < config.particleFrameIntervalMs) {
            particleFrame = requestAnimationFrame(render);
            return;
          }
          lastParticleFrame = timestamp;
          context.clearRect(0, 0, width, height);
          for (let index = particles.length - 1; index >= 0; index -= 1) {
            const particle = particles[index];
            particle.x += particle.vx;
            particle.y += particle.vy;
            particle.vy += particle.gravity;
            particle.rotation += particle.vRot;
            particle.alpha -= particle.decay;
            if (particle.alpha <= 0 || particle.y > height + 20) {
              particles.splice(index, 1);
              continue;
            }
            context.save();
            context.translate(particle.x, particle.y);
            context.rotate(particle.rotation);
            context.globalAlpha = Math.max(0, particle.alpha);
            context.fillStyle = particle.color;
            context.beginPath();
            context.moveTo(-particle.size, -particle.size * 0.8);
            context.lineTo(particle.size * 1.1, -particle.size * 0.6);
            context.lineTo(particle.size * 0.8, particle.size * 0.9);
            context.lineTo(-particle.size * 0.9, particle.size * 0.7);
            context.closePath();
            context.fill();
            context.restore();
          }
          particleFrame = requestAnimationFrame(render);
        }

        return { createDebris };
      }

      function nextDidYouKnowIndex() {
        if (didYouKnowFacts.length < 2) return 0;
        let nextIndex = didYouKnowIndex;
        while (nextIndex === didYouKnowIndex) {
          nextIndex = Math.floor(Math.random() * didYouKnowFacts.length);
        }
        return nextIndex;
      }

      function setDidYouKnowText(text, immediate = false) {
        if (!didYouKnowText) return;
        if (immediate) {
          didYouKnowText.textContent = text;
          didYouKnowText.classList.remove("is-switching");
          return;
        }
        if (didYouKnowSwitchTimer) window.clearTimeout(didYouKnowSwitchTimer);
        didYouKnowText.classList.add("is-switching");
        didYouKnowSwitchTimer = window.setTimeout(() => {
          didYouKnowText.textContent = text;
          didYouKnowText.classList.remove("is-switching");
          didYouKnowSwitchTimer = null;
        }, config.didYouKnowFadeMs);
      }

      function startDidYouKnow() {
        if (!didYouKnowText || !didYouKnowFacts.length) return;
        didYouKnowIndex = Math.floor(Math.random() * didYouKnowFacts.length);
        setDidYouKnowText(didYouKnowFacts[didYouKnowIndex], true);
        didYouKnowTimer = window.setInterval(() => {
          didYouKnowIndex = nextDidYouKnowIndex();
          setDidYouKnowText(didYouKnowFacts[didYouKnowIndex]);
        }, config.didYouKnowIntervalMs);
      }

      function stopDidYouKnow() {
        if (didYouKnowTimer) window.clearInterval(didYouKnowTimer);
        if (didYouKnowSwitchTimer) window.clearTimeout(didYouKnowSwitchTimer);
        didYouKnowTimer = null;
        didYouKnowSwitchTimer = null;
        didYouKnowText?.classList.remove("is-switching");
      }

      function waitForPageReady() {
        if (pageReadyPromise) return pageReadyPromise;
        const openingImages = loader ? [...loader.querySelectorAll("img")] : [];
        const imageReady = Promise.all(openingImages.map((image) => image.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              image.addEventListener("load", resolve, { once: true });
              image.addEventListener("error", resolve, { once: true });
            })));
        const timeout = new Promise((resolve) => {
          window.setTimeout(resolve, config.resourceReadyTimeoutMs);
        });
        pageReadyPromise = Promise.race([imageReady, timeout]).then(() => new Promise((resolve) => {
          window.requestAnimationFrame(() => window.requestAnimationFrame(resolve));
        }));
        return pageReadyPromise;
      }

      function updateVisuals(value) {
        if (!loader) return;
        const progress = Math.max(0, Math.min(100, value));
        if (status) {
          let visualStage = config.stages[0];
          if (progress >= 99.5) visualStage = config.stages[3];
          else if (progress >= 45) visualStage = config.stages[2];
          else if (progress >= 25) visualStage = config.stages[1];
          status.textContent = visualStage.text;
        }
        if (progressBar) progressBar.style.width = `${progress}%`;
        if (progressPercent) progressPercent.textContent = `${Math.round(progress)}%`;
        if (cord) cord.classList.toggle("cord-snapped", progress >= 55);
        if (progress >= 55 && particleEngine && !particlesPlayed) {
          particleEngine.createDebris(config.debrisCount.finalBurst, true);
          particlesPlayed = true;
        }
        // 进度不是单纯的数字：不同区间分别对应封泥裂纹、绳线断开和卷轴展开。
        if (progress < 25) {
          if (paperContainer) paperContainer.style.width = "0px";
          if (rollerLeft) rollerLeft.style.transform = "translateX(0px)";
          if (rollerRight) rollerRight.style.transform = "translateX(0px)";
          if (cracks) cracks.style.opacity = "0";
          if (seal) seal.classList.remove("shaking");
        } else if (progress < 55) {
          const crackRatio = (progress - 25) / 30;
          if (cracks) {
            cracks.style.opacity = `${Math.min(1, crackRatio * 1.4)}`;
            crackPaths.forEach((path) => { path.style.strokeDashoffset = `${180 * (1 - crackRatio)}`; });
          }
          seal?.classList.add("shaking");
        } else if (progress < 80) {
          const expandRatio = (progress - 55) / 25;
          if (cracks) cracks.style.opacity = "1";
          if (seal) {
            seal.classList.add("shaking");
            seal.style.transform = `scale(${1 - expandRatio * 0.15})`;
          }
          const maxHalfWidth = window.innerWidth < config.mobileBreakpoint ? config.earlyExpandHalfWidth.mobile : config.earlyExpandHalfWidth.desktop;
          const currentHalf = maxHalfWidth * expandRatio * config.earlyExpandRatio;
          if (paperContainer) paperContainer.style.width = `${currentHalf * 2}px`;
          if (rollerLeft) rollerLeft.style.transform = `translateX(-${currentHalf}px)`;
          if (rollerRight) rollerRight.style.transform = `translateX(${currentHalf}px)`;
        } else {
          const openRatio = (progress - 80) / 20;
          if (seal) {
            seal.classList.remove("shaking");
            seal.style.opacity = `${Math.max(0, 1 - openRatio * 2.5)}`;
            seal.style.transform = `scale(${0.85 - openRatio * 0.4})`;
          }
          if (!fragmentsStarted) {
            fragments.forEach(([fragment, className]) => fragment?.classList.add(className));
            fragmentsStarted = true;
          }
          if (!cachedPaperWidth && paper) cachedPaperWidth = paper.getBoundingClientRect().width || 704;
          const paperWidth = cachedPaperWidth || 704;
          const widthRatio = window.innerWidth < config.mobileBreakpoint ? config.finalWidthRatio.mobile : config.finalWidthRatio.desktop;
          const targetFullWidth = Math.min(Math.max(window.innerWidth * widthRatio, paperWidth), paperWidth + config.finalExtraWidth);
          const currentWidth = targetFullWidth * 0.35 + targetFullWidth * 0.65 * openRatio;
          if (paperContainer) paperContainer.style.width = `${currentWidth}px`;
          if (rollerLeft) rollerLeft.style.transform = `translateX(-${currentWidth / 2}px)`;
          if (rollerRight) rollerRight.style.transform = `translateX(${currentWidth / 2}px)`;
          if (openRatio > config.contentRevealRatio) content?.classList.add("is-visible");
        }
      }

      function tickProgress() {
        if (!loader) return;
        if (Math.abs(targetProgress - currentProgress) > config.progressStopThreshold) {
          currentProgress += (targetProgress - currentProgress) * config.progressEase;
          updateVisuals(currentProgress);
        }
        if (Math.abs(targetProgress - currentProgress) > config.progressStopThreshold || particles.length) progressFrame = requestAnimationFrame(tickProgress);
        else progressFrame = null;
      }

      function wakeProgress() {
        if (!progressFrame) progressFrame = requestAnimationFrame(tickProgress);
      }

      function start() {
        if (!loader) return;
        if (!animationEnabled) {
          loader.remove();
          return;
        }
        // 接口加载异常时也不能让开屏层永久挡住页面，9 秒后走兜底完成流程。
        fallbackTimer = window.setTimeout(() => {
          if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
          fallbackTimer = null;
          finish(false, true);
        }, 9000);
        particleEngine = initParticles();
        wakeProgress();
        startDidYouKnow();
        stageIndex = 0;
        particlesPlayed = false;
        fragmentsStarted = false;
        status.textContent = config.stages[stageIndex].text;
        targetProgress = config.stages[stageIndex].progress;
        intervalTimer = window.setInterval(() => {
          if (stageIndex < config.stages.length - 2) {
            stageIndex += 1;
            targetProgress = config.stages[stageIndex].progress;
          }
        }, config.stageIntervalMs);
      }

      async function finishWhenReady(success, skipResourceWait) {
        if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
        if (intervalTimer) window.clearInterval(intervalTimer);
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        status.textContent = "封泥将裂，展厅正在备妥……";
        if (!skipResourceWait) await waitForPageReady();
        if (!cachedPaperWidth && paper) cachedPaperWidth = paper.getBoundingClientRect().width || 704;
        if (config.preBreakHoldMs > 0) await new Promise((resolve) => window.setTimeout(resolve, config.preBreakHoldMs));
        if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
        stageIndex = config.stages.length - 1;
        if (!success) status.textContent = "展厅已打开，部分资料稍后加载";
        targetProgress = 100;
        wakeProgress();
        await new Promise((resolve) => {
          const startedAt = performance.now();
          const waitForProgress = (timestamp) => {
            if (!loader?.isConnected || currentProgress >= 99.5) return resolve();
            if (timestamp - startedAt > 1800) {
              currentProgress = 100;
              updateVisuals(100);
              return resolve();
            }
            window.requestAnimationFrame(waitForProgress);
          };
          window.requestAnimationFrame(waitForProgress);
        });
        await new Promise((resolve) => window.setTimeout(resolve, config.completedHoldMs));
        if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
        stopDidYouKnow();
        loader.classList.add("is-closing");
        removeTimer = window.setTimeout(() => {
          if (particleFrame) cancelAnimationFrame(particleFrame);
          if (progressFrame) cancelAnimationFrame(progressFrame);
          loader.remove();
          removeTimer = null;
        }, config.removeDelayMs);
      }

      function finish(success = true, skipResourceWait = false) {
        if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
        if (finishPromise) return finishPromise;
        finishPromise = finishWhenReady(success, skipResourceWait);
        return finishPromise;
      }

      function yieldToBrowser() {
        return new Promise((resolve) => {
          if ("scheduler" in window && typeof window.scheduler?.postTask === "function") {
            window.scheduler.postTask(resolve, { priority: "user-visible" });
            return;
          }
          window.requestAnimationFrame(() => window.setTimeout(resolve, 0));
        });
      }

      return { start, finish, yieldToBrowser };
    }
  };
}());
