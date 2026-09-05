<script setup>
import { computed, onMounted, ref } from "vue";
import QuizProgress from "./QuizProgress.vue";
import QuizQuestion from "./QuizQuestion.vue";
import QuizResult from "./QuizResult.vue";
import QuizShareDialog from "./QuizShareDialog.vue";
import { hasLongOption, shuffleOptions } from "./quiz-utils.js";

const questions = ref([]);
const index = ref(0);
const score = ref(0);
const scorePerQuestion = ref(10);
const selectedAnswer = ref("");
const selectedQuestionId = ref(null);
const answerResult = ref(null);
const loading = ref(true);
const submitting = ref(false);
const feedback = ref("");
const loadError = ref("");
const showingResult = ref(false);
const shareDialog = ref(null);
let questionRenderId = 0;

const currentQuestion = computed(() => questions.value[index.value] || null);
const answered = computed(() => Boolean(answerResult.value));
const total = computed(() => questions.value.length);
const completed = computed(() => Math.min(index.value + (answered.value || showingResult.value ? 1 : 0), total.value));
const correctCount = computed(() => score.value / scorePerQuestion.value);
const submitText = computed(() => {
  if (submitting.value) return "正在判题";
  if (!answered.value) return "确认答案";
  return index.value === total.value - 1 ? "查看结果" : "下一题";
});
const resultTitle = computed(() => {
  if (score.value === 100) return "金石通识者";
  if (score.value >= 80) return "封泥学士";
  if (score.value >= 60) return "泥印新秀";
  return "澄泥初识";
});
const correctDisplayKey = computed(() => {
  if (!answerResult.value || !currentQuestion.value) return "";
  return currentQuestion.value.displayOptions.find((option) => option.originalKey === answerResult.value.correctAnswer)?.displayKey || answerResult.value.correctAnswer;
});

function prepareQuestion() {
  selectedAnswer.value = "";
  selectedQuestionId.value = null;
  answerResult.value = null;
  feedback.value = "选择一个答案，然后确认。";
}

function goToNextQuestion() {
  if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
  prepareQuestion();
  index.value += 1;
}

async function loadQuiz() {
  loading.value = true;
  loadError.value = "";
  showingResult.value = false;
  try {
    const round = await window.ApiService.startQuiz();
    questions.value = round.questions.map((question) => ({
      ...question,
      renderId: `${++questionRenderId}-${question.id}`,
      hasLongOption: hasLongOption(question),
      displayOptions: shuffleOptions(question)
    }));
    index.value = 0;
    score.value = 0;
    scorePerQuestion.value = round.scorePerQuestion;
    prepareQuestion();
  } catch (error) {
    questions.value = [];
    loadError.value = error.message || "请稍后重试";
    feedback.value = "题库暂时无法访问。";
  } finally {
    loading.value = false;
  }
}

async function submit() {
  if (submitting.value || !currentQuestion.value) return;
  if (answered.value) {
    if (index.value >= total.value - 1) showingResult.value = true;
    else goToNextQuestion();
    return;
  }
  if (!selectedAnswer.value) return;

  submitting.value = true;
  const questionId = currentQuestion.value.id;
  try {
    const result = await window.ApiService.answerQuiz(questionId, selectedAnswer.value);
    if (currentQuestion.value?.id !== questionId) return;
    answerResult.value = result;
    score.value += result.earnedScore;
    feedback.value = result.correct ? `当前得分 ${score.value} 分。` : `当前得分 ${score.value} 分，看看解析再继续。`;
  } catch (error) {
    feedback.value = error.message || "提交失败，请稍后重试。";
  } finally {
    submitting.value = false;
  }
}

onMounted(loadQuiz);
</script>

<template>
  <div>
    <div class="section-heading split-heading">
      <div><p class="eyebrow">趣味问答</p><h2 id="quizTitle">泥印里的知识，你记住了多少？</h2></div>
      <p class="heading-note">每轮随机抽取十题，每题 10 分。看看你学会了多少吧！</p>
    </div>
    <QuizProgress :completed="completed" :total="total" :score="score" />
    <form class="quiz-form" autocomplete="off" aria-describedby="quizFeedback" :aria-busy="submitting" @submit.prevent="submit">
      <div class="quiz-list" :class="{ 'is-result': showingResult }" aria-live="polite" :aria-busy="loading">
        <p v-if="loading" class="quiz-loading">正在随机抽取十道题……</p>
        <div v-else-if="loadError" class="empty-state"><strong>题目加载失败</strong><p>{{ loadError }}</p></div>
        <QuizResult
          v-else-if="showingResult"
          :title="resultTitle"
          :score="score"
          :correct-count="correctCount"
          :total="total"
          @share="shareDialog.open()"
          @restart="loadQuiz"
        />
        <QuizQuestion
          v-else-if="currentQuestion"
          :key="currentQuestion.id"
          :question="currentQuestion"
          :index="index"
          :selected-answer="selectedAnswer"
          :selected-question-id="selectedQuestionId"
          :answer-result="answerResult"
          :correct-display-key="correctDisplayKey"
          :answered="answered"
          @update:selected-answer="selectedAnswer = $event; selectedQuestionId = currentQuestion.id"
        />
      </div>
      <p id="quizFeedback" class="quiz-feedback" role="status" aria-live="polite">{{ feedback }}</p>
      <div v-if="!showingResult" class="quiz-actions">
        <button class="button primary" type="submit" :disabled="submitting || (!answered && !selectedAnswer)">{{ submitText }} <span aria-hidden="true">→</span></button>
        <button class="button primary" type="button" @click="loadQuiz">再来一轮 <span aria-hidden="true">↻</span></button>
      </div>
    </form>
    <QuizShareDialog ref="shareDialog" :title="resultTitle" :score="score" :total="total" />
  </div>
</template>
