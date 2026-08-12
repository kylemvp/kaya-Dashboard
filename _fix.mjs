import puppeteer from 'puppeteer-core'
const EXE='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const U=process.env.TARGET
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:EXE,headless:'new',args:['--no-sandbox'],protocolTimeout:200000})
let pass=0,fail=0
const ok=(n,c,e='')=>{c?pass++:fail++;console.log(`   ${c?'✅':'❌'} ${n}${e?'  '+e:''}`)}

// حالة المستخدم: علامة v1 موجودة + كل القوايم فاضية
{
  const p=await b.newPage(); p.setDefaultNavigationTimeout(90000)
  await p.setViewport({width:1400,height:900})
  await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(3000)
  await p.evaluate(()=>{
    localStorage.clear()
    localStorage.setItem('kaya_admin_seeded_v1','true')
    for(const k of ['services_v4','doctors_v2','reviews_v2','vouchers_v2','verticals_v4','requests_v2','locations_v2'])
      localStorage.setItem('kaya_admin_'+k,'[]')
    localStorage.setItem('kaya_admin_session_v1', JSON.stringify({id:'demo-admin',email:'admin@kaya.ae',name:'Aisha Rahman',title:'Administrator',role:'admin'}))
  })
  await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(4500)
  const s=await p.evaluate(()=>({
    stats:[...document.querySelectorAll('.ad-ov-stat-val')].map(e=>e.textContent).join(','),
    shell:!!document.querySelector('.ad-shell'),
  }))
  console.log('\n  حالتك بالظبط (علامة v1 + قوايم فاضية)')
  ok('البيانات رجعت', s.stats==='8,24,7,6,4,12,11,15', s.stats||'(فاضي)')
  ok('الداشبورد ظاهر', s.shell)
  await p.close()
}

// تأكيد: الحذف المتعمّد لسه محترم
{
  const p=await b.newPage(); p.setDefaultNavigationTimeout(90000)
  await p.setViewport({width:1400,height:900})
  await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(3000)
  await p.evaluate(()=>localStorage.clear())
  await p.goto(U,{waitUntil:'domcontentloaded'}); await pause(3500)
  await p.evaluate(()=>{const r=[...document.querySelectorAll('.ad-login-demo-row')][0];if(r)r.click()})
  await pause(2500)
  // بعد ما النسخة دي تكتب علامتها، فضّي قايمة عمداً
  await p.evaluate(()=>localStorage.setItem('kaya_admin_vouchers_v2','[]'))
  await p.reload({waitUntil:'domcontentloaded'}); await pause(4000)
  const v=await p.evaluate(()=>JSON.parse(localStorage.getItem('kaya_admin_vouchers_v2')||'[]').length)
  console.log('\n  الحذف المتعمّد')
  ok('القايمة الفاضية اتسابت زي ما هي', v===0, `vouchers=${v}`)
  await p.close()
}
console.log(`\n  ${pass} ناجح / ${fail} فاشل`)
await b.close()
process.exit(fail?1:0)
