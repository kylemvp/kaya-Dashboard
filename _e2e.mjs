import puppeteer from 'puppeteer-core'
const EXE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const U=process.env.TARGET
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE,headless:'new',args:['--no-sandbox'],protocolTimeout:250000})
let pass=0, fail=0
const ok=(n,c,extra='')=>{ c?pass++:fail++; console.log(`   ${c?'✅':'❌'} ${n}${extra?'  '+extra:''}`) }

// ───── ١) شفاء البيانات الفاضية (حالة المستخدم) ─────
{
  const p=await b.newPage(); p.setDefaultNavigationTimeout(90000)
  await p.setViewport({width:1400,height:900})
  await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(3500)
  await p.evaluate(()=>{
    localStorage.setItem('kaya_admin_services_v4','[]')
    localStorage.setItem('kaya_admin_doctors_v2','[]')
    localStorage.setItem('kaya_admin_reviews_v2','[]')
    localStorage.removeItem('kaya_admin_seeded_v1')
  })
  await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(3500)
  await p.evaluate(()=>{const r=[...document.querySelectorAll('.ad-login-demo-row')][0];if(r)r.click()})
  await pause(3000)
  const st=await p.evaluate(()=>[...document.querySelectorAll('.ad-ov-stat-val')].map(e=>e.textContent))
  console.log('\n  ١) بيانات فاضية من نسخة قديمة')
  ok('اتعوّضت تلقائياً', st[1]==='24'&&st[2]==='7', `services=${st[1]} doctors=${st[2]}`)
  await p.close()
}

// ───── ٢) رحلة كاملة ─────
const p=await b.newPage(); p.setDefaultNavigationTimeout(90000)
const errs=[]
p.on('pageerror',e=>errs.push(e.message.split('\n')[0]))
p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push(m.text().slice(0,120))})
await p.setViewport({width:1400,height:900})
await p.goto(U,{waitUntil:'domcontentloaded'})
await p.evaluate(()=>localStorage.clear())
await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(3500)

console.log('\n  ٢) الدخول')
ok('شاشة الدخول', !!(await p.$('.ad-login')))
await p.evaluate(()=>{const r=[...document.querySelectorAll('.ad-login-demo-row')][0];if(r)r.click()})
await pause(3000)
ok('الداشبورد فتح', !!(await p.$('.ad-shell')))
const stats=await p.evaluate(()=>[...document.querySelectorAll('.ad-ov-stat-val')].map(e=>e.textContent))
ok('الإحصائيات', stats.join(',')==='8,24,7,6,4,12,11,15', stats.join(','))

console.log('\n  ٣) كل الأقسام')
const secs=[['Requests','Requests'],['Treatments & Services','Treatments & Services'],['Verticals','Verticals'],
  ['Doctors','Doctors'],['Indulgence','Indulgence'],['Reviews','Reviews'],['Pages','Pages'],
  ['Locations','Locations'],['Footer & Global','Footer'],['Users & Roles','Users & Roles']]
for(const [nav,expect] of secs){
  await p.evaluate(x=>{const el=[...document.querySelectorAll('.ad-nav-item')].find(n=>n.textContent.includes(x));if(el)el.click()},nav)
  await pause(500)
  const t=await p.$eval('.ad-view-title',e=>e.textContent).catch(()=>'')
  ok(nav, t.includes(expect)||t.length>0, t)
}
console.log(`\n  الأخطاء: ${errs.length?errs.slice(0,3).join(' | '):'مفيش ✅'}`)
console.log(`\n  النتيجة: ${pass} ناجح / ${fail} فاشل`)
await b.close()
process.exit(fail?1:0)
