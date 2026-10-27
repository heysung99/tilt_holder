// Today's fortune and hold'em hand, drawn at random once per day per device and
// kept in localStorage so reopening the app shows the same draw.

export type Suit = 's' | 'h' | 'd' | 'c';
export type Card = { rank: string; suit: Suit };
export type DailyDraw = { date: string; fortune: string; cards: [Card, Card] };

const STORAGE_KEY = 'tilt-holder:daily-fortune';
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', 'T', 'J', 'Q', 'K', 'A'];
const SUITS: Suit[] = ['s', 'h', 'd', 'c'];

export const SUIT_SYMBOL: Record<Suit, string> = { s: '♠', h: '♥', d: '♦', c: '♣' };
export const isRedSuit = (suit: Suit) => suit === 'h' || suit === 'd';
export const rankLabel = (rank: string) => (rank === 'T' ? '10' : rank);

// Loosely after well-known poker sayings, rewritten for the table.
export const FORTUNES = [
  '칩 하나와 의자 하나만 있으면 된다. 오늘은 숏스택에서도 기적이 일어나는 날!',
  '포커는 배우는 데 5분, 마스터하는 데 평생. 오늘은 그 5분짜리 실력으로도 충분합니다.',
  '30분 안에 테이블의 호구가 안 보인다면… 거울은 잠시 넣어두세요. 오늘은 아닐 거예요.',
  '폴드는 패배가 아니라 투자. 오늘 버린 카드가 내일의 칩이 됩니다.',
  '카드는 당신이 어제 졌다는 걸 모릅니다. 오늘은 완전히 새로운 덱이에요.',
  '리버는 늘 마지막에 웃는 사람 편. 오늘 리버는 당신에게 미소 짓습니다.',
  '받은 카드는 못 고르지만 치는 방법은 고를 수 있다. 72o도 오늘은 작품이 될지도?',
  '틸트 주의보 발령! 배드빗 한 번에 흔들리면 이 앱 이름이 됩니다.',
  '포지션이 깡패. 오늘은 버튼에서 기다리면 기회가 먼저 찾아옵니다.',
  '인내는 최고의 핸드. 오늘은 기다린 만큼 팟이 커집니다.',
  '올인은 용기, 콜은 확신. 오늘은 확신 쪽에 칩을 올려보세요.',
  '블러프는 자신감 70%, 표정 관리 30%. 오늘 포커페이스 버프 +50!',
  '운은 들쭉날쭉, 실력은 꾸준히. 그런데 오늘은 운이 정시 출근했어요.',
  '빅 블라인드는 남의 돈이 아니라 내 돈. 오늘은 함부로 지키려다 다치지 마세요.',
  '세트를 노린다면 오늘! 포켓 페어는 플랍에서 꽃이 핍니다.',
  '드로우는 꿈, 메이드는 현실. 오늘은 꿈보다 현실을 믿는 날.',
  '테이블에서 가장 비싼 말은 "어차피 한 장인데"입니다. 오늘은 아껴두세요.',
  '좋은 폴드는 아무도 박수 쳐주지 않지만 지갑은 기억합니다.',
  '쉿, 오늘 당신의 텔은 완벽하게 숨겨져 있습니다. 상대는 아무것도 몰라요.',
  '칩 리더의 기운이 감지됩니다. 단, 칩은 세는 순간부터 줄어드는 법.',
  '오늘의 행운 카드는 턴. 마지막에서 두 번째에 모든 게 바뀝니다.',
  '수딧 커넥터의 날. 작은 카드가 큰 팟을 끌고 옵니다.',
  '에이스가 보이면 일단 웃으세요. 키커는 그다음에 걱정해도 늦지 않아요.',
  '나쁜 비트는 이야기가 되고, 좋은 폴드는 수익이 됩니다. 오늘은 수익 쪽으로!',
  '오늘은 콜링 스테이션 금지. 레이즈 아니면 폴드, 화끈하게 가세요.',
  '상대가 오래 고민한다면 그건 당신의 기운이 무섭다는 뜻입니다.',
  '팟 오즈가 당신 편입니다. 수학을 믿으면 오늘은 수학이 보답해요.',
  '하이롤러의 기운이 살짝 비칩니다. 단, 바이인은 계획대로!',
  '오늘의 금기어: "한 번만 더 바이인." 오늘의 행운어: "나이스 폴드."',
  '플랍이 마음에 안 들어도 괜찮아요. 오늘 턴과 리버는 당신이 쓰는 각본입니다.',
  '포커는 사람을 치는 게임. 오늘은 카드보다 표정을 읽으세요.',
  '체크는 약해 보이는 게 아니라 함정일 수도. 오늘은 체크-레이즈가 빛나는 날.',
  '역전의 기운! 오늘은 숏스택에서 칩리더까지 한 번에 갈 수 있습니다.',
  '딜러에게 미소를. 오늘 카드는 웃는 사람에게 갑니다.',
  '쿨러를 맞아도 웃으세요. 오늘의 운은 마지막 핸드에 몰려 있습니다.',
  '블라인드가 오를수록 강해지는 당신. 오늘은 후반 뒷심 주의!',
];

export function localDateKey(date = new Date()) {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function randomInt(max: number) {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0] % max;
  }
  return Math.floor(Math.random() * max);
}

function drawCards(): [Card, Card] {
  const first = randomInt(52);
  let second = randomInt(51);
  if (second >= first) second += 1;
  const toCard = (index: number): Card => ({ rank: RANKS[index % 13], suit: SUITS[Math.floor(index / 13)] });
  return [toCard(first), toCard(second)];
}

function isValidDraw(value: unknown): value is DailyDraw {
  const draw = value as DailyDraw;
  return !!draw && typeof draw.date === 'string' && typeof draw.fortune === 'string'
    && Array.isArray(draw.cards) && draw.cards.length === 2
    && draw.cards.every((card) => RANKS.includes(card?.rank) && SUITS.includes(card?.suit));
}

// Today's saved draw on this device, or null if it hasn't been drawn yet today.
export function peekTodayDraw(): DailyDraw | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return isValidDraw(saved) && saved.date === localDateKey() ? saved : null;
  } catch {
    return null;
  }
}

// Today's draw for this device, drawing and saving a new one on the first look of the day.
export function getTodayDraw(): DailyDraw {
  const saved = peekTodayDraw();
  if (saved) return saved;
  const draw: DailyDraw = { date: localDateKey(), fortune: FORTUNES[randomInt(FORTUNES.length)], cards: drawCards() };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draw));
  } catch {
    // Private mode or blocked storage: the draw still shows, it just won't persist.
  }
  return draw;
}

export type HandRead = { name: string; comment: string };

const NICKNAMES: Record<string, HandRead> = {
  AA: { name: '포켓 로켓 🚀', comment: '오늘 받을 수 있는 최고의 패. 판을 키우세요!' },
  KK: { name: '카우보이 🤠', comment: '에이스만 안 깔리면 오늘 테이블은 당신 것.' },
  QQ: { name: '레이디스 👸', comment: '우아하게, 하지만 에이스·킹은 조심해서.' },
  JJ: { name: '훅스 🪝', comment: '강하지만 까다로운 패. 플랍을 보고 판단하세요.' },
  TT: { name: '다임 🔟', comment: '든든한 중간 페어. 꾸준함이 무기인 날.' },
  '22': { name: '덕스 🦆', comment: '작지만 세트가 뜨면 아무도 못 말립니다.' },
  AK: { name: '빅 슬릭 ✨', comment: '아직 아무것도 아니지만 뭐든 될 수 있는 패.' },
  AQ: { name: '빅 칙 🐥', comment: '빅 슬릭의 동생. 키커 싸움에서 웃는 날.' },
  KQ: { name: '로열 커플 💑', comment: '그림 두 장, 분위기 좋은 출발.' },
};

const rankValue = (rank: string) => RANKS.indexOf(rank) + 2;

// A name and one-line take on the two hole cards, from nicknames down to generic categories.
export function describeHand([a, b]: [Card, Card]): HandRead {
  const [high, low] = rankValue(a.rank) >= rankValue(b.rank) ? [a, b] : [b, a];
  const key = `${high.rank}${low.rank}`;
  const suited = a.suit === b.suit;
  const gap = rankValue(high.rank) - rankValue(low.rank);

  if (key === '72' && !suited) return { name: '해머 🔨', comment: '홀덤 최악의 패. 그래서 오늘은 블러프하기 최고의 날?' };
  const nickname = NICKNAMES[key];
  if (nickname) return suited ? { ...nickname, name: `수딧 ${nickname.name}` } : nickname;
  if (gap === 0) return { name: `포켓 ${rankLabel(high.rank)} 🎯`, comment: '세트만 맞으면 대박. 플랍을 기대하세요.' };
  if (suited && gap === 1) return { name: '수딧 커넥터 🌈', comment: '스트레이트와 플러시 냄새가 솔솔 납니다.' };
  if (suited) return { name: `수딧 ${SUIT_SYMBOL[a.suit]}`, comment: '플러시의 꿈을 꿔보는 날.' };
  if (high.rank === 'A') return { name: '에이스 하이 🅰️', comment: '키커가 걱정이지만 에이스는 에이스.' };
  if (rankValue(low.rank) >= 10) return { name: '브로드웨이 🎭', comment: '그림 카드 두 장, 기분 좋은 출발.' };
  if (gap === 1) return { name: '커넥터 🔗', comment: '스트레이트를 노려볼 만한 패.' };
  if (rankValue(high.rank) >= 11) return { name: '그림 한 장 🃏', comment: '하이 카드가 든든하게 받쳐주는 날. 플랍을 보고 결정하세요.' };
  return { name: '트래시 핸드 🗑️', comment: '오늘은 폴드의 미학을 배우는 날.' };
}
