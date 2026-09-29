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
 for stage in range(15):
  page.evaluate('(i)=>__remy.loadLevel(i)',stage)
  page.wait_for_timeout(40)
  assert page.evaluate('__remy.level')==stage
  assert page.locator('#challenge-status').inner_text()
  page.evaluate('''(()=>{const w=__remy.world;w.tokens.forEach(t=>t.taken=true);Object.assign(__remy.player,{x:w.goal.x,y:400,vx:0,vy:0});__remy.step(1/120);})()''')
  assert page.evaluate('__remy.state')=='complete'
 page.reload()
 page.locator('summary').click()
 assert page.locator('#level-list button:enabled').count()==15
 page.goto('http://localhost:4173/?test&stage=3&x=2300')
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
 assert mobile.locator('.game-shell').evaluate("e=>e.classList.contains('is-focused')")
 mobile.get_by_role('button',name='Toggle running').tap()
 assert mobile.get_by_role('button',name='Toggle running').get_attribute('aria-pressed')=='true'
 cdp=mobile.context.new_cdp_session(mobile)
 def touch(control,ident):
  r=mobile.locator('[data-control="'+control+'"]').bounding_box()
  return {'x':r['x']+r['width']/2,'y':r['y']+r['height']/2,'id':ident}
 right=touch('right',1);jump=touch('jump',2)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[right]})
 mobile.wait_for_timeout(150)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[right,jump]})
 mobile.wait_for_timeout(180)
 assert mobile.evaluate('__remy.player.x')>145
 assert mobile.evaluate('__remy.player.y')<390
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 mobile.wait_for_timeout(400)
 assert abs(mobile.evaluate('__remy.player.vx'))<1
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 for control in ['left','right','run','down','jump']:
  box=mobile.locator('[data-control="'+control+'"]').bounding_box()
  assert box['width']>=64 and box['height']>=64
  assert box['y']+box['height']<=844
 # Long-press menus must be cancelled at the game surface.
 assert mobile.locator('[data-control="right"]').evaluate("e=>!e.dispatchEvent(new MouseEvent('contextmenu',{bubbles:true,cancelable:true}))")
 assert mobile.locator('[data-control="right"]').evaluate("e=>getComputedStyle(e).webkitTouchCallout") in ['none',None,'']
 mobile.screenshot(path=str(root/'test-results/mobile-preview.png'),full_page=True)
 mobile.set_viewport_size({'width':844,'height':390})
 mobile.wait_for_timeout(150)
 assert mobile.evaluate('document.documentElement.scrollWidth<=innerWidth')
 for control in ['left','right','run','down','jump']:
  box=mobile.locator('[data-control="'+control+'"]').bounding_box()
  assert box['y']>=0 and box['y']+box['height']<=390
 mobile.screenshot(path=str(root/'test-results/mobile-landscape.png'),full_page=True)
 mobile.goto('http://localhost:4173/?test&stage=3&x=2300')
 mobile.get_by_role('button',name='Expand game',exact=True).tap()
 mobile.wait_for_timeout(350)
 before=mobile.evaluate('__remy.player.y')
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch('jump',3)]})
 mobile.wait_for_timeout(400)
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 assert mobile.evaluate('__remy.player.y')<before
 cdp.send('Input.dispatchTouchEvent',{'type':'touchStart','touchPoints':[touch('down',4)]})
 mobile.wait_for_timeout(400)
 assert mobile.evaluate('__remy.player.vy')>0
 cdp.send('Input.dispatchTouchEvent',{'type':'touchEnd','touchPoints':[]})
 mobile.get_by_role('button',name='Restore page',exact=True).tap()
 assert not mobile.locator('.game-shell').evaluate("e=>e.classList.contains('is-focused')")
 print('Browser checks passed; JS errors:',errors)
 assert not errors
 browser.close()
