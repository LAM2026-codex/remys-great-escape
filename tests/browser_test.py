from playwright.sync_api import sync_playwright
from pathlib import Path
root=Path(__file__).resolve().parent.parent
(root/'test-results').mkdir(exist_ok=True)
with sync_playwright() as pw:
 browser=pw.chromium.launch()
 page=browser.new_page(viewport={'width':1440,'height':1000},device_scale_factor=1)
 errors=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.goto('http://localhost:4173/?test')
 page.screenshot(path=str(root/'test-results/preview.png'),full_page=True)
 page.get_by_role('button',name='Let’s go, Remy').click()
 page.wait_for_timeout(250)
 x=page.evaluate('window.__remy.player.x')
 page.keyboard.down('ArrowRight');page.wait_for_timeout(500);page.keyboard.up('ArrowRight')
 assert page.evaluate('window.__remy.player.x')>x+60
 page.keyboard.down('Space');page.wait_for_timeout(200)
 assert page.evaluate('window.__remy.player.y')<380
 page.keyboard.up('Space')
 page.keyboard.press('p');assert page.evaluate('window.__remy.state')=='paused'
 page.keyboard.press('p');assert page.evaluate('window.__remy.state')=='playing'
 page.evaluate('Object.assign(__remy.player,{x:2050,y:416,vx:0,vy:0,health:1});__remy.step(1/120)')
 assert page.evaluate('__remy.player.health')==3
 page.evaluate('Object.assign(__remy.player,{y:700});__remy.step(1/120)')
 assert page.evaluate('__remy.player.x')==2050
 assert page.evaluate('__remy.player.health')==2
 page.evaluate('Object.assign(__remy.player,{x:1487,y:250,vx:0,vy:0});__remy.step(1/120)')
 assert page.evaluate('__remy.player.power')>9
 page.evaluate('Object.assign(__remy.player,{x:5185,y:416,vx:0,vy:0});__remy.step(1/120)')
 assert page.evaluate('__remy.state')=='complete'
 page.get_by_role('button',name='Next adventure').click()
 page.get_by_role('button',name='Let’s go, Remy').click()
 page.evaluate('Object.assign(__remy.player,{health:1,y:700});__remy.step(1/120)')
 assert page.evaluate('__remy.state')=='over'
 page.get_by_role('button',name='Try again').click()
 assert page.evaluate('__remy.player.health')==3
 # Mechanics render and state smoke checks. Full input-driven routes run in Node.
 for stage in range(12):
  page.evaluate('(i)=>__remy.loadLevel(i)',stage)
  page.wait_for_timeout(40)
  assert page.evaluate('__remy.level')==stage
  assert page.locator('#challenge-status').inner_text()
  page.evaluate('''(()=>{const w=__remy.world;w.tokens.forEach(t=>t.taken=true);Object.assign(__remy.player,{x:w.goal.x,y:400,vx:0,vy:0});__remy.step(1/120);})()''')
  assert page.evaluate('__remy.state')=='complete'
 page.reload()
 page.locator('summary').click()
 assert page.locator('#level-list button:enabled').count()==12
 page.goto('http://localhost:4173/?test&stage=6&x=2300')
 page.wait_for_timeout(400)
 assert page.evaluate('__remy.player.swimming')
 before=page.evaluate('__remy.player.y')
 page.keyboard.down('Space');page.wait_for_timeout(500);page.keyboard.up('Space')
 assert page.evaluate('__remy.player.y')<before
 page.screenshot(path=str(root/'test-results/water-preview.png'),full_page=True)
 mobile=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True,device_scale_factor=1)
 mobile.on('pageerror',lambda e:errors.append(str(e)))
 mobile.goto('http://localhost:4173/?test')
 mobile.get_by_role('button',name='Let’s go, Remy').tap()
 mobile.locator('[data-control="right"]').dispatch_event('pointerdown',{'pointerId':1,'pointerType':'touch'})
 mobile.wait_for_timeout(400)
 mobile.locator('[data-control="right"]').dispatch_event('pointerup',{'pointerId':1,'pointerType':'touch'})
 assert mobile.evaluate('__remy.player.x')>130
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 mobile.screenshot(path=str(root/'test-results/mobile-preview.png'),full_page=True)
 print('Browser checks passed; JS errors:',errors)
 assert not errors
 browser.close()
