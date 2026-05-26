// 问题进化引擎 — 规则对前端不透明，不要在注释或日志里透露细节

const EMOTION_SEEDS = [
  ['孤独', '迷茫', '疲惫', '失落', '难过', '空洞', '遗忘'],
  ['温暖', '期待', '喜悦', '轻松', '满足', '平静', '安慰'],
  ['愤怒', '压抑', '委屈', '后悔', '执着', '不甘', '挣扎'],
]

const TEMPLATES = [
  (w) => `"你有没有一种${w}，\n是解释了\n也没人懂的那种？"`,
  (w) => `"什么时候开始，\n你学会了把${w}\n一个人藏着？"`,
  (w) => `"如果${w}可以被看见，\n你希望谁\n第一个发现？"`,
  (w) => `"有没有一个瞬间，\n你突然觉得\n这份${w}值得？"`,
  (w) => `"你最后一次\n认真感受${w}\n是什么时候？"`,
  (w) => `"那些藏在${w}里的话，\n你有没有\n想说出口过？"`,
  (w) => `"当你一个人时，\n那种${w}\n会不会比白天更重？"`,
  (w) => `"你愿不愿意\n让某个人\n看见你的${w}？"`,
]

function extractKeywords(text) {
  const all = EMOTION_SEEDS.flat()
  return all.filter(w => text.includes(w))
}

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

export function evolveQuestion(currentQuestion, answer) {
  // 40% 概率进化
  if (Math.random() > 0.4) return null

  const found = extractKeywords(answer)
  let word

  if (found.length > 0) {
    word = randomPick(found)
  } else {
    word = randomPick(EMOTION_SEEDS.flat())
  }

  const template = randomPick(TEMPLATES)
  const newText = template(word)

  // 避免和当前问题完全一样
  if (newText === currentQuestion) return null

  return newText
}
