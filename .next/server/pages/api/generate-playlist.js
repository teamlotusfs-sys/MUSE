"use strict";(()=>{var e={};e.id=49,e.ids=[49],e.modules={145:e=>{e.exports=require("next/dist/compiled/next-server/pages-api.runtime.prod.js")},249:(e,r)=>{Object.defineProperty(r,"l",{enumerable:!0,get:function(){return function e(r,t){return t in r?r[t]:"then"in r&&"function"==typeof r.then?r.then(r=>e(r,t)):"function"==typeof r&&"default"===t?r:void 0}}})},414:(e,r,t)=>{t.r(r),t.d(r,{config:()=>c,default:()=>u,routeModule:()=>d});var a={};t.r(a),t.d(a,{default:()=>l});var n=t(802),o=t(153),i=t(249);let s=`You are an elite music curator with encyclopedic knowledge of music across all genres and eras. Your playlists are genuinely great — not generic, not obvious.

MOOD-TO-ARTIST REFERENCE GUIDE:

LATE NIGHT / CITY / NOCTURNAL:
  Artists: The Weeknd, Frank Ocean, James Blake, Sade, Com Truise, Kavinsky, Floating Points, Massive Attack, Portishead, Banks, How To Dress Well, Rhye, Majid Jordan, dvsn, Kaytranada, Blood Orange
  Vibe: atmospheric, sensual, slow-burning, urban

MELANCHOLY / HEARTBREAK / INTROSPECTION:
  Artists: Bon Iver, Phoebe Bridgers, Nick Drake, Elliott Smith, Sufjan Stevens, Julien Baker, Sharon Van Etten, Grouper, Alex G, Hand Habits, Japanese Breakfast, Bedouine
  Vibe: sparse, raw, emotionally heavy, intimate

EUPHORIC / JOYFUL / SUMMER:
  Artists: Daft Punk, Pharrell Williams, Lizzo, Carly Rae Jepsen, MNEK, Chromeo, Jungle, Parcels, Franc Moody, Surfaces, Still Woozy, Rex Orange County
  Vibe: bright, danceable, warm, feels-good

FOCUS / STUDY / DEEP WORK:
  Artists: Brian Eno, Nils Frahm, Max Richter, \xd3lafur Arnalds, Four Tet, Jon Hopkins, Tycho, Bonobo, Kiasmos, Rival Consoles, Hammock, Hiroshi Yoshimura
  Vibe: minimal, textural, no lyrics, low distraction

HYPE / ENERGY / WORKOUT:
  Artists: Travis Scott, Kendrick Lamar, Playboi Carti, Bicep, Disclosure, Fred again.., Skrillex, Jamie xx, Justice, Gesaffelstein, Aphex Twin
  Vibe: aggressive, high-tempo, adrenaline

INDIE / ALTERNATIVE / GUITARS:
  Artists: Arctic Monkeys, Tame Impala, Radiohead, Beach House, Vampire Weekend, LCD Soundsystem, Alvvays, Soccer Mommy, Snail Mail, Men I Trust
  Vibe: guitar-forward, indie sensibility, varying energy

CURATION RULES:
1. Mix 60% well-known tracks with 40% deeper cuts.
2. Think about arc and flow: beginning, middle, and end.
3. Never repeat an artist more than twice.
4. Pick specific, real songs that actually fit the mood.
5. Return exactly 15 tracks.

Return ONLY valid JSON:
{
  "playlistName": "evocative name",
  "description": "one sentence",
  "tracks": [
    { "title": "Song", "artist": "Artist" }
  ]
}`;async function l(e,r){if("POST"!==e.method)return r.setHeader("Allow",["POST"]),r.status(405).json({error:"Method not allowed"});let{prompt:t}=e.body,a="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";if(!a)return r.status(500).json({error:"Groq API key not configured"});if(!t)return r.status(400).json({error:"Prompt required"});try{let e=await fetch("https://api.groq.com/openai/v1/chat/completions",{method:"POST",headers:{Authorization:`Bearer ${a}`,"Content-Type":"application/json"},body:JSON.stringify({model:"mixtral-8x7b-32768",messages:[{role:"system",content:s},{role:"user",content:`Create a 15-track playlist for: ${t}`}],temperature:.7,max_tokens:1024})}),n=await e.json();if(!e.ok)return console.error("Groq error:",n),r.status(502).json({error:"Groq API error"});let o=n.choices?.[0]?.message?.content;if(!o)return r.status(500).json({error:"No response from AI"});let i=o.replace(/```json\n?/g,"").replace(/```\n?/g,"").trim(),l=JSON.parse(i);return r.status(200).json(l)}catch(e){return console.error("Error:",e),r.status(500).json({error:e.message})}}let u=(0,i.l)(a,"default"),c=(0,i.l)(a,"config"),d=new n.PagesAPIRouteModule({definition:{kind:o.x.PAGES_API,page:"/api/generate-playlist",pathname:"/api/generate-playlist",bundlePath:"",filename:""},userland:a})},153:(e,r)=>{var t;Object.defineProperty(r,"x",{enumerable:!0,get:function(){return t}}),function(e){e.PAGES="PAGES",e.PAGES_API="PAGES_API",e.APP_PAGE="APP_PAGE",e.APP_ROUTE="APP_ROUTE"}(t||(t={}))},802:(e,r,t)=>{e.exports=t(145)}};var r=require("../../webpack-api-runtime.js");r.C(e);var t=r(r.s=414);module.exports=t})();