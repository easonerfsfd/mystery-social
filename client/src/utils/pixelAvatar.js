function hash(s) {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619) >>> 0
  }
  return h
}

function rng(seed) {
  let v = hash(seed + 'rng')
  return () => {
    v = Math.imul(v ^ (v >>> 16), 0x45d9f3b) >>> 0
    v = Math.imul(v ^ (v >>> 16), 0x45d9f3b) >>> 0
    return (v >>> 0) / 4294967296
  }
}

export function pixelAvatar(seed, size = 64) {
  const canvas = document.createElement('canvas')
  const N = 16
  canvas.width = canvas.height = N
  const ctx = canvas.getContext('2d')
  const r = rng(seed)

  const bgHue = Math.floor(r() * 360)
  const SKINS = ['#FDDBB4','#F5C99A','#EBB882','#D4956A','#BE7D52','#A0624A','#7C4A32']
  const HAIR_COLORS = ['#1a1a1a','#3d2b1f','#6b3a2a','#8B4513','#c8a96e','#e8d5b0',
                       '#ff6b9d','#7b68ee','#4169e1','#2e8b57','#ff4500','#daa520']
  const skin = SKINS[Math.floor(r() * SKINS.length)]
  const hairColor = HAIR_COLORS[Math.floor(r() * HAIR_COLORS.length)]
  const shirtHue = Math.floor(r() * 360)
  const shirtSat = 50 + Math.floor(r() * 40)
  const SHIRT = `hsl(${shirtHue},${shirtSat}%,50%)`
  const SHIRT_DARK = `hsl(${shirtHue},${shirtSat}%,38%)`
  const pantHue = (shirtHue + 120 + Math.floor(r() * 120)) % 360
  const PANTS = `hsl(${pantHue},40%,35%)`

  const p = (x, y, col) => { ctx.fillStyle = col; ctx.fillRect(x, y, 1, 1) }
  const row = (y, xs, col) => xs.forEach(x => p(x, y, col))

  ctx.fillStyle = `hsl(${bgHue},55%,92%)`
  ctx.fillRect(0, 0, N, N)

  for (let y = 3; y <= 6; y++) for (let x = 5; x <= 10; x++) p(x, y, skin)
  p(4,4,skin); p(4,5,skin); p(11,4,skin); p(11,5,skin)

  const hairStyle = Math.floor(r() * 6)
  if (hairStyle === 0) { row(2,[5,6,7,8,9,10],hairColor); row(3,[4,5,10,11],hairColor) }
  else if (hairStyle === 1) { row(2,[4,5,6,7,8,9,10,11],hairColor); row(3,[4,11],hairColor); row(4,[4,11],hairColor); row(5,[4],hairColor) }
  else if (hairStyle === 2) { row(1,[6,7,8,9],hairColor); row(2,[5,6,7,8,9,10],hairColor); row(3,[4,5,10,11],hairColor); p(7,0,hairColor); p(8,0,hairColor) }
  else if (hairStyle === 3) { row(2,[6,7,8,9],hairColor); row(3,[5,6,9,10],hairColor); p(5,4,hairColor); p(10,4,hairColor) }
  else if (hairStyle === 4) { row(2,[4,5,6,7,8,9,10,11],hairColor); for(let y=3;y<=7;y++){p(4,y,hairColor);p(11,y,hairColor)} row(8,[4,11],hairColor) }
  else { row(1,[6,7,8,9],hairColor); row(2,[4,5,6,7,8,9,10,11],hairColor); row(3,[3,4,5,10,11,12],hairColor); p(3,4,hairColor); p(12,4,hairColor) }

  p(6,4,'#1a1a1a'); p(9,4,'#1a1a1a'); p(7,4,'#fff'); p(10,4,'#fff')

  const mouthColor = ['#e07070','#c85050','#e09090'][Math.floor(r()*3)]
  const mouthStyle = Math.floor(r() * 4)
  if (mouthStyle === 0) { p(7,6,mouthColor); p(8,6,mouthColor) }
  else if (mouthStyle === 1) { row(6,[6,7,8,9],mouthColor) }
  else if (mouthStyle === 2) { p(7,6,'#fff'); p(8,6,'#fff'); p(6,6,mouthColor); p(9,6,mouthColor); p(7,7,mouthColor); p(8,7,mouthColor) }
  else { p(7,7,mouthColor); p(8,7,mouthColor); p(6,6,mouthColor); p(9,6,mouthColor) }

  p(7,7,skin); p(8,7,skin)

  const shirtStyle = Math.floor(r() * 4)
  if (shirtStyle === 0) { for(let y=8;y<=11;y++) for(let x=5;x<=10;x++) p(x,y,SHIRT); row(8,[4,11],SHIRT); row(9,[4,11],SHIRT) }
  else if (shirtStyle === 1) { for(let y=8;y<=11;y++){const col=y%2===0?SHIRT:SHIRT_DARK; for(let x=5;x<=10;x++) p(x,y,col); p(4,y,col); if(y<=9)p(11,y,col)} }
  else if (shirtStyle === 2) { for(let y=8;y<=11;y++) for(let x=5;x<=10;x++) p(x,y,SHIRT); row(8,[4,11],SHIRT); row(9,[4,11],SHIRT); p(7,10,SHIRT_DARK); p(8,10,SHIRT_DARK); p(7,11,SHIRT_DARK); p(8,11,SHIRT_DARK) }
  else { for(let y=8;y<=11;y++) for(let x=5;x<=10;x++) p(x,y,SHIRT); row(8,[4,11],SHIRT); row(9,[4,11],SHIRT); for(let y=8;y<=11;y++){p(7,y,'#fff');p(8,y,'#fff')} }

  for(let y=12;y<=13;y++) for(let x=5;x<=10;x++) p(x,y,PANTS)
  p(5,14,PANTS); p(6,14,PANTS); p(9,14,PANTS); p(10,14,PANTS)
  row(15,[4,5,6],'#333'); row(15,[9,10,11],'#333')

  if (r() < 0.3) {
    const acc = Math.floor(r() * 3)
    if (acc === 0) { p(5,4,'#666'); p(8,4,'#666'); p(10,4,'#666') }
    else if (acc === 1) { const capHue=Math.floor(r()*360); const CAP=`hsl(${capHue},60%,45%)`; row(2,[4,5,6,7,8,9,10,11],CAP); row(1,[5,6,7,8,9,10],CAP) }
    else { const sc=`hsl(${Math.floor(r()*360)},70%,55%)`; p(7,8,sc); p(8,8,sc); p(7,9,sc); p(8,9,sc) }
  }

  return canvas.toDataURL()
}
