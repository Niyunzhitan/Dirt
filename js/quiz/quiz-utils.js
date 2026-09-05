const OPTION_KEYS = ["A", "B", "C", "D"];

export function shuffleOptions(question) {
  const options = OPTION_KEYS.map((originalKey) => ({
    originalKey,
    text: question[`option${originalKey}`]
  }));

  for (let index = options.length - 1; index > 0; index -= 1) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    [options[index], options[randomIndex]] = [options[randomIndex], options[index]];
  }

  return options.map((option, index) => ({
    ...option,
    displayKey: OPTION_KEYS[index],
    displayId: `${question.id}-${index}`
  }));
}

export function hasLongOption(question) {
  return OPTION_KEYS.some((key) => String(question[`option${key}`] || "").length > 28);
}
