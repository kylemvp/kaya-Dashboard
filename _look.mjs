import puppeteer from 'puppeteer-core'
const OUT=process.env.SHOT
const pause=ms=>new Promise(r=>setTimeout(r,ms))
const b=await puppeteer.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:'new',args:['--no-sandbox'],protocolTimeout:200000})
for (const [label,url] of [['live','https://kaya-cms.vercel.app'],['local','http://localhost:1000']]) {
  const p=await b.newPage(); p.setDefaultNavigationTimeout(120000)
  const errs=[]
  p.on('pageerror',e=>errs.push('PAGEERROR: '+e.message.split('\n')[0]))
  p.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404'))errs.push('CONSOLE: '+m.text().slice(0,140))})
  p.on('response',r=>{if(r.status()>=400&&!r.url().includes('favicon'))errs.push('HTTP '+r.status()+' '+r.url().slice(-60))})
  await p.setCacheEnabled(false)
  await p.setViewport({width:1440,height:900})
  await p.goto(url,{waitUntil:'networkidle0'})
  await pause(2500)
  const s=await p.evaluate(()=>{
    const card=document.querySelector('.ad-login-card')
    const cs=card?getComputedStyle(card):null
    return {
      login:!!card,
      rows:document.querySelectorAll('.ad-login-demo-row').length,
      styled: cs ? (cs.background.includes('rgb') && cs.borderRadius!=='0px') : false,
      radius: cs?cs.borderRadius:'—',
      bodyBg: getComputedStyle(document.body).backgroundColor,
      sheets: document.styleSheets.length,
      txt: document.body.innerText.trim().slice(0,50).replace(/\n/g,' | '),
    }
  })
  console.log(`  ${label}: login=${s.login?'✅':'❌'} حسابات=${s.rows} مستايل=${s.styled?'✅':'❌'} radius=${s.radius} bodyBg=${s.bodyBg} sheets=${s.sheets}`)
  console.log(`     "${s.txt}"`)
  if(errs.length) errs.slice(0,4).forEach(e=>console.log('     ⚠ '+e))
  await p.screenshot({path:`${OUT}/look-${label}.png`})
  await p.close()
}
await b.close()
