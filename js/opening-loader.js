(function () {
  "use strict";

  window.NiyunOpeningLoader = {
    create({ $ }) {
      // 开屏动画只负责展示层；正文数据加载完成后由 app.js 调用 finish() 让它退场。
      const config = {
        // “你知道吗”轮换节奏（毫秒）：改这里即可，数字越大换得越慢。
        didYouKnowIntervalMs: 3800,
        didYouKnowFadeMs: 220,
        stages: [
          { text: "正在辨识战国秦汉封泥……", progress: 15 },
          { text: "封缄受力，封泥渐生细纹……", progress: 38 },
          { text: "卷轴晃动，封泥将裂……", progress: 54 },
          { text: "展厅已开启，欢迎进入泥云智探", progress: 100 },
        ],
        stageIntervalMs: 750,
        preBreakHoldMs: 1400,
        completedHoldMs: 900,
        removeDelayMs: 1100,
        resourceReadyTimeoutMs: 8000,
        initialProgress: 8,
        progressEase: 0.12,
        progressStopThreshold: 0.2,
        particleFrameIntervalMs: 16,
        debrisLifetimeMs: 750,
        debrisCount: { finalBurst: 84, mobileBurst: 48 },
        mobileBreakpoint: 640,
        earlyExpandHalfWidth: { mobile: 110, desktop: 160 },
        earlyExpandRatio: 0.35,
        finalWidthRatio: { mobile: 0.86, desktop: 0.78 },
        finalExtraWidth: 96,
        contentRevealRatio: 0.4,
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
        "同一方封泥，要分清印文地名、出土地与历史归属。",
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
      let crackPaths = [];
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      const particleCanvas = $("#sealParticlesCanvas");
      // 这里只保存四块碎片元素；飞行轨迹由 releaseFragments 计算，不再使用旧 CSS 动画类。
      const fragments = [
        $("#fragNW"),
        $("#fragNE"),
        $("#fragSW"),
        $("#fragSE"),
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

      // 先画裂纹，再复制完整印面作为碎块；各副本的 SVG 编号必须不同，避免引用串台。
      function prepareFracture() {
        const svg = seal?.querySelector(".clay-seal-svg");
        if (!svg || !cracks) return;
        const ns = "http://www.w3.org/2000/svg";
        const lines = [
          "M98 100 L94 86 L101 73 L96 61 L102 49 L98 35 L100 10",
          "M98 100 L114 94 L123 100 L137 91 L147 95 L161 86 L191 80",
          "M98 100 L104 114 L98 128 L105 139 L100 153 L108 168 L103 194",
          "M98 100 L84 108 L73 102 L61 111 L49 106 L35 115 L8 119",
          "M101 73 L116 65 L120 48 L137 34",
          "M147 95 L154 111 L172 123 L178 143",
          "M105 139 L85 147 L77 165 L57 178",
          "M61 111 L54 91 L37 80 L29 59",
        ];
        const clip = document.createElementNS(ns, "clipPath");
        clip.id = "sealFractureClip";
        const outline = svg.querySelector(".clay-base").cloneNode(true);
        outline.removeAttribute("class");
        outline.setAttribute("fill", "white");
        clip.append(outline);
        svg.querySelector("defs").append(clip);
        cracks.setAttribute("clip-path", "url(#sealFractureClip)");
        cracks.replaceChildren();
        lines.forEach((d, index) => {
          for (const highlight of [true, false]) {
            const path = document.createElementNS(ns, "path");
            path.setAttribute("d", d);
            path.setAttribute("fill", "none");
            path.setAttribute("stroke", highlight ? "#d58d66" : "#35150e");
            path.setAttribute(
              "stroke-width",
              index < 4 ? (highlight ? "5.2" : "3.2") : highlight ? "2.8" : "1.6",
            );
            path.setAttribute("stroke-linejoin", "round");
            path.setAttribute("class", highlight ? "crack-highlight" : "crack-path");
            path.setAttribute("pathLength", "180");
            path.dataset.branch = index;
            if (highlight) path.setAttribute("opacity", ".7");
            cracks.append(path);
          }
        });
        crackPaths = [...cracks.querySelectorAll("path")];
        fragments.forEach((fragment, index) => {
          if (!fragment) return;
          const copy = svg.cloneNode(true);
          copy.querySelectorAll("script, .seal-cracks-group").forEach((node) => node.remove());
          const ids = new Map();
          copy.querySelectorAll("[id]").forEach((node) => {
            const old = node.id;
            ids.set(old, `${old}-fragment-${index}`);
            node.id = ids.get(old);
          });
          copy.querySelectorAll("*").forEach((node) => {
            for (const attr of [...node.attributes]) {
              let value = attr.value;
              ids.forEach((next, old) => {
                value = value.replaceAll(`url(#${old})`, `url(#${next})`);
              });
              if (value !== attr.value) node.setAttribute(attr.name, value);
            }
          });
          fragment.replaceChildren(copy);
          // Keep shards outside the fading seal so their fall can finish independently.
          seal.parentElement.append(fragment);
        });
      }

      // 建立泥屑画布。按屏幕像素密度放大画布，让高分屏上的碎屑也清晰。
      function initParticles() {
        if (!particleCanvas) return null;
        const context = particleCanvas.getContext("2d");
        if (!context) return null;
        const width = Math.min(800, window.innerWidth);
        const height = 640;
        const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        particleCanvas.width = Math.round(width * pixelRatio);
        particleCanvas.height = Math.round(height * pixelRatio);
        particleCanvas.style.width = `${width}px`;
        particleCanvas.style.height = `${height}px`;
        context.scale(pixelRatio, pixelRatio);
        const centerX = width / 2;
        const centerY = height / 2;

        function wake() {
          if (!particleFrame) particleFrame = requestAnimationFrame(render);
        }

        // 给每粒泥屑一个出发位置、速度和转速，之后按经过的时间计算运动。
        function createDebris(count = 5, burst = false) {
          if (reducedMotion) return;
          const bornAt = performance.now();
          for (let index = 0; index < count; index += 1) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 10 + Math.random() * 45;
            const speed =
              (burst ? 5 + Math.random() * 10 : 0.6 + Math.random() * 2.2) * Math.min(1, width / 640);
            const fine = index % 3 !== 0;
            particles.push({
              x: centerX + Math.cos(angle) * distance,
              y: centerY + Math.sin(angle) * distance,
              vx: Math.cos(angle) * speed + (Math.random() - 0.5) * 1.2,
              vy: Math.sin(angle) * speed - (burst ? 3 : 0),
              gravity: fine ? 0.12 : 0.24,
              size: fine ? 1 + Math.random() * 2 : 3 + Math.random() * 6,
              rotation: Math.random() * Math.PI * 2,
              vRot: (Math.random() - 0.5) * 0.25,
              color: Math.random() > 0.4 ? "#8c3323" : Math.random() > 0.5 ? "#ba5d45" : "#4a180e",
              bornAt,
              alpha: 1,
            });
          }
          wake();
        }

        // 只在有泥屑时绘制；按时间而非帧数计算，避免不同刷新率下快慢不一。
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
            const age = Math.max(0, timestamp - particle.bornAt);
            const frames = age / (1000 / 60);
            particle.alpha = 1 - Math.max(0, (age / config.debrisLifetimeMs - 0.55) / 0.45);
            if (age >= config.debrisLifetimeMs) {
              particles.splice(index, 1);
              continue;
            }
            context.save();
            context.translate(
              particle.x + particle.vx * frames,
              particle.y + particle.vy * frames + 0.5 * particle.gravity * frames * frames,
            );
            context.rotate(particle.rotation + particle.vRot * frames);
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

      // 大碎块沿抛物线飞散，并在 0.75 秒内渐隐；减少动态效果时不播放飞散。
      function releaseFragments() {
        if (reducedMotion) return;
        const spread = window.innerWidth < config.mobileBreakpoint ? 0.6 : 1;
        const velocities = [
          [-290, -290, -110],
          [310, -320, 125],
          [-240, 40, -90],
          [260, 65, 140],
        ];
        fragments.forEach((fragment, index) => {
          if (!fragment) return;
          const [vx, vy, spin] = velocities[index];
          // Sample x = vx*t and y = vy*t + g*t*t/2 densely for compositor playback.
          const keyframes = Array.from({ length: 61 }, (_, frame) => {
            const offset = frame / 60;
            const time = (offset * config.debrisLifetimeMs) / 1000;
            const x = vx * spread * time;
            const y = vy * time + 0.5 * 1000 * time * time;
            return {
              offset,
              transform: `translate(${x}px, ${y}px) rotate(${spin * time}deg)`,
              opacity: 1 - Math.max(0, (offset - 0.55) / 0.45),
            };
          });
          fragment.animate(keyframes, {
            duration: config.debrisLifetimeMs,
            easing: "linear",
            fill: "forwards",
          });
        });
      }

      // 开屏等待期间轮换知识短句，计时器会在退场时清理。
      function startDidYouKnow() {
        if (!didYouKnowText || !didYouKnowFacts.length) return;
        didYouKnowIndex = Math.floor(Math.random() * didYouKnowFacts.length);
        setDidYouKnowText(didYouKnowFacts[didYouKnowIndex], true);
        didYouKnowTimer = window.setInterval(() => {
          didYouKnowIndex = nextDidYouKnowIndex();
          setDidYouKnowText(didYouKnowFacts[didYouKnowIndex]);
        }, config.didYouKnowIntervalMs);
      }

      // 随机选下一句，但不连续显示同一句。
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

      function stopDidYouKnow() {
        if (didYouKnowTimer) window.clearInterval(didYouKnowTimer);
        if (didYouKnowSwitchTimer) window.clearTimeout(didYouKnowSwitchTimer);
        didYouKnowTimer = null;
        didYouKnowSwitchTimer = null;
        didYouKnowText?.classList.remove("is-switching");
      }

      // 等待正文初始图片解码和字体就绪，而不只等待遮罩图片；远处课件仍按需加载。
      function waitForPageReady() {
        if (pageReadyPromise) return pageReadyPromise;
        const images = [...document.querySelectorAll("#openingLoader img, main img")];
        // 只主动准备初始图片；远处课件不参与等待，坏图也不能让开屏一直卡住。
        function prepareImage(image) {
          if (!image.getAttribute("src") || image.hidden) return Promise.resolve();
          if (image.loading === "lazy" && image.closest(".course-slide")) return Promise.resolve();
          image.loading = "eager";
          // decode 不只等待下载，还等待浏览器把图片转换成能显示的像素。
          return image.decode().catch(function ignoreBrokenImage() {});
        }
        const imageReady = Promise.all([...images.map(prepareImage), document.fonts.ready]);
        let timeoutId;
        // 网络异常时最多等到上限，再让用户进入页面查看已加载的内容。
        const timeout = new Promise(function limitResourceWait(resolve) {
          timeoutId = window.setTimeout(resolve, config.resourceReadyTimeoutMs);
        });
        // 资源就绪和超时谁先完成就继续，后续调用复用这次等待。
        pageReadyPromise = Promise.race([imageReady, timeout]).then(
          function allowFinalPaint() {
            window.clearTimeout(timeoutId);
            // 留出两个绘制帧，让刚准备好的图片有机会显示后再继续退场。
            return new Promise(function waitForPaint(resolve) {
              window.requestAnimationFrame(function nextFrame() {
                window.requestAnimationFrame(resolve);
              });
            });
          },
        );
        return pageReadyPromise;
      }

      // 将进度分为受力、开裂、碎裂和展卷几个阶段，统一控制各部分的显示。
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
        if (progress >= 80 && particleEngine && !particlesPlayed) {
          particleEngine.createDebris(
            window.innerWidth < config.mobileBreakpoint
              ? config.debrisCount.mobileBurst
              : config.debrisCount.finalBurst,
            true,
          );
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
            crackPaths.forEach((path) => {
              const branch = Number(path.dataset.branch);
              const growth = Math.max(
                0,
                Math.min(1, crackRatio * 1.6 - (branch < 4 ? branch * 0.1 : 0.5 + (branch - 4) * 0.08)),
              );
              path.style.strokeDashoffset = `${180 * (1 - growth)}`;
            });
          }
          seal?.classList.add("shaking");
        } else if (progress < 80) {
          const expandRatio = (progress - 55) / 25;
          if (cracks) cracks.style.opacity = "1";
          crackPaths.forEach((path) => {
            path.style.strokeDashoffset = "0";
          });
          if (seal) {
            seal.classList.add("shaking");
            seal.classList.add("is-straining");
            seal.style.transform = "none";
          }
          const maxHalfWidth =
            window.innerWidth < config.mobileBreakpoint
              ? config.earlyExpandHalfWidth.mobile
              : config.earlyExpandHalfWidth.desktop;
          const currentHalf = maxHalfWidth * expandRatio * config.earlyExpandRatio;
          if (paperContainer) paperContainer.style.width = `${currentHalf * 2}px`;
          if (rollerLeft) rollerLeft.style.transform = `translateX(-${currentHalf}px)`;
          if (rollerRight) rollerRight.style.transform = `translateX(${currentHalf}px)`;
        } else {
          const openRatio = (progress - 80) / 20;
          if (seal) {
            seal.classList.remove("shaking", "is-straining");
            seal.style.opacity = "0";
            seal.style.transform = "none";
          }
          if (!fragmentsStarted) {
            releaseFragments();
            fragmentsStarted = true;
          }
          if (!cachedPaperWidth && paper) cachedPaperWidth = paper.getBoundingClientRect().width || 704;
          const paperWidth = cachedPaperWidth || 704;
          const widthRatio =
            window.innerWidth < config.mobileBreakpoint
              ? config.finalWidthRatio.mobile
              : config.finalWidthRatio.desktop;
          const targetFullWidth = Math.min(
            Math.max(window.innerWidth * widthRatio, paperWidth),
            paperWidth + config.finalExtraWidth,
          );
          const currentWidth = targetFullWidth * 0.35 + targetFullWidth * 0.65 * openRatio;
          if (paperContainer) paperContainer.style.width = `${currentWidth}px`;
          if (rollerLeft) rollerLeft.style.transform = `translateX(-${currentWidth / 2}px)`;
          if (rollerRight) rollerRight.style.transform = `translateX(${currentWidth / 2}px)`;
          if (openRatio > config.contentRevealRatio) content?.classList.add("is-visible");
        }
      }

      // 每帧向目标进度靠近一点，避免进度条突然跳到下一阶段。
      function tickProgress() {
        if (!loader) return;
        if (Math.abs(targetProgress - currentProgress) > config.progressStopThreshold) {
          currentProgress += (targetProgress - currentProgress) * config.progressEase;
          updateVisuals(currentProgress);
        }
        if (Math.abs(targetProgress - currentProgress) > config.progressStopThreshold || particles.length)
          progressFrame = requestAnimationFrame(tickProgress);
        else progressFrame = null;
      }

      function wakeProgress() {
        if (!progressFrame) progressFrame = requestAnimationFrame(tickProgress);
      }

      // 启动开屏；用户关闭动画时直接移除，加载异常时也有兜底退场。
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
        prepareFracture();
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
            wakeProgress();
          }
        }, config.stageIntervalMs);
      }

      // 资料就绪后播完碎裂和展卷，再清理动画帧并移除遮罩。
      async function finishWhenReady(success, skipResourceWait) {
        if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        if (!skipResourceWait) await waitForPageReady();
        if (!cachedPaperWidth && paper) cachedPaperWidth = paper.getBoundingClientRect().width || 704;
        // 数据很快就绪时，也要先走完裂纹阶段；不能提前清掉阶段计时器。
        await new Promise(function waitForCracks(resolve) {
          // 进度采用逐渐逼近的方式更新，53.5 会显示为 54%，不要求小数精确等于 54。
          function checkCrackProgress() {
            if (!loader.isConnected || currentProgress >= 53.5) {
              resolve();
              return;
            }
            window.requestAnimationFrame(checkCrackProgress);
          }
          checkCrackProgress();
        });
        if (intervalTimer) window.clearInterval(intervalTimer);
        if (config.preBreakHoldMs > 0)
          await new Promise((resolve) => window.setTimeout(resolve, config.preBreakHoldMs));
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

      // 正常加载与超时兜底都可能要求结束，这里确保退场流程只启动一次。
      function finish(success = true, skipResourceWait = false) {
        if (!loader?.isConnected || loader.classList.contains("is-closing")) return;
        if (finishPromise) return finishPromise;
        finishPromise = finishWhenReady(success, skipResourceWait);
        return finishPromise;
      }

      // 暂时让出执行时间，让浏览器先画一帧，避免连续生成内容时卡住动画。
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
    },
  };
})();
