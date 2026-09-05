<script setup>
import { computed } from "vue";

const props = defineProps({
  question: { type: Object, required: true },
  index: { type: Number, required: true },
  selectedAnswer: { type: String, default: "" },
  selectedQuestionId: { type: [String, Number], default: null },
  answerResult: { type: Object, default: null },
  correctDisplayKey: { type: String, default: "" },
  answered: { type: Boolean, default: false }
});

const currentAnswerResult = computed(() => {
  if (!props.answerResult || String(props.answerResult.questionId) !== String(props.question.id)) return null;
  return props.answerResult;
});

const emit = defineEmits(["update:selectedAnswer"]);

function choose(optionKey) {
  if (currentAnswerResult.value) return;
  emit("update:selectedAnswer", optionKey);
}
</script>

<template>
  <fieldset
    class="quiz-question"
    :class="{
      'is-correct': currentAnswerResult?.correct,
      'is-wrong': currentAnswerResult && !currentAnswerResult.correct
    }"
  >
    <legend class="sr-only">第 {{ index + 1 }} 题：{{ question.question }}</legend>
    <div class="quiz-question-title">
      <span class="quiz-question-number">{{ String(index + 1).padStart(2, "0") }}</span>
      <span class="quiz-difficulty" :data-difficulty="question.difficulty || '简单'">{{ question.difficulty || "简单" }}</span>
      <h3>
        {{ question.question }}<span v-if="answered" class="quiz-analysis-hint">【下滑查看详细解析】</span>
      </h3>
    </div>
    <div class="quiz-options" :class="{ 'has-long-option': question.hasLongOption }">
      <button
        v-for="option in question.displayOptions"
        :key="`${question.renderId}-${option.displayId}`"
        class="quiz-option"
        type="button"
        role="radio"
        :aria-checked="String(selectedQuestionId) === String(question.id) && selectedAnswer === option.originalKey"
        :disabled="Boolean(currentAnswerResult)"
        :class="{
          'is-selected': String(selectedQuestionId) === String(question.id) && selectedAnswer === option.originalKey,
          'is-answer': currentAnswerResult && option.originalKey === currentAnswerResult.correctAnswer
        }"
        @click="choose(option.originalKey)"
      >
        <span
          class="quiz-option-pulse"
          :class="{
            'is-selected-pulse': String(selectedQuestionId) === String(question.id) && selectedAnswer === option.originalKey,
            'is-answer-pulse': currentAnswerResult && option.originalKey === currentAnswerResult.correctAnswer
          }"
          aria-hidden="true"
        ></span>
        <span class="quiz-option-key">{{ option.displayKey }}</span><span>{{ option.text }}</span>
      </button>
    </div>
    <Transition name="quiz-reveal">
      <div v-if="currentAnswerResult" class="quiz-explanation">
        <strong>{{ currentAnswerResult.correct ? `回答正确，答案 ${correctDisplayKey}，本题获得 ${currentAnswerResult.earnedScore} 分` : `回答错误，正确答案是 ${correctDisplayKey}` }}</strong>
        <p>{{ currentAnswerResult.explanation }}</p>
      </div>
    </Transition>
  </fieldset>
</template>
