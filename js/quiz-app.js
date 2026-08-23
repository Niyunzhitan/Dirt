// 此部分对应于趣味答题页面，使用了 Vue.js 框架。
(function () {
  if (!window.Vue || !window.ApiService) return;

  const optionKeys = ["A", "B", "C", "D"];

  function shuffleOptions(question) {
    const options = optionKeys.map((originalKey) => ({
      originalKey,
      text: question[`option${originalKey}`]
    }));
    for (let index = options.length - 1; index > 0; index -= 1) {
      const randomIndex = Math.floor(Math.random() * (index + 1));
      [options[index], options[randomIndex]] = [options[randomIndex], options[index]];
    }
    return options.map((option, index) => ({ ...option, displayKey: optionKeys[index] }));
  }

  const QuizApp = {
    data() {
      return {
        questions: [],
        index: 0,
        score: 0,
        scorePerQuestion: 10,
        selectedAnswer: "",
        answerResult: null,
        loading: true,
        submitting: false,
        feedback: "",
        loadError: "",
        showingResult: false,
        shareUrl: window.location.href,
        copyFeedback: "分享网址后，朋友可以打开同一个趣味问答页面。",
        copied: false,
        copyButtonText: "复制当前网址",
        copyCount: 0,
        copyResetTimer: null
      };
    },
    computed: {
      currentQuestion() { return this.questions[this.index] || null; },
      answered() { return Boolean(this.answerResult); },
      total() { return this.questions.length; },
      completed() { return Math.min(this.index + (this.answered || this.showingResult ? 1 : 0), this.total); },
      progressStyle() { return { transform: `scaleX(${this.total ? this.completed / this.total : 0})` }; },
      correctCount() { return this.score / this.scorePerQuestion; },
      resultTitle() {
        if (this.score === 100) return "金石通识者";
        if (this.score >= 80) return "封泥学士";
        if (this.score >= 60) return "泥印新秀";
        return "澄泥初识";
      },
      submitText() {
        if (this.submitting) return "正在判题";
        if (!this.answered) return "确认答案";
        return this.index === this.total - 1 ? "查看结果" : "下一题";
      },
      correctDisplayKey() {
        if (!this.answerResult || !this.currentQuestion) return "";
        return this.currentQuestion.displayOptions.find((option) => option.originalKey === this.answerResult.correctAnswer)?.displayKey
          || this.answerResult.correctAnswer;
      },
      shareSummary() { return `本轮得分 ${this.score} 分，答对 ${this.correctCount} / ${this.total} 题。`; }
    },
    mounted() { this.loadQuiz(); },
    methods: {
      animateShare(opening) {
        if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return null;
        const panel = this.$refs.shareDialog?.querySelector(".share-panel");
        if (!panel) return null;
        const style = getComputedStyle(document.documentElement);
        const travel = style.getPropertyValue("--motion-search-travel-y").trim();
        const scale = style.getPropertyValue("--motion-search-scale-from").trim();
        const durationName = opening ? "--motion-search-enter" : "--motion-search-exit";
        const rawDuration = style.getPropertyValue(durationName).trim();
        const duration = rawDuration.endsWith("ms") ? Number.parseFloat(rawDuration) : Number.parseFloat(rawDuration) * 1000;
        const hidden = { opacity: 0, transform: `translateY(${travel}) scale(${scale})` };
        const visible = { opacity: 1, transform: "translateY(0) scale(1)" };
        return panel.animate(opening ? [hidden, visible] : [visible, hidden], {
          duration,
          easing: style.getPropertyValue(opening ? "--ease-out" : "--ease-in-out").trim(),
          fill: "both"
        });
      },
      hasLongOption(question) {
        return optionKeys.some((key) => String(question[`option${key}`] || "").length > 28);
      },
      async loadQuiz() {
        this.loading = true;
        this.loadError = "";
        this.showingResult = false;
        try {
          const round = await window.ApiService.startQuiz();
          this.questions = round.questions.map((question) => ({
            ...question,
            hasLongOption: this.hasLongOption(question),
            displayOptions: shuffleOptions(question)
          }));
          this.index = 0;
          this.score = 0;
          this.scorePerQuestion = round.scorePerQuestion;
          this.prepareQuestion();
        } catch (error) {
          this.questions = [];
          this.loadError = error.message || "请稍后重试";
          this.feedback = "题库暂时无法访问。";
        } finally {
          this.loading = false;
        }
      },
      prepareQuestion() {
        this.selectedAnswer = "";
        this.answerResult = null;
        this.feedback = "选择一个答案，然后确认。";
      },
      optionClass(option) {
        if (!this.answerResult) return {};
        return { "is-answer": option.originalKey === this.answerResult.correctAnswer };
      },
      async submit() {
        if (this.submitting || !this.currentQuestion) return;
        if (this.answered) {
          if (this.index >= this.total - 1) this.showingResult = true;
          else { this.index += 1; this.prepareQuestion(); }
          return;
        }
        if (!this.selectedAnswer) return;
        this.submitting = true;
        try {
          const result = await window.ApiService.answerQuiz(this.currentQuestion.id, this.selectedAnswer);
          this.answerResult = result;
          this.score += result.earnedScore;
          this.feedback = result.correct
            ? `当前得分 ${this.score} 分。`
            : `当前得分 ${this.score} 分，看看解析再继续。`;
        } catch (error) {
          this.feedback = error.message || "提交失败，请稍后重试。";
        } finally {
          this.submitting = false;
        }
      },
      openShare() {
        this.copied = false;
        this.copyButtonText = this.copyCount ? "再次复制" : "复制当前网址";
        this.copyFeedback = "分享网址后，朋友可以打开同一个趣味问答页面。";
        this.shareUrl = window.location.href;
        this.$refs.shareDialog.showModal();
        this.animateShare(true);
        this.$nextTick(() => this.$refs.copyButton?.focus());
      },
      async closeShare() {
        const dialog = this.$refs.shareDialog;
        if (!dialog?.open) return;
        const animation = this.animateShare(false);
        if (animation) { try { await animation.finished; } catch (_) { return; } }
        dialog.close();
      },
      async copyUrl() {
        const url = window.location.href;
        window.clearTimeout(this.copyResetTimer);
        this.copied = false;
        this.copyButtonText = "复制中…";
        this.copyFeedback = "正在复制当前网址……";

        // file:// 页面可能暴露 Clipboard API 但拒绝写入，失败后必须继续使用传统复制。
        const copyWithTextarea = () => {
          const input = document.createElement("textarea");
          input.value = url;
          input.readOnly = true;
          input.style.cssText = "position:fixed;left:-9999px;top:0;opacity:0";
          document.body.appendChild(input);
          input.focus();
          input.select();
          input.setSelectionRange(0, input.value.length);
          const writeClipboardData = (event) => {
            event.clipboardData?.setData("text/plain", url);
            event.preventDefault();
          };
          document.addEventListener("copy", writeClipboardData, { once: true });
          const copied = document.execCommand("copy");
          input.remove();
          if (!copied) throw new Error("浏览器拒绝复制");
        };

        try {
          let clipboardCopied = false;
          if (navigator.clipboard?.writeText) {
            try {
              await navigator.clipboard.writeText(url);
              clipboardCopied = true;
            } catch (_) {
              clipboardCopied = false;
            }
          }
          if (!clipboardCopied) copyWithTextarea();

          this.copyCount += 1;
          // 先让“复制中”真实渲染一帧，再切换成功状态，连续点击也有清晰反馈。
          await this.$nextTick();
          this.copied = true;
          this.copyButtonText = this.copyCount > 1 ? "再次复制成功" : "已复制";
          this.copyFeedback = this.copyCount > 1
            ? `已第 ${this.copyCount} 次复制当前网址。`
            : "网址已复制，可以发送给朋友了。";
          this.copyResetTimer = window.setTimeout(() => {
            this.copied = false;
            this.copyButtonText = "再次复制";
            this.copyFeedback = "可继续点击，再次复制当前网址。";
          }, 1600);
        } catch (_) {
          this.copied = false;
          this.copyButtonText = "重试复制";
          this.copyFeedback = "复制失败，请手动复制当前网页地址。";
        }
      }
    },
    template: `
      <div>
        <div class="section-heading split-heading">
          <div><p class="eyebrow">趣味问答</p><h2 id="quizTitle">泥印里的知识，你记住了多少？</h2></div>
          <p class="heading-note">每轮随机抽取十题，每题 10 分。看看你学会了多少吧！</p>
        </div>
        <div class="quiz-toolbar">
          <div><strong aria-label="答题进度">{{ completed }} / {{ total }}</strong></div>
          <div class="quiz-progress" aria-hidden="true"><i :style="progressStyle"></i></div>
          <div class="quiz-score" aria-label="当前得分" aria-live="polite"><strong>{{ score }}</strong><small>分</small></div>
        </div>
        <form class="quiz-form" aria-describedby="quizFeedback" :aria-busy="submitting" @submit.prevent="submit">
          <div class="quiz-list" :class="{ 'is-result': showingResult }" aria-live="polite" :aria-busy="loading">
            <p v-if="loading" class="quiz-loading">正在随机抽取十道题……</p>
            <div v-else-if="loadError" class="empty-state"><strong>题目加载失败</strong><p>{{ loadError }}</p></div>
            <div v-else-if="showingResult" class="quiz-result">
              <span>本轮称号</span><h3>{{ resultTitle }}</h3><strong>{{ score }}<small>分</small></strong>
              <p>共答对 {{ correctCount }} / {{ total }} 题。每一次辨认，都是走近齐鲁金石的一步。</p>
              <button class="button quiz-share-button" type="button" @click="openShare">分享成绩 <span aria-hidden="true">↗</span></button>
              <button class="button primary" type="button" @click="loadQuiz">再来一轮 <span aria-hidden="true">↻</span></button>
            </div>
            <fieldset v-else-if="currentQuestion" class="quiz-question" :class="{ 'is-correct': answerResult && answerResult.correct, 'is-wrong': answerResult && !answerResult.correct }">
              <legend class="sr-only">第 {{ index + 1 }} 题：{{ currentQuestion.question }}</legend>
              <div class="quiz-question-title">
                <span class="quiz-question-number">{{ String(index + 1).padStart(2, '0') }}</span>
                <span class="quiz-difficulty" :data-difficulty="currentQuestion.difficulty || '简单'">{{ currentQuestion.difficulty || '简单' }}</span>
                <h3>{{ currentQuestion.question }}<span v-if="answered" class="quiz-analysis-hint">【下滑查看详细解析】</span></h3>
              </div>
              <div class="quiz-options" :class="{ 'has-long-option': currentQuestion.hasLongOption }">
                <label v-for="option in currentQuestion.displayOptions" :key="option.originalKey" :class="optionClass(option)">
                  <input v-model="selectedAnswer" type="radio" :name="'quiz-' + currentQuestion.id" :value="option.originalKey" :disabled="answered">
                  <span class="quiz-option-key">{{ option.displayKey }}</span><span>{{ option.text }}</span>
                </label>
              </div>
              <div v-if="answerResult" class="quiz-explanation">
                <strong>{{ answerResult.correct ? '回答正确，答案 ' + correctDisplayKey + '，本题获得 ' + answerResult.earnedScore + ' 分' : '回答错误，正确答案是 ' + correctDisplayKey }}</strong>
                <p>{{ answerResult.explanation }}</p>
              </div>
            </fieldset>
          </div>
          <p id="quizFeedback" class="quiz-feedback" role="status" aria-live="polite">{{ feedback }}</p>
          <div v-if="!showingResult" class="quiz-actions">
            <button class="button primary" type="submit" :disabled="submitting || (!answered && !selectedAnswer)">{{ submitText }} <span aria-hidden="true">→</span></button>
            <button class="button primary" type="button" @click="loadQuiz">再来一轮 <span aria-hidden="true">↻</span></button>
          </div>
        </form>
        <teleport to="body">
          <dialog ref="shareDialog" class="share-dialog" aria-labelledby="shareTitle" @click.self="closeShare" @cancel.prevent="closeShare">
            <div class="share-panel">
              <button class="share-close" type="button" aria-label="关闭成绩分享弹窗" @click="closeShare">×</button>
              <p class="eyebrow">趣味问答成绩</p><div class="share-rank" aria-hidden="true"><span>段</span></div>
              <p class="share-kicker">本轮段位</p><h2 id="shareTitle">{{ resultTitle }}</h2><p class="share-summary">{{ shareSummary }}</p>
              <div class="share-url-row"><span class="share-url">{{ shareUrl }}</span><button ref="copyButton" class="share-copy" :class="{ 'is-copied': copied }" type="button" @click="copyUrl">{{ copyButtonText }}</button></div>
              <p class="share-feedback" role="status" aria-live="polite">{{ copyFeedback }}</p>
            </div>
          </dialog>
        </teleport>
      </div>`
  };

  window.Vue.createApp(QuizApp).mount("#quizApp");
}());
