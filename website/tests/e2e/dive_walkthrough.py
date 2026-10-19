"""End-to-end walkthrough of the dive (needs: pip install playwright && playwright install chromium).
Usage: python dive_walkthrough.py [width height tag locale]. Screenshots go to tests/e2e/shots/ (git-ignored)."""
import asyncio, sys
from playwright.async_api import async_playwright
from pathlib import Path
URL=(Path(__file__).resolve().parents[2]/"dive"/"index.html").as_uri()
OUT=Path(__file__).resolve().parent/"shots"; OUT.mkdir(exist_ok=True)
async def main(w=1280,h=800,tag="d"):
    async with async_playwright() as pw:
        b=await pw.chromium.launch()
        ctx=await b.new_context(viewport={"width":w,"height":h}, locale=sys.argv[4] if len(sys.argv)>4 else "en-US", has_touch=False); pg=await ctx.new_page()
        errs=[]
        pg.on("console", lambda m: errs.append(m.text) if m.type in("error","warning") else None)
        pg.on("pageerror", lambda e: errs.append("PAGEERR "+str(e)))
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        async def shot(n): await pg.screenshot(path=str(OUT/f"{tag}-{n}.png"))
        await shot("00-map")
        for i in range(3):
            await pg.click("#marker"); await pg.wait_for_timeout(3000); await shot(f"0{i+1}-zoom")
        await pg.click("#marker"); await pg.wait_for_timeout(4800); await shot("04-poster")
        print("idx after map", await pg.evaluate("__dive.idx"))
        for i in range(6): await pg.keyboard.press("PageDown"); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1800); await shot("05-diver-mid")
        print("idx", await pg.evaluate("__dive.idx"))
        for i in range(10): await pg.keyboard.press("PageDown"); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(3500); await shot("06-bow"); print("idx", await pg.evaluate("__dive.idx"))
        await pg.click('[data-hs="bow"]'); await pg.wait_for_timeout(1800); await shot("07-bow-card")
        await pg.click("#card-close"); await pg.wait_for_timeout(700)
        for i in range(8): await pg.keyboard.press("PageDown"); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(2500); await shot("08-capstans"); print("idx", await pg.evaluate("__dive.idx"))
        await pg.click('[data-hs="people"]'); await pg.wait_for_timeout(1800); await shot("09-people")
        await pg.click("#card-close"); await pg.wait_for_timeout(700)
        await pg.click('[data-hs="crew"]'); await pg.wait_for_timeout(1800); await shot("10-crew")
        await pg.click("#card-close"); await pg.wait_for_timeout(700)
        for i in range(8): await pg.keyboard.press("PageDown"); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(1500); await shot("11a-door-black")
        await pg.wait_for_timeout(1700); await shot("11b-door-lit")
        await pg.wait_for_timeout(1000); await shot("11c-door-opening")
        await pg.wait_for_timeout(3500); await shot("12-cabin"); print("idx", await pg.evaluate("__dive.idx"))
        await pg.click('[data-hs="sections"]'); await pg.wait_for_timeout(5500); await shot("13-sections")
        await pg.click('.zone-chip[data-z="third"]'); await pg.wait_for_timeout(600); await shot("13b-third")
        await pg.click("#card-close"); await pg.wait_for_timeout(700)
        for i in range(8): await pg.keyboard.press("PageDown"); await pg.wait_for_timeout(250)
        await pg.wait_for_timeout(2500); await shot("14-window"); print("idx", await pg.evaluate("__dive.idx"))
        for i in range(8): await pg.keyboard.press("PageDown"); await pg.wait_for_timeout(100)
        await pg.wait_for_timeout(1200); print("still window?", await pg.evaluate("__dive.idx"))
        await pg.click('[data-hs="window"]'); await pg.wait_for_timeout(4200); await shot("15-stairs"); print("idx", await pg.evaluate("__dive.idx"))
        await pg.click('[data-hs="railing"]'); await pg.wait_for_timeout(1800); await shot("16-warp")
        await pg.wait_for_timeout(2600); await shot("16b-flash")
        await pg.wait_for_timeout(5500); await shot("17-dossier"); print("idx", await pg.evaluate("__dive.idx"), await pg.evaluate("JSON.stringify(__dive.passenger)"))
        print("ERRORS", errs)
        await b.close()
w=int(sys.argv[1]) if len(sys.argv)>1 else 1280; h=int(sys.argv[2]) if len(sys.argv)>2 else 800
asyncio.run(main(w,h,sys.argv[3] if len(sys.argv)>3 else "d"))
