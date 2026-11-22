(function(){const a=document.createElement("link").relList;if(a&&a.supports&&a.supports("modulepreload"))return;for(const d of document.querySelectorAll('link[rel="modulepreload"]'))p(d);new MutationObserver(d=>{for(const r of d)if(r.type==="childList")for(const t of r.addedNodes)t.tagName==="LINK"&&t.rel==="modulepreload"&&p(t)}).observe(document,{childList:!0,subtree:!0});function i(d){const r={};return d.integrity&&(r.integrity=d.integrity),d.referrerPolicy&&(r.referrerPolicy=d.referrerPolicy),d.crossOrigin==="use-credentials"?r.credentials="include":d.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function p(d){if(d.ep)return;d.ep=!0;const r=i(d);fetch(d.href,r)}})();async function M(e,a){const i=await fetch(e,{...a,headers:{...a?.body instanceof FormData?{}:{"Content-Type":"application/json"},...a?.headers||{}}});if(!i.ok){let p=`HTTP ${i.status}`;try{const d=await i.json();d?.error&&(p=d.error)}catch{}throw new Error(p)}return i.json()}const S={getBootstrap(e){const a=e?`?date=${encodeURIComponent(e)}`:"";return M(`/api/v1/bootstrap${a}`)},getTrend(e,a){const i=`?metric=${encodeURIComponent(e)}&horizon=${encodeURIComponent(a)}`;return M(`/api/v1/trends${i}`)},updatePreferences(e){return M("/api/v1/preferences",{method:"PUT",body:JSON.stringify(e)})},updateActivePhase(e){return M("/api/v1/phases/active",{method:"PUT",body:JSON.stringify(e)})},logCheckin(e){return M("/api/v1/checkins",{method:"POST",body:JSON.stringify(e)})},logWorkout(e){return M("/api/v1/workouts",{method:"POST",body:JSON.stringify(e)})},syncWorkoutsBatch(e){return M("/api/v1/workouts/sync",{method:"POST",body:JSON.stringify({workouts:e})})},logBody(e,a,i){return M("/api/v1/body",{method:"POST",body:JSON.stringify({weight_lb:e,body_fat_pct:a||0,local_date:i||""})})},saveCalibration(e,a,i,p){return M("/api/v1/calibrations",{method:"POST",body:JSON.stringify({local_date:p||"",gh_readiness:e,gh_sleep_score:a,gh_cardio_load:i})})},importXLSXFile(e){const a=new FormData;return a.append("file",e),M("/api/v1/import/xlsx",{method:"POST",body:a})},importXLSXUrl(e){return M("/api/v1/import/xlsx",{method:"POST",body:JSON.stringify({sheet_url:e})})},importFITFile(e,a){const i=new FormData;return i.append("file",e),a&&i.append("title",a),M("/api/v1/import/fit",{method:"POST",body:i})},generateSampleFIT(){return M("/api/v1/import/fit",{method:"POST",body:JSON.stringify({generate_sample:!0,title:"Garmin Threshold Progression (.FIT)"})})},getSampleSHLink(){return M("/api/v1/import/medical/sample-shlink")},importMedical(e){return M("/api/v1/import/medical",{method:"POST",body:JSON.stringify(e)})},seedDemo(){return M("/api/v1/demo/seed",{method:"POST",body:"{}"})},triggerSync(){return M("/api/v1/integrations/sync",{method:"POST",body:"{}"})}};function re(e,a="var(--m3-teal)",i=72,p=24){const d=e.filter(g=>g!=null&&!Number.isNaN(g));if(d.length<2)return`<svg width="${i}" height="${p}" viewBox="0 0 ${i} ${p}"></svg>`;const r=Math.min(...d),t=Math.max(...d),l=Math.max(1,t-r),s=3,c=4,o=(i-s*2)/Math.max(1,e.length-1);let y="",m=!1,v=0,b=0;return e.forEach((g,w)=>{if(g==null||Number.isNaN(g)){m=!1;return}const k=s+w*o,z=p-c-(g-r)/l*(p-c*2);y+=`${m?"L":"M"}${k.toFixed(1)},${z.toFixed(1)} `,m=!0,v=k,b=z}),`
    <svg width="${i}" height="${p}" viewBox="0 0 ${i} ${p}" style="overflow: visible; flex-shrink: 0;" aria-hidden="true">
      <path d="${y.trim()}" fill="none" stroke="${a}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${v.toFixed(1)}" cy="${b.toFixed(1)}" r="2.6" fill="${a}" />
    </svg>
  `}function pe(e,a,i,p="--m3-teal",d){if(!e||!a.length)return;const r=e.getBoundingClientRect(),t=Math.max(220,r.width||320),l=Math.max(90,r.height||120),s=window.devicePixelRatio||1;e.width=Math.round(t*s),e.height=Math.round(l*s);const c=e.getContext("2d");if(!c)return;c.scale(s,s),c.clearRect(0,0,t,l);const o=getComputedStyle(document.getElementById("m3-app")||document.documentElement),y=o.getPropertyValue(p).trim()||"#0b7f6b",m=o.getPropertyValue("--m3-surface-dim").trim()||"#e2ebe8",v=o.getPropertyValue("--m3-ink-2").trim()||"#556b67",b=o.getPropertyValue("--m3-hairline").trim()||"rgba(0,0,0,0.1)",g=10,k=l-g-20,z=Math.max(d||1,...a,1)*1.1;if(d&&d>0){const I=g+k-d/z*k;c.save(),c.setLineDash([4,4]),c.strokeStyle=b,c.lineWidth=1.2,c.beginPath(),c.moveTo(4,I),c.lineTo(t-4,I),c.stroke(),c.restore()}const O=a.length,V=(t-8)/O,P=Math.max(5,Math.min(18,V*.58));a.forEach((I,F)=>{const L=4+V*F+V/2,ie=L-P/2;be(c,ie,g,P,k,P/2,m);const G=Math.max(I>0?5:0,Math.max(0,I)/z*k);G>0&&be(c,ie,g+k-G,P,G,P/2,y),(O<=7||F===0||F===Math.floor(O/2)||F===O-1||O===24&&F%6===0)&&i[F]&&(c.fillStyle=v,c.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif",c.textAlign="center",c.fillText(i[F],L,l-5))})}function Oe(e,a,i="--m3-coral"){if(!e||a.length<2)return;const p=e.getBoundingClientRect(),d=Math.max(90,p.width||130),r=Math.max(30,p.height||38),t=window.devicePixelRatio||1;e.width=Math.round(d*t),e.height=Math.round(r*t);const l=e.getContext("2d");if(!l)return;l.scale(t,t),l.clearRect(0,0,d,r);const c=getComputedStyle(document.getElementById("m3-app")||document.documentElement).getPropertyValue(i).trim()||"#df3c2a",o=Math.min(...a),y=Math.max(...a),m=Math.max(1,y-o),v=(d-8)/(a.length-1);l.strokeStyle=c,l.lineWidth=2.2,l.lineCap="round",l.lineJoin="round",l.beginPath(),a.forEach((b,g)=>{const w=4+g*v,k=r-5-(b-o)/m*(r-10);g===0?l.moveTo(w,k):l.lineTo(w,k)}),l.stroke()}function be(e,a,i,p,d,r,t){const l=Math.min(r,p/2,d/2);e.fillStyle=t,e.beginPath(),e.moveTo(a+l,i),e.arcTo(a+p,i,a+p,i+d,l),e.arcTo(a+p,i+d,a,i+d,l),e.arcTo(a,i+d,a,i,l),e.arcTo(a,i,a+p,i,l),e.closePath(),e.fill()}function Ie(e,a){const t=Math.max(8,Math.min(262,262*Math.min(1,Math.max(0,e)))),l=Math.max(8,Math.min(190,190*Math.min(1,Math.max(0,a))));return`
    <svg width="132" height="132" viewBox="0 0 136 136" aria-hidden="true">
      <g transform="rotate(140 68 68)">
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal-track)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="262 ${364.4}" />
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="${t.toFixed(1)} ${364.4}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber-track)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="190 ${263.9}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${l.toFixed(1)} ${263.9}" />
      </g>
    </svg>
  `}function Fe(e,a,i){const d=2*Math.PI*13,r=d*.82,t=Math.max(3,Math.min(r,r*Math.min(1,Math.max(0,e))));return`
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <g transform="rotate(122 16 16)">
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--m3-teal-track)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${r.toFixed(1)} ${d.toFixed(1)}" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--m3-teal)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${t.toFixed(1)} ${d.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 11px; font-weight: ${i?800:600};">${a}</span>
    </div>
  `}function fe(e,a,i,p=64){const r=2*Math.PI*24,t=r*.74,l=Math.max(.05,Math.min(1,e/100)),s=t*l;return`
    <div style="position: relative; width: ${p}px; height: ${p}px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <svg width="${p}" height="${p}" viewBox="0 0 60 60" aria-hidden="true">
        <g transform="rotate(136 30 30)">
          <circle cx="30" cy="30" r="24" fill="none" stroke="${i}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${t.toFixed(1)} ${r.toFixed(1)}" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="${a}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${s.toFixed(1)} ${r.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;">${Math.round(e)}</span>
    </div>
  `}function Ce(e,a,i,p,d){const r=Math.max(1,e+a+i+p),t=46,l=2*Math.PI*t,s=8,c=[{val:e,color:"var(--m3-blue)"},{val:a,color:"var(--m3-teal)"},{val:i,color:"var(--m3-amber)"},{val:Math.max(8,p),color:"var(--m3-coral)"}];let o=0;return`
    <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <g transform="rotate(-90 60 60)">${c.map(m=>{const v=m.val/r*l,b=Math.max(4,v-s),g=`<circle cx="60" cy="60" r="${t}" fill="none" stroke="${m.color}" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${b.toFixed(1)} ${l.toFixed(1)}"
        stroke-dashoffset="${(-o).toFixed(1)}" />`;return o+=v,g}).join("")}</g>
      </svg>
      <div style="position: absolute; text-align: center;">
        <div class="tabular" style="font-size: 20px; font-weight: 800; line-height: 1.05;">${Math.round(d)}%</div>
        <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Efficiency</div>
      </div>
    </div>
  `}const Ae=[{key:"7d",label:"7D"},{key:"1m",label:"1M"},{key:"3m",label:"3M"},{key:"6m",label:"6M"},{key:"1y",label:"1Y"},{key:"all",label:"All ('22–'26)"}];function Be(e,a,i,p=!1){const d=e?.title||"Bench Press (Working Weight)",r=e?.current||"--",t=e?.delta||"Loading trajectory…",l=e?.summary||"2022–2026 longitudinal density",s=e?.insight||"Tap or drag across any regime to inspect exact dates, gaps, plateaus, and equipment shifts.",c=e?.key||"lift:bench-press",o=!!e?.alt_series?.points?.length,y=a.slice(0,22).map(w=>`
      <button
        type="button"
        class="m3-chip m3-carousel-item"
        id="chip-metric-${w.key.replace(/[^a-z0-9-]/gi,"-")}"
        data-metric-chip="${w.key}"
        data-sel="${w.key===c?"true":"false"}"
      >${j(w.label)}</button>
    `).join(""),m=Ae.map(w=>`
      <button
        type="button"
        id="btn-hz-${w.key}"
        data-hz-btn="${w.key}"
        data-on="${i===w.key?"true":"false"}"
      >${w.label}</button>
    `).join(""),v=e?.monthly_density?.length?e.monthly_density:e?.density||[],b=e?.monthly_labels?.length?e.monthly_labels:e?.labels||[],g=v.slice(-56).map((w,k)=>{const z=b[k]||"";let O="var(--m3-surface-dim)";return w>=5?O="var(--m3-teal)":w>=3?O="hsla(170, 74%, 38%, 0.68)":w>=1&&(O="hsla(170, 64%, 44%, 0.36)"),`<div class="density-cell" title="${j(z)}: ${w} entries" style="background: ${O};"></div>`}).join("");return`
    <section id="trend-explorer-card" class="m3-seam" aria-label="Longitudinal Trajectory and Regime Explorer">
      <div class="m3-seam-top" style="padding: 15px 16px 12px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              LONG-TERM PROGRESS • GAPS, PLATEAUS &amp; EQUIPMENT REGIMES
            </div>
            <div id="trend-metric-title" style="font-size: 17px; font-weight: 800; margin-top: 1px;">
              ${j(d)}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <div class="m3-seg" role="group" aria-label="Time Horizon">
              ${m}
            </div>
            ${p?'<button type="button" id="btn-close-explorer" class="m3-pill" style="padding: 5px 10px;">✕ Close</button>':""}
          </div>
        </div>

        <div id="trend-metric-chips" class="m3-carousel" style="gap: 6px;">
          ${y}
        </div>
      </div>

      <div class="m3-seam-mid" style="padding: 14px 16px;">
        <div style="display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
            <span id="trend-current-val" class="tabular" style="font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
              ${j(r)}
            </span>
            <span id="trend-delta-badge" class="badge-trend tabular" style="background: var(--m3-teal-tint); color: var(--m3-on-teal);">
              ${j(t)}
            </span>
          </div>
          <div id="trend-scrub-readout" class="tabular" style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">
            Tap/drag chart to inspect plateaus, gaps &amp; rebounds
          </div>
        </div>

        <div style="width: 100%; height: 204px; position: relative;">
          <canvas id="longTermCanvas" style="width: 100%; height: 100%; cursor: crosshair; touch-action: pan-y;"></canvas>
        </div>

        <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 8px; font-size: 11px; color: var(--m3-ink-2);">
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 12px; height: 3px; border-radius: 2px; background: var(--m3-teal);"></span>${o?"45 lb Barbell (=45+…)":"Primary Trajectory"}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; border: 1px dashed var(--m3-gap-stroke); background: var(--m3-gap-fill); border-radius: 2px;"></span>No-Data Gap
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; background: var(--m3-plateau-fill); border-radius: 2px;"></span>Plateau Zone
          </span>
          ${o&&e?.alt_series?`<span
                   style="display: inline-flex; align-items: center; gap: 5px; cursor: help;"
                   title="Sessions logged with =15+… or =20+… (lighter / counterbalanced Smith bar) instead of a 45 lb Olympic bar. Plotted separately so they don't create fake dips on your 45 lb barbell line."
                 >
                   <span style="width: 8px; height: 8px; border-radius: 999px; border: 2px solid var(--m3-amber);"></span>${j(e.alt_series.label)}
                 </span>`:""}
        </div>
      </div>

      <div class="m3-seam-bot" style="padding: 12px 16px 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px;">
          <span style="font-weight: 700;">Consistency Density ('22 → '26)</span>
          <span class="tabular" style="color: var(--m3-ink-2);">${j(l)}</span>
        </div>
        <div class="density-strip">
          ${g}
        </div>
        <div id="trend-insight-banner" style="background: var(--m3-surface-dim); border-radius: 14px; padding: 9px 12px; font-size: 12px; color: var(--m3-ink); display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--m3-teal); font-weight: 800;">◈</span>
          <span>${j(s)}</span>
        </div>
      </div>
    </section>
  `}function Pe(e,a,i){if(!e||!i||!i.series?.length)return;let p=null;const d=()=>{const t=e.getBoundingClientRect(),l=Math.max(260,t.width||360),s=Math.max(170,t.height||204),c=window.devicePixelRatio||1;e.width=Math.round(l*c),e.height=Math.round(s*c);const o=e.getContext("2d");if(!o)return;o.scale(c,c),o.clearRect(0,0,l,s);const y=document.getElementById("m3-app")||document.documentElement,m=getComputedStyle(y),v=m.getPropertyValue(i.color_token||"--m3-teal").trim()||"#0b7f6b",b=m.getPropertyValue("--m3-ink").trim()||"#11221f",g=m.getPropertyValue("--m3-ink-2").trim()||"#556b67",w=m.getPropertyValue("--m3-hairline").trim()||"rgba(0,0,0,0.1)",k=m.getPropertyValue("--m3-gap-fill").trim()||"rgba(40,60,55,0.07)",z=m.getPropertyValue("--m3-gap-stroke").trim()||"rgba(40,60,55,0.25)",O=m.getPropertyValue("--m3-plateau-fill").trim()||"rgba(215,100,20,0.11)",V=m.getPropertyValue("--m3-amber").trim()||"#d76214",P=m.getPropertyValue("--m3-surface").trim()||"#ffffff",I=36,F=14,L=18,ie=24,G=l-I-F,C=s-L-ie,K=[];if(i.series.forEach(u=>{u!=null&&!Number.isNaN(u)&&K.push(u)}),i.alt_series?.points?.forEach(u=>K.push(u.val)),i.optimal_high&&i.optimal_high>0&&K.push(i.optimal_high),!K.length)return;let N=Math.min(...K),J=Math.max(...K);const ve=Math.max(1,J-N);N=Math.max(0,N-ve*.14),J=J+ve*.16;const xe=Math.max(1,J-N),D=i.series.length,R=u=>I+(D<=1?G/2:u/(D-1)*G),W=u=>L+C-(u-N)/xe*C;o.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="right";for(let u=0;u<=3;u++){const x=N+xe*u/3,T=W(x);o.strokeStyle=w,o.lineWidth=1,o.beginPath(),o.moveTo(I,T),o.lineTo(l-F,T),o.stroke(),o.fillStyle=g,o.fillText(x>=100?Math.round(x).toString():x.toFixed(x%1===0?0:1),I-5,T+3)}if(i.optimal_high&&i.optimal_high>N&&i.optimal_high<J){const u=W(i.optimal_high);o.save(),o.setLineDash([4,4]),o.strokeStyle=v,o.lineWidth=1.3,o.beginPath(),o.moveTo(I,u),o.lineTo(l-F,u),o.stroke(),o.fillStyle=v,o.textAlign="left",o.fillText(`Optimal ≤ ${i.optimal_high}`,I+4,u-4),o.restore()}(i.no_data_gaps||[]).forEach(u=>{const x=R(Math.max(0,u.start_bucket-.35)),T=R(Math.min(D-1,u.end_bucket+.35)),B=Math.max(10,T-x);o.fillStyle=k,o.fillRect(x,L,B,C),o.save(),o.setLineDash([3,3]),o.strokeStyle=z,o.strokeRect(x,L,B,C),o.restore(),B>=34&&(o.fillStyle=g,o.font="700 9.5px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="center",o.fillText("No Data",x+B/2,L+C/2+3))}),(i.plateaus||[]).forEach(u=>{const x=R(Math.max(0,u.start_bucket)),T=R(Math.min(D-1,u.end_bucket)),B=Math.max(14,T-x),Me=W(u.level_value),de=Math.max(L,Me-16),Te=Math.min(32,L+C-de);o.fillStyle=O,o.fillRect(x,de,B,Te),B>=40&&(o.fillStyle=V,o.font="700 9.5px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="center",o.fillText("Plateau",x+B/2,Math.max(L+10,de-3)))});let oe=-1,X=i.invert_good?1/0:-1/0,A=[];const he=()=>{if(A.length){if(A.length>=2&&!i.sparse){const u=o.createLinearGradient(0,L,0,L+C);u.addColorStop(0,v.startsWith("hsl")?v.replace("hsl(","hsla(").replace(")",", 0.20)"):"rgba(11,127,107,0.18)"),u.addColorStop(1,"rgba(11,127,107,0.0)"),o.fillStyle=u,o.beginPath(),o.moveTo(A[0].x,L+C),A.forEach(x=>o.lineTo(x.x,x.y)),o.lineTo(A[A.length-1].x,L+C),o.closePath(),o.fill()}o.strokeStyle=v,o.lineWidth=2.6,o.lineCap="round",o.lineJoin="round",i.sparse&&o.setLineDash([4,3]),o.beginPath(),A.forEach((u,x)=>{x===0?o.moveTo(u.x,u.y):o.lineTo(u.x,u.y)}),o.stroke(),o.setLineDash([]),(i.sparse||A.length===1||D<=16)&&A.forEach(u=>{o.fillStyle=P,o.strokeStyle=v,o.lineWidth=2.2,o.beginPath(),o.arc(u.x,u.y,3.6,0,Math.PI*2),o.fill(),o.stroke()}),A=[]}};if(i.series.forEach((u,x)=>{if(u==null||Number.isNaN(u)){he();return}const T=R(x),B=W(u);A.push({x:T,y:B}),(i.invert_good?u<X:u>X)&&(X=u,oe=x)}),he(),(i.alt_series?.points||[]).forEach(u=>{if(u.idx<0||u.idx>=D)return;const x=R(u.idx),T=W(u.val);o.fillStyle=P,o.strokeStyle=V,o.lineWidth=2.2,o.beginPath(),o.arc(x,T,4.3,0,Math.PI*2),o.fill(),o.stroke()}),oe>=0&&Number.isFinite(X)){const u=R(oe),x=W(X);o.fillStyle=v,o.beginPath(),o.arc(u,x,4.2,0,Math.PI*2),o.fill(),o.font="800 11px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="center",o.fillText("★",u,Math.max(11,x-7))}o.fillStyle=g,o.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif";const le=Math.min(6,D);for(let u=0;u<le;u++){const x=le===1?0:Math.round(u*(D-1)/(le-1)),T=i.labels[x]||"";o.textAlign=u===0?"left":u===le-1?"right":"center",o.fillText(T,R(x),s-6)}if(p!==null&&p>=0&&p<D){const u=R(p);o.save(),o.strokeStyle=b,o.lineWidth=1.2,o.setLineDash([3,3]),o.beginPath(),o.moveTo(u,L),o.lineTo(u,L+C),o.stroke(),o.restore();const x=i.series[p];if(x!=null){const T=W(x);o.fillStyle=v,o.strokeStyle=P,o.lineWidth=2.5,o.beginPath(),o.arc(u,T,5.2,0,Math.PI*2),o.fill(),o.stroke()}}},r=t=>{const l=e.getBoundingClientRect(),s=36,o=Math.max(1,l.width-s-14),y=Math.max(0,Math.min(1,(t-l.left-s)/o)),m=Math.round(y*Math.max(0,i.series.length-1));if(p=m,d(),a){const v=i.labels[m]||i.bucket_dates?.[m]||"",b=i.series[m],g=i.alt_series?.points?.find(z=>z.idx===m),w=i.density?.[m]??0,k=g?.raw_formula?` [sheet: ${g.raw_formula}]`:"";if(b==null)g?a.textContent=`${v} • ${g.val} ${i.unit} on 15–20 lb bar${k}`:a.textContent=`${v} • Explicit No-Data Hiatus (0 sessions)`;else{const z=g?` • also ${g.val} ${i.unit} on 15–20 lb bar${k}`:"";a.textContent=`${v} • ${b.toFixed(b%1===0?0:1)} ${i.unit}${z} (${w} entries)`}}};e.onmousemove=t=>r(t.clientX),e.onmouseleave=()=>{p=null,d(),a&&(a.textContent="Tap/drag chart to inspect plateaus, gaps & rebounds")},e.ontouchstart=t=>{t.touches[0]&&r(t.touches[0].clientX)},e.ontouchmove=t=>{t.touches[0]&&r(t.touches[0].clientX)},requestAnimationFrame(d)}function j(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const De="autofit_offline_db",Re=1,q="pending_workouts";function ye(){return new Promise((e,a)=>{const i=indexedDB.open(De,Re);i.onupgradeneeded=()=>{const p=i.result;p.objectStoreNames.contains(q)||p.createObjectStore(q,{keyPath:"id"})},i.onsuccess=()=>e(i.result),i.onerror=()=>a(i.error)})}function we(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`wk-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}async function He(e){const a=await ye();return new Promise((i,p)=>{const d=a.transaction(q,"readwrite"),r=d.objectStore(q),t={...e,queued_at:new Date().toISOString()};r.put(t),d.oncomplete=()=>{a.close(),i()},d.onerror=()=>{a.close(),p(d.error)}})}async function te(){try{const e=await ye();return await new Promise((a,i)=>{const d=e.transaction(q,"readonly").objectStore(q).getAll();d.onsuccess=()=>{e.close(),a(d.result||[])},d.onerror=()=>{e.close(),i(d.error)}})}catch{return[]}}async function je(e){if(!e.length)return;const a=await ye();return new Promise((i,p)=>{const d=a.transaction(q,"readwrite"),r=d.objectStore(q);for(const t of e)r.delete(t);d.oncomplete=()=>{a.close(),i()},d.onerror=()=>{a.close(),p(d.error)}})}async function ke(e,a=!1){if(!a&&navigator.onLine)try{return await S.logWorkout(e),{synced:!0,queuedCount:(await te()).length}}catch{}return await He(e),{synced:!1,queuedCount:(await te()).length}}async function ge(){const e=await te();if(!e.length||!navigator.onLine)return{flushed:0,remaining:e.length};try{const a=await S.syncWorkoutsBatch(e);a.workout_ids?.length&&await je(a.workout_ids);const i=await te();return{flushed:a.synced,remaining:i.length}}catch{return{flushed:0,remaining:e.length}}}function qe(e,a,i){if(!a||!e.overview)return"";const p=e.overview.preferences.feature_flags,d=e.overview.today_checkin,r=e.overview.latest_mobility_tests||{},t=e.body,l=d?.screen_time_min?Math.floor(d.screen_time_min/60):"",s=d?.screen_time_min?d.screen_time_min%60:"",c=i||p.pillar_cardio,o=i||p.pillar_sleep,y=i||p.pillar_weight||p.pillar_body_fat,m=i||p.pillar_screen_time,v=i||p.pillar_flexibility;return`
    <section id="checkin-drawer" class="m3-seam" style="border: 1px solid var(--m3-hairline); border-radius: 26px; overflow: hidden;">
      <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
            UNIFIED FAST CHECK-IN • ONLY FILL WHAT CHANGED
          </div>
          <strong style="font-size: 15px;">Log Raw Inputs (${ee(e.selected_date)})</strong>
        </div>

        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <button type="button" id="btn-toggle-all-checkin" class="m3-pill" style="padding: 5px 10px;">
            ${i?"Active Pillars Only":"Show All 7 Inputs"}
          </button>
          <button type="button" data-switch-tab="lift" class="m3-btn-tonal" style="padding: 5px 10px;">
            + Log Lift Sets →
          </button>
          <button type="button" id="btn-close-checkin" class="m3-pill" style="padding: 5px 10px;">✕</button>
        </div>
      </div>

      <form id="form-unified-checkin" class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
          <!-- Date selector -->
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 11.5px; font-weight: 700; color: var(--m3-ink-2);">Check-In Date</label>
            <input id="in-chk-date" type="date" value="${ee(e.selected_date)}" class="m3-input tabular" />
            <div style="font-size: 10.5px; color: var(--m3-ink-2);">
              Blank fields are skipped (won't overwrite existing entries).
            </div>
          </div>

          ${c?`
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-amber);">Cardio Session (Quick Log)</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Min</span>
                  <input id="in-chk-cardio-min" type="number" step="1" placeholder="32" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Miles</span>
                  <input id="in-chk-cardio-mi" type="number" step="0.1" placeholder="4.0" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Avg HR</span>
                  <input id="in-chk-cardio-hr" type="number" step="1" placeholder="148" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
              <div style="font-size: 10.5px; color: var(--m3-ink-2);">Auto-computes VDOT &amp; Zone 2 pace (or upload .FIT in Fitness).</div>
            </div>
          `:""}

          ${o?`
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-blue);">Sleep (Manual Override)</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Hours Asleep</span>
                  <input id="in-chk-sleep-hrs" type="number" step="0.1" placeholder="7.6" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Efficiency %</span>
                  <input id="in-chk-sleep-eff" type="number" step="1" placeholder="91" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
              <div style="font-size: 10.5px; color: var(--m3-ink-2);">Leave blank when synced from wearable.</div>
            </div>
          `:""}

          ${y?`
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-teal);">Weight, Body Fat &amp; Waist</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Weight lb</span>
                  <input id="in-chk-weight" type="number" step="0.1" placeholder="${t?.weight_lb?t.weight_lb.toFixed(1):"165.0"}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">BF %</span>
                  <input id="in-chk-bf" type="number" step="0.1" placeholder="${t?.body_fat_pct?t.body_fat_pct.toFixed(1):"15.0"}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Waist in</span>
                  <input id="in-chk-waist" type="number" step="0.1" placeholder="${d?.waist_in||"31.5"}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
            </div>
          `:""}

          ${m?`
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-coral);">Daily Screen Time (Phone / Leisure)</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Hours</span>
                  <input id="in-chk-screen-h" type="number" step="1" min="0" max="16" placeholder="${l!==""?l:"2"}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
                <label>
                  <span style="font-size: 10.5px; color: var(--m3-ink-2);">Minutes</span>
                  <input id="in-chk-screen-m" type="number" step="1" min="0" max="59" placeholder="${s!==""?s:"15"}" class="m3-input tabular" style="padding: 6px 8px;" />
                </label>
              </div>
              <div style="font-size: 10.5px; color: var(--m3-ink-2);">Also accepts iOS Shortcut / webhook POST to <code>/api/v1/checkins</code>.</div>
            </div>
          `:""}

          ${v?`
            <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 11px 13px; display: flex; flex-direction: column; gap: 6px;">
              <strong style="font-size: 12px; color: var(--m3-teal);">Flexibility &amp; ROM Benchmarks</strong>
              <label>
                <span style="font-size: 10.5px; color: var(--m3-ink-2);">Mobility / Stretching Today (min)</span>
                <input id="in-chk-mob-min" type="number" step="5" placeholder="${d?.mobility_min||"15"}" class="m3-input tabular" style="padding: 6px 8px;" />
              </label>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; margin-top: 2px;">
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Ankle KTW (cm, ≥10)</span>
                  <input id="in-rom-ankle" type="number" step="0.5" placeholder="${r.ankle_ktw_cm??""}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Sit &amp; Reach (in, ≥+2)</span>
                  <input id="in-rom-reach" type="number" step="0.5" placeholder="${r.sit_reach_in??""}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Overhead (deg, ≥175)</span>
                  <input id="in-rom-shoulder" type="number" step="1" placeholder="${r.shoulder_flex_deg??""}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
                <label>
                  <span style="font-size: 10px; color: var(--m3-ink-2);">Deep Squat (1–5)</span>
                  <input id="in-rom-squat" type="number" step="0.5" min="1" max="5" placeholder="${r.deep_squat_score??""}" class="m3-input tabular" style="padding: 5px 7px; font-size: 12px;" />
                </label>
              </div>
            </div>
          `:""}
        </div>

        <div style="display: flex; align-items: center; justify-content: flex-end; gap: 8px;">
          <button type="submit" id="btn-save-checkin" class="m3-btn-fill" style="padding: 9px 18px;">
            Save Check-In &amp; Recompute Scores
          </button>
        </div>
      </form>
    </section>
  `}const _e=[{flagKey:"pillar_strength",pillarKey:"strength",label:"Strength"},{flagKey:"pillar_cardio",pillarKey:"cardio",label:"Cardio"},{flagKey:"pillar_sleep",pillarKey:"sleep",label:"Sleep"},{flagKey:"pillar_weight",pillarKey:"weight",label:"Weight"},{flagKey:"pillar_body_fat",pillarKey:"body_fat",label:"Body Fat"},{flagKey:"pillar_flexibility",pillarKey:"flexibility",label:"Flexibility"},{flagKey:"pillar_screen_time",pillarKey:"screen_time",label:"Screen Time"}],Ne=[{flagKey:"view_health_labs",label:"Clinical Labs & FHIR Tab",desc:"Show Health tab with ApoB/HbA1c & shlink:/"},{flagKey:"tool_ols_calibration",label:"Fitbit OLS Tune",desc:"Show Google Health score calibration drawer"},{flagKey:"tool_wearable_intraday",label:"Intraday Wearable Cards",desc:"Show Steps/AZM/HRV/SpO2 intraday view on Overview"}];function We(e,a){if(!a||!e.overview)return"";const i=e.overview.preferences,p=i.feature_flags,d=e.overview.phase,r=new Set(d.focus_pillars||[]);return`
    <section id="customize-drawer" class="m3-seam" style="border: 1px solid var(--m3-hairline); border-radius: 26px; overflow: hidden;">
      <div class="m3-seam-top" style="padding: 15px 16px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
            FEATURE FLAGS • PHASE FOCUS • ON-DEMAND FORMULAS
          </div>
          <strong style="font-size: 15px;">Customize Dashboard &amp; Active Phase</strong>
        </div>
        <button type="button" id="btn-close-customize" class="m3-pill">Done</button>
      </div>

      <!-- 1. Instant Feature Flags -->
      <div class="m3-seam-mid" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div>
          <div style="font-size: 12px; font-weight: 800; margin-bottom: 6px;">Visible Life Pillars (Feature Flags)</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${_e.map(t=>`
              <button
                type="button"
                class="m3-chip"
                data-toggle-flag="${t.flagKey}"
                data-sel="${p[t.flagKey]?"true":"false"}"
              >${p[t.flagKey]?"✓ ":"+ "}${t.label}</button>
            `).join("")}
          </div>
        </div>

        <div>
          <div style="font-size: 12px; font-weight: 800; margin-bottom: 6px;">Optional Views &amp; Tools</div>
          <div style="display: flex; flex-wrap: wrap; gap: 6px;">
            ${Ne.map(t=>`
              <button
                type="button"
                class="m3-chip"
                data-toggle-flag="${t.flagKey}"
                data-sel="${p[t.flagKey]?"true":"false"}"
                title="${ee(t.desc)}"
              >${p[t.flagKey]?"✓ ":"+ "}${t.label}</button>
            `).join("")}
          </div>
        </div>
      </div>

      <!-- 2. Active Phase Editor -->
      <div class="m3-seam-mid" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 9px;">
        <div style="font-size: 12px; font-weight: 800;">Active Focus Phase (Pick 1–2 Focus Pillars; Others Hold Baseline)</div>
        <form id="form-phase-editor" style="display: flex; flex-direction: column; gap: 9px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 8px;">
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Phase Name</span>
              <input id="in-phase-name" type="text" value="${ee(d.name)}" class="m3-input" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Start Date</span>
              <input id="in-phase-start" type="date" value="${ee(d.start_date)}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Maintenance Floor (0–100)</span>
              <input id="in-phase-floor" type="number" min="30" max="95" value="${Math.round(d.floors?.sleep??75)}" class="m3-input tabular" />
            </label>
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Focus Pillars (max 2):</span>
            ${_e.filter(t=>p[t.flagKey]).map(t=>`
              <button
                type="button"
                class="m3-chip"
                data-toggle-focus="${t.pillarKey}"
                data-sel="${r.has(t.pillarKey)?"true":"false"}"
              >${r.has(t.pillarKey)?"★ ":""}${t.label}</button>
            `).join("")}
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="submit" id="btn-save-phase" class="m3-btn-tonal">Save Active Phase</button>
          </div>
        </form>
      </div>

      <!-- 3. Compute-on-Demand Formula Cohort & Targets -->
      <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 9px;">
        <div>
          <div style="font-size: 12px; font-weight: 800;">Formula Cohort &amp; Optimal Targets</div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Composite 0–100 scores are computed purely on demand from raw tables—updating any target recalculates your full history immediately.
          </div>
        </div>

        <form id="form-formula-prefs" style="display: flex; flex-direction: column; gap: 9px;">
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(128px, 1fr)); gap: 8px;">
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Cohort Sex</span>
              <select id="in-pref-sex" class="m3-input">
                <option value="male" ${i.sex==="male"?"selected":""}>Male</option>
                <option value="female" ${i.sex==="female"?"selected":""}>Female</option>
              </select>
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Age</span>
              <input id="in-pref-age" type="number" min="16" max="90" value="${i.age}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Target Weight (lb)</span>
              <input id="in-pref-weight" type="number" step="0.5" value="${i.weight_target_lb}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">BF Optimal % (Lo–Hi)</span>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                <input id="in-pref-bflo" type="number" step="0.5" value="${i.bf_opt_low}" class="m3-input tabular" style="padding: 8px 6px;" />
                <input id="in-pref-bfhi" type="number" step="0.5" value="${i.bf_opt_high}" class="m3-input tabular" style="padding: 8px 6px;" />
              </div>
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Screen Target (min/d)</span>
              <input id="in-pref-screen" type="number" step="15" value="${i.screen_time_target_min}" class="m3-input tabular" />
            </label>
            <label>
              <span style="display: block; font-size: 11px; color: var(--m3-ink-2); margin-bottom: 3px; font-weight: 600;">Mobility Target (m/wk)</span>
              <input id="in-pref-mob" type="number" step="10" value="${i.mobility_weekly_target_min}" class="m3-input tabular" />
            </label>
          </div>

          <div style="display: flex; justify-content: flex-end;">
            <button type="submit" id="btn-save-prefs" class="m3-btn-fill">Update Formulas &amp; Recalculate</button>
          </div>
        </form>
      </div>
    </section>
  `}function ee(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ve(e,a){if(!a)return"";const i=e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1],p=e.calibration?.readiness?.r2??.97;return`
    <section id="cal-drawer" class="m3-card" style="padding: 16px; display: flex; flex-direction: column; gap: 10px; border: 1px solid var(--m3-hairline);">
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
        <div>
          <strong style="font-size: 14px;">Calibrate Open Scores w/ Google Health Ground Truth</strong>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Linear OLS fit aligns Open Readiness, Sleep &amp; Banister TRIMP to your Fitbit / Google Health app numbers.
          </div>
        </div>
        <button type="button" id="btn-close-cal" class="m3-pill" style="padding: 4px 10px;">Done</button>
      </div>

      <form id="form-calibration" style="display: flex; flex-direction: column; gap: 10px;">
        <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; font-size: 12px;">
          <label>
            <span style="display: block; color: var(--m3-ink-2); margin-bottom: 4px; font-weight: 600;">GH Readiness</span>
            <input id="in-cal-r" type="number" step="1" value="${Math.round(i?.readiness||84)}" class="m3-input tabular" />
          </label>
          <label>
            <span style="display: block; color: var(--m3-ink-2); margin-bottom: 4px; font-weight: 600;">GH Sleep Score</span>
            <input id="in-cal-s" type="number" step="1" value="${Math.round(i?.sleep_score||88)}" class="m3-input tabular" />
          </label>
          <label>
            <span style="display: block; color: var(--m3-ink-2); margin-bottom: 4px; font-weight: 600;">GH Cardio Load</span>
            <input id="in-cal-c" type="number" step="1" value="${Math.round(i?.cardio_load||412)}" class="m3-input tabular" />
          </label>
        </div>
        <button id="btn-save-calibration" type="submit" class="m3-btn-fill" style="width: 100%; padding: 9px;">
          Update OLS Calibration Curve (R² = ${p.toFixed(2)}, n = ${e.calibration?.readiness?.samples||0})
        </button>
      </form>
    </section>
  `}function Ge(e,a){if(!a)return"";const i=e.integrations?.google_health,p=e.integrations?.parity_scorecard,d=i?.status==="healthy"?"var(--m3-teal-tint)":i?.status==="expiring_soon"?"var(--m3-amber-tint)":"var(--m3-surface-dim)",r=i?.status==="healthy"?"var(--m3-on-teal)":i?.status==="expiring_soon"?"var(--m3-on-amber)":"var(--m3-ink-2)";return`
    <section id="sync-drawer" class="m3-seam" style="border: 1px solid var(--m3-hairline); border-radius: 26px; overflow: hidden;">
      <div class="m3-seam-top" style="padding: 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
        <div>
          <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
            SELF-HOSTED SQLITE WAL • ZERO CLOUD LOCK-IN
          </div>
          <strong style="font-size: 15px;">Connectors, One-Time .XLSX Backfill &amp; Exports</strong>
        </div>
        <button type="button" id="btn-close-sync" class="m3-pill">Close</button>
      </div>

      <div class="m3-seam-mid" style="padding: 14px 16px; display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 10px;">
        <!-- Google Health API v4 Card -->
        <div style="background: var(--m3-surface-dim); border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 13px;">Google Health API v4</strong>
            <span class="tabular" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${d}; color: ${r};">
              ${i?.connected?`${i.days_remaining.toFixed(1)}d token left`:i?.status||"Local Mode"}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            7-day Testing OAuth guard: sync cursor freezes on HTTP 401; outbound ledger prevents weight echo loops.
          </div>
          ${i?.reconsent_auth_url?`<a href="${Ke(i.reconsent_auth_url)}" class="m3-btn-tonal" style="text-decoration: none; margin-top: 4px;">1-Click Weekly Re-Consent</a>`:'<button type="button" id="btn-trigger-sync" class="m3-pill" style="align-self: flex-start; margin-top: 2px;">Run Connector Poll</button>'}
        </div>

        <!-- 30-Day Shadow Parity Scorecard -->
        <div style="background: var(--m3-surface-dim); border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 13px;">Shadow Parity &amp; Provenance</strong>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">
              ${p?.sleep_agreement_pct??99.7}% Sleep Match
            </span>
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Steps Δ: ${p?.steps_delta_pct??.28}% • RHR Δ: ${p?.rhr_delta_bpm??0} bpm
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Soft-superseded rows: <strong>${p?.superseded_records??0}</strong> • Outbound ledger: <strong>${p?.outbound_ledger_cnt??0}</strong>
          </div>
        </div>
      </div>

      <!-- One-Time Read-Only Google Sheet / .XLSX Backfill + Clean Exports -->
      <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        <form id="form-xlsx-url" style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
          <input
            id="input-xlsx-url"
            type="url"
            placeholder="Paste public Google Sheet URL or upload .xlsx for read-only 2022–2026 backfill…"
            class="m3-input"
            style="flex: 1; min-width: 230px; font-size: 12px;"
          />
          <button type="submit" id="btn-import-xlsx-url" class="m3-btn-tonal">Import Sheet URL</button>
          <label class="m3-pill" style="cursor: pointer;">
            <span>Upload .xlsx</span>
            <input id="input-xlsx-file" type="file" accept=".xlsx" style="display: none;" />
          </label>
        </form>

        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; padding-top: 6px; border-top: 1px solid var(--m3-hairline);">
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Export normalized SQLite WAL tables anytime as CSV archive or full JSON backup:
          </div>
          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <a id="link-export-csv" href="/api/v1/export/csv.zip" download="autofit_csv_export.zip" class="m3-btn-fill" style="text-decoration: none;">
              Download CSV (.zip)
            </a>
            <a id="link-export-json" href="/api/v1/export/json" download="autofit_backup.json" class="m3-pill" style="text-decoration: none;">
              Export JSON Backup
            </a>
          </div>
        </div>
      </div>
    </section>
  `}function Ke(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ue(e,a){const i=a.trim().toLowerCase(),p=(e.key_lifts||[]).filter(s=>!i||s.name.toLowerCase().includes(i)||s.primary_muscle.toLowerCase().includes(i)||s.equipment.toLowerCase().includes(i)),d=e.recent_runs?.[0],r=d?.zone2_pace_sec_per_mi?`${Math.floor(d.zone2_pace_sec_per_mi/60)}:${String(Math.round(d.zone2_pace_sec_per_mi%60)).padStart(2,"0")}/mi`:"8:14/mi",t=d?.hr_zones_minutes||{z1:3,z2:14,z3:9,z4:5,z5:1},l=Math.max(1,(t.z1||0)+(t.z2||0)+(t.z3||0)+(t.z4||0)+(t.z5||0));return`
    <div id="view-fitness" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Key Lifts Progression Leaderboard (2022–2026 SQLite Backfill + PWA Sets) -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              SQLITE STRENGTH PROGRESSION • ${e.key_lifts?.length||0} TRACKED LIFTS
            </div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 1px;">
              2022–2026 Key Lifts Leaderboard
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
            <input
              id="input-filter-lifts"
              type="search"
              value="${H(a)}"
              placeholder="Filter muscle or lift…"
              class="m3-input"
              style="width: 185px; padding: 6px 12px; font-size: 12px;"
              aria-label="Filter tracked lifts"
            />
            <button type="button" id="btn-fitness-go-lift" data-switch-tab="lift" class="m3-btn-fill">+ Log Workout</button>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 8px 12px 12px 12px; display: flex; flex-direction: column; gap: 6px;">
          ${p.slice(0,24).map(s=>`
              <div
                class="clickable-tile"
                data-open-metric="${H(s.metric_key)}"
                style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
              >
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <strong style="font-size: 14px;">${H(s.name)}</strong>
                    <span style="font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--m3-surface); color: var(--m3-ink-2); font-weight: 600;">
                      ${H(s.primary_muscle)} • ${H(Qe(s.equipment))}
                    </span>
                  </div>
                  <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${H(s.narrative)} (${s.sessions} sessions)
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                  ${re(s.sparkline||[],"var(--m3-teal)",74,24)}
                  <div style="text-align: right; min-width: 78px;">
                    <div class="tabular" style="font-size: 15px; font-weight: 800;">
                      ${s.current_val.toFixed(s.current_val%1===0?0:1)} ${H(s.unit)}
                    </div>
                    <div class="tabular" style="font-size: 11px; font-weight: 700; color: ${s.pct_gain>=0?"var(--m3-teal)":"var(--m3-coral)"};">
                      ${s.pct_gain>=0?"+":""}${s.pct_gain}% vs '22
                    </div>
                  </div>
                </div>
              </div>
            `).join("")}
        </div>
      </section>

      <!-- Garmin .FIT Running Analytics: VDOT + Zone 2 Efficiency Pair -->
      <div class="m3-pair">
        <div class="m3-pair-l clickable-tile" data-open-metric="vo2" style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 700;">Running VDOT (VO2)</span>
            <span style="font-size: 11px; color: var(--m3-amber); font-weight: 700;">4y ›</span>
          </div>
          <div class="tabular" style="font-size: 26px; font-weight: 800;">
            ${d?d.vdot_open.toFixed(1):"49.4"} <span style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">mL/kg</span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Daniels-Gilbert grade-adjusted from Garmin .FIT
          </div>
        </div>

        <div class="m3-pair-r" style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 700;">Zone 2 Aerobic Pace</span>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
              EF ${d?d.zone2_efficiency.toFixed(2):"1.41"}
            </span>
          </div>
          <div class="tabular" style="font-size: 26px; font-weight: 800;">
            ${r}
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Normalized @ 141 bpm • Cadence ${d?.avg_cadence||180} spm
          </div>
        </div>
      </div>

      <!-- Binary Garmin .FIT Decoder & Mile Splits Card -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-amber);">MUKTIHARI/FIT BINARY TELEMETRY</div>
            <div style="font-size: 15px; font-weight: 800;">
              ${H(d?.title||"Garmin Tempo Run (.FIT)")}
              <span class="tabular" style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">
                • ${d?.local_date||""}
              </span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <label class="m3-pill" style="cursor: pointer;">
              <span>Upload .FIT</span>
              <input id="input-fit-upload" type="file" accept=".fit" style="display: none;" />
            </label>
            <button type="button" id="btn-sample-fit" class="m3-btn-tonal">Decode Sample .FIT</button>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 12px;">
          <div class="m3-carousel" style="gap: 8px;">
            ${(d?.splits||[]).map(s=>`
                <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px 13px; min-width: 116px;">
                  <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Mile ${s.mile}</div>
                  <div class="tabular" style="font-size: 17px; font-weight: 800; margin-top: 2px;">${H(s.pace_formatted)}</div>
                  <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${s.avg_hr} bpm • ${s.avg_cadence||180} spm
                  </div>
                </div>
              `).join("")||'<div style="font-size: 12px; color: var(--m3-ink-2);">Click "Decode Sample .FIT" or upload a Garmin .FIT file to inspect mile splits.</div>'}
          </div>

          <!-- 5-Zone HR Distribution -->
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">
              <span>Heart Rate Zones (1Hz .FIT Record Stream)</span>
              <span class="tabular">Z2: ${t.z2||0}m • Z3: ${t.z3||0}m • Z4: ${t.z4||0}m</span>
            </div>
            <div style="display: flex; gap: 3px; height: 10px; border-radius: 999px; overflow: hidden;">
              <div style="flex: ${Math.max(1,(t.z1||0)/l*100)}; background: var(--m3-surface-hi);" title="Z1"></div>
              <div style="flex: ${Math.max(2,(t.z2||0)/l*100)}; background: var(--m3-teal);" title="Z2 Aerobic"></div>
              <div style="flex: ${Math.max(1,(t.z3||0)/l*100)}; background: var(--m3-blue);" title="Z3 Tempo"></div>
              <div style="flex: ${Math.max(1,(t.z4||0)/l*100)}; background: var(--m3-amber);" title="Z4 Threshold"></div>
              <div style="flex: ${Math.max(.5,(t.z5||0)/l*100)}; background: var(--m3-coral);" title="Z5 Anaerobic"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `}function Qe(e){switch(e){case"olympic_bar":return"45 lb Barbell";case"smith":return"Smith Machine";case"dumbbell_pair":return"2× Dumbbells";case"sled":return"Leg Press Sled";case"cable":case"cable_stack":return"Cable Stack";case"bodyweight":return"Bodyweight";case"machine":return"Machine";default:return e||"Standard"}}function H(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Je(e){const a=e.labs||[],i=e.body;return`
    <div id="view-health" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- HL7 SMART Health Links (shlink:/) & FHIR R4 Importer -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              HL7 SMART HEALTH LINKS • JWE A256GCM → FHIR R4 LOINC
            </div>
            <div style="font-size: 16px; font-weight: 800; margin-top: 1px;">
              Clinical Lab Biomarkers &amp; Medical Records
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <button type="button" id="btn-load-sample-shlink" class="m3-btn-tonal">
              Generate Encrypted shlink:/
            </button>
            <label class="m3-pill" style="cursor: pointer;">
              <span>Upload FHIR JSON</span>
              <input id="input-fhir-file" type="file" accept=".json,application/json" style="display: none;" />
            </label>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
          <form id="form-shlink-import" style="display: flex; gap: 8px; flex-wrap: wrap;">
            <input
              id="input-shlink-uri"
              type="text"
              placeholder="Paste HL7 SMART Health Link (shlink:/eyJ...) from Quest / LabCorp / MyChart / Apple Health…"
              class="m3-input tabular"
              style="flex: 1; min-width: 220px;"
              aria-label="SMART Health Link URI"
            />
            <button id="btn-decrypt-shlink" type="submit" class="m3-btn-fill">
              Decrypt &amp; Import
            </button>
          </form>

          <!-- Quick Manual Biomarker Entry -->
          <form id="form-manual-lab" style="display: flex; gap: 6px; flex-wrap: wrap; align-items: center; padding-top: 4px; border-top: 1px solid var(--m3-hairline);">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Manual Lab:</span>
            <select id="select-manual-biomarker" class="m3-input" style="width: auto; padding: 6px 10px; font-size: 12px;">
              <option value="ApoB">ApoB (mg/dL)</option>
              <option value="HbA1c">HbA1c (%)</option>
              <option value="hs-CRP">hs-CRP (mg/L)</option>
              <option value="LDL-C">LDL-C (mg/dL)</option>
              <option value="Ferritin">Ferritin (ng/mL)</option>
              <option value="Vitamin D (25-OH)">Vitamin D (ng/mL)</option>
            </select>
            <input
              id="input-manual-lab-val"
              type="number"
              step="0.01"
              placeholder="Value"
              class="m3-input tabular"
              style="width: 96px; padding: 6px 10px; font-size: 12px;"
            />
            <button id="btn-save-manual-lab" type="submit" class="m3-pill">Add Observation</button>
          </form>
        </div>
      </section>

      <!-- Biomarker Grid -->
      <div class="lab-grid">
        ${a.map(p=>{const d=p.status.toLowerCase().includes("optimal"),r=d?"var(--m3-teal-tint)":"var(--m3-amber-tint)",t=d?"var(--m3-on-teal)":"var(--m3-on-amber)",l=(p.draws||[]).map(s=>s.value);return`
              <div
                class="m3-card clickable-tile"
                data-open-metric="${U(p.metric_key)}"
                style="padding: 14px 15px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                  <div>
                    <div style="font-size: 14px; font-weight: 800;">${U(p.name)}</div>
                    <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">LOINC ${U(p.loinc_code)}</div>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${r}; color: ${t};">
                    ${U(p.status)}
                  </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div>
                    <span class="tabular" style="font-size: 24px; font-weight: 800;">
                      ${p.latest_value.toFixed(p.latest_value%1===0?0:1)}
                    </span>
                    <span style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">${U(p.unit)}</span>
                  </div>
                  ${l.length>=2?re(l,"var(--m3-teal)",64,24):""}
                </div>

                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Trail: ${U(p.history_text)} • Optimal ≤ ${p.optimal_high||p.ref_high}
                </div>
              </div>
            `}).join("")}
      </div>

      <!-- Body Composition Longitudinal Summary -->
      <div class="m3-pair">
        <div class="m3-pair-l clickable-tile" data-open-metric="weight" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">EWMA Trend Weight</span>
          <div class="tabular" style="font-size: 24px; font-weight: 800;">
            ${i?i.ewma_weight_lb.toFixed(1):"171.4"} lb
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            α = 0.25 exponential smoothing filters daily water noise
          </div>
        </div>
        <div class="m3-pair-r clickable-tile" data-open-metric="body_fat" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Lean Mass Retention</span>
          <div class="tabular" style="font-size: 24px; font-weight: 800;">
            ${i?.lean_mass_lb?i.lean_mass_lb.toFixed(1):"148.1"} lb
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
            ${i&&i.lean_delta_lb>=0?"+":""}${i?i.lean_delta_lb.toFixed(1):"+4.2"} lb lean mass since 2022
          </div>
        </div>
      </div>
    </div>
  `}function U(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const ae={olympic_45:{label:"45 lb Barbell",equipment:"olympic_bar",tare:45,mode:"plates_per_side"},smith_20:{label:"20 lb Bar / Smith",equipment:"smith",tare:20,mode:"plates_per_side"},smith_15:{label:"15 lb Bar / Smith",equipment:"smith",tare:15,mode:"plates_per_side"},sled_125:{label:"125 lb Sled",equipment:"sled",tare:125,mode:"plates_per_side"},sled_118:{label:"118 lb Sled",equipment:"sled",tare:118,mode:"plates_per_side"},dumbbell_2x:{label:"2× Per-Hand DB",equipment:"dumbbell_pair",tare:0,mode:"per_hand"}};function Ee(e,a){const i=ae[e]||ae.olympic_45,p=a.reduce((r,t)=>r+t,0);if(i.mode==="per_hand"){const r=p||40;return{displayLb:r,totalLb:r*2,formula:`=2*${r}`}}const d=i.tare+2*p;return{displayLb:d,totalLb:d,formula:`=${i.tare}+2*(${a.length?a.join("+"):"0"})`}}function Xe(e,a){const i=e.splits||[],p=i[a.selectedSplitIdx]||i[0],d=[...p?.items||[],...a.customItems],r=d.find(s=>s.slug===a.calcTargetSlug)||d[0],t=Ee(a.calcEquipKey,a.calcPlatesPerSide),l=a.restSecondsLeft>0?`${Math.floor(a.restSecondsLeft/60)}:${String(a.restSecondsLeft%60).padStart(2,"0")}`:"Rest Timer";return`
    <div id="view-lift" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Top Header: Split Selector + Offline IndexedDB Badge + Rest Timer -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
                1-TAP FAST CARD LOGGER • OFFLINE INDEXEDDB READY
              </div>
              <div style="font-size: 17px; font-weight: 800; margin-top: 1px;">
                ${_(p?.title||"Push / Chest & Triceps")}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <!-- Rest Timer Pills -->
              <div class="m3-seg" role="group" aria-label="Rest Timer">
                <button type="button" id="btn-rest-60" data-rest-sec="60" data-on="false">60s</button>
                <button type="button" id="btn-rest-90" data-rest-sec="90" data-on="${a.restSecondsLeft>0?"true":"false"}">
                  ${a.restSecondsLeft>0?`⏱ ${l}`:"90s"}
                </button>
                <button type="button" id="btn-rest-120" data-rest-sec="120" data-on="false">120s</button>
              </div>

              <!-- Offline Gym Basement Simulator / Queue Flush -->
              <button
                type="button"
                id="btn-toggle-offline-sim"
                class="m3-pill"
                style="background: ${a.simulateOffline?"var(--m3-amber-tint)":"var(--m3-surface-dim)"}; color: ${a.simulateOffline?"var(--m3-on-amber)":"var(--m3-ink)"};"
                title="Test basement gym offline mode (queues sets to IndexedDB and auto-syncs when back online)"
              >
                ${a.simulateOffline?"⚡ Offline Sim ON":"● Online"}
                ${a.queuedOfflineCount>0?` (${a.queuedOfflineCount} queued)`:""}
              </button>
              ${a.queuedOfflineCount>0?`<button type="button" id="btn-flush-offline" class="m3-btn-tonal">Sync ${a.queuedOfflineCount} Now</button>`:""}
            </div>
          </div>

          <!-- All 6 Hybrid Split Templates Carousel -->
          <div class="m3-carousel" style="gap: 6px;">
            ${i.map((s,c)=>`
                <button
                  type="button"
                  id="btn-split-${_(s.slug)}"
                  class="m3-chip m3-carousel-item"
                  data-split-idx="${c}"
                  data-sel="${c===a.selectedSplitIdx?"true":"false"}"
                >${_(s.title)}</button>
              `).join("")}
          </div>
        </div>

        <!-- Built-in 1-Tap Bar & Plate Calculator (Replaces =45+2*45 / =20+... / =125+... / =2*47.5!) -->
        <div class="m3-seam-bot" style="padding: 13px 16px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 12px;">Bar &amp; Plate Calculator:</strong>
              <select id="select-calc-target" class="m3-input" style="width: auto; padding: 5px 10px; font-size: 12px;">
                ${d.map(s=>`<option value="${_(s.slug)}" ${s.slug===r?.slug?"selected":""}>${_(s.name)}</option>`).join("")}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tabular" style="font-size: 13px; font-weight: 800; color: var(--m3-teal);">
                ${t.formula} → ${t.totalLb.toFixed(1)} lb total
              </span>
              <button type="button" id="btn-apply-calc" class="m3-btn-tonal" style="padding: 5px 11px;">
                Apply to Card
              </button>
            </div>
          </div>

          <div class="m3-carousel" style="gap: 5px;">
            ${Object.entries(ae).map(([s,c])=>`
                <button
                  type="button"
                  class="m3-chip m3-carousel-item"
                  data-calc-equip="${s}"
                  data-sel="${a.calcEquipKey===s?"true":"false"}"
                >${_(c.label)}</button>
              `).join("")}
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Add per side/hand:</span>
            ${[45,35,25,10,5,2.5].map(s=>`<button type="button" class="m3-pill tabular" data-add-plate="${s}" style="padding: 4px 10px;">+${s}</button>`).join("")}
            <button type="button" id="btn-clear-plates" class="m3-pill" style="padding: 4px 10px; color: var(--m3-coral);">
              Clear (${a.calcPlatesPerSide.length?a.calcPlatesPerSide.join("+"):"0"})
            </button>
          </div>
        </div>
      </section>

      <!-- Spacious Exercise Fast Cards -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${d.map(s=>{const c=a.weightOverrides[s.slug]??s.last_display_lb,o=a.repsOverrides[s.slug]??s.target_reps,y=a.equipOverrides[s.slug],m=y?.equipment||s.equipment,v=y?.tare??s.tare_lb,w=(y?.mode||s.load_mode)==="per_hand"||m==="dumbbell_pair"?"lb/hand":"lb",k=!!a.loggedSlugs[s.slug],z=a.expandedSlug===s.slug;return`
              <article
                class="m3-card"
                style="padding: 15px 16px; border: 1.5px solid ${k?"var(--m3-teal)":"transparent"}; display: flex; flex-direction: column; gap: 10px;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
                      <strong style="font-size: 15px;">${_(s.name)}</strong>
                      <span class="tabular" style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--m3-surface-dim); font-weight: 700;">
                        ${s.target_sets} × ${o}
                      </span>
                      <button
                        type="button"
                        class="m3-pill"
                        data-open-metric="lift:${_(s.slug)}"
                        style="padding: 2px 8px; font-size: 11px; color: var(--m3-teal);"
                        title="Open 4-year trajectory for ${_(s.name)}"
                      >4y ›</button>
                    </div>
                    <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                      ${_(s.subtitle)}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px;">
                    ${re(s.sparkline||[],"var(--m3-teal)",64,22)}

                    <button
                      type="button"
                      class="m3-pill tabular"
                      data-expand-slug="${_(s.slug)}"
                      style="padding: 7px 11px; font-size: 13px; font-weight: 800;"
                      title="Adjust weight or reps"
                    >
                      ${c.toFixed(c%1===0?0:1)} ${w} ✎
                    </button>

                    <button
                      type="button"
                      id="btn-1tap-${_(s.slug)}"
                      data-log-lift="${_(s.slug)}"
                      class="${k?"m3-btn-tonal":"m3-btn-fill"}"
                      style="min-width: 98px;"
                    >
                      ${k?"✓ Logged":"1-Tap Log"}
                    </button>
                  </div>
                </div>

                ${z?`
                    <div style="padding-top: 10px; border-top: 1px solid var(--m3-hairline); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 700;">Working Weight (${w}):</span>
                        <button type="button" class="m3-pill tabular" data-step-weight="${_(s.slug)}:-5">-5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${_(s.slug)}:-2.5">-2.5</button>
                        <input
                          type="number"
                          step="0.5"
                          value="${c}"
                          data-input-weight="${_(s.slug)}"
                          class="m3-input tabular"
                          style="width: 82px; text-align: center; padding: 6px;"
                        />
                        <button type="button" class="m3-pill tabular" data-step-weight="${_(s.slug)}:2.5">+2.5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${_(s.slug)}:5">+5</button>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; font-weight: 700;">Reps:</span>
                        <input
                          type="number"
                          step="1"
                          value="${o}"
                          data-input-reps="${_(s.slug)}"
                          class="m3-input tabular"
                          style="width: 64px; text-align: center; padding: 6px;"
                        />
                        <span class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                          ${_(Ze(m,v))}
                        </span>
                      </div>
                    </div>
                  `:""}
              </article>
            `}).join("")}
      </div>

      <!-- Add Any Exercise From Full 44-Lift Catalog + Finish Session Bar -->
      <div class="m3-card" style="padding: 14px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
        <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
          <select id="select-add-exercise" class="m3-input" style="width: auto; min-width: 200px; padding: 7px 11px; font-size: 12px;">
            <option value="">+ Add another exercise from catalog…</option>
            ${(e.exercises||[]).map(s=>`<option value="${_(s.slug)}">${_(s.name)} (${_(s.primary_muscle)})</option>`).join("")}
          </select>
          <button type="button" id="btn-add-custom-exercise" class="m3-pill">Add Card</button>
        </div>

        <button type="button" id="btn-log-entire-split" class="m3-btn-fill" style="padding: 9px 18px;">
          Log Full Split Session (${d.length} Exercises)
        </button>
      </div>
    </div>
  `}function Ze(e,a){switch(e){case"olympic_bar":return`${a||45} lb Olympic bar`;case"smith":return`${a||20} lb lighter / Smith bar`;case"sled":return`${a||125} lb leg press sled`;case"dumbbell_pair":return"2× per-hand dumbbells";case"cable_stack":return"Cable / weight stack";case"bodyweight":return"Bodyweight";default:return a>0?`${e} (${a} lb bar/base)`:e}}function _(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function $e(e,a){const i=e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1]||{date:e.selected_date,title:"Today",steps:0,distance_mi:0,total_kcal:0,azm:0,rhr:51,hrv:62,spo2:98,vo2:49,readiness:84,readiness_open:83,sleep_score:88,sleep_open:87,sleep_text:"7h 45m",cardio_load:412},p=1e4,d=45,r=e.recent_runs?.[0],t=e.recent_workouts?.[0],l=e.body,s=i.readiness>=80?"Optimal Recovery":i.readiness>=65?"Steady Baseline":"Prioritize Rest",c=i.sleep_score>=82?"Deep Restorative":"Solid Continuity";return`
    <div id="view-today" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Beat 1: Concentric Hero + Readiness/Sleep 2-Up Pair -->
      <div class="m3-split-12">
        <div class="span-7 m3-hero clickable-tile" data-open-metric="steps" style="padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: var(--m3-on-teal); opacity: 0.85;">
                DAILY MOVEMENT • ${Z(i.title.toUpperCase())}
              </span>
              <div>
                <div class="tabular" style="font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: var(--m3-on-teal);">
                  ${i.steps.toLocaleString()}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: var(--m3-on-teal); opacity: 0.82;">
                  of ${p.toLocaleString()} steps
                </div>
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span class="tabular" style="font-size: 20px; font-weight: 800; color: var(--m3-amber);">${i.azm}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--m3-on-teal); opacity: 0.84;">Active Zone Min / ${d}</span>
              </div>
            </div>

            ${Ie(i.steps/p,i.azm/d)}
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px;">
            <div style="background: var(--m3-hero-pill); border-radius: 16px; padding: 8px 10px;">
              <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Distance</div>
              <div class="tabular" style="font-size: 14px; font-weight: 800;">${i.distance_mi.toFixed(2)} mi</div>
            </div>
            <div style="background: var(--m3-hero-pill); border-radius: 16px; padding: 8px 10px;">
              <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Total Energy</div>
              <div class="tabular" style="font-size: 14px; font-weight: 800;">${i.total_kcal.toLocaleString()} kcal</div>
            </div>
            <div style="background: var(--m3-hero-pill); border-radius: 16px; padding: 8px 10px;">
              <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Logged Lifts</div>
              <div class="tabular" style="font-size: 14px; font-weight: 800;">${e.total_workouts} wks</div>
            </div>
          </div>
        </div>

        <div class="span-5 m3-pair" style="align-content: stretch;">
          <div class="m3-pair-l clickable-tile" data-open-metric="readiness" style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Readiness</span>
              <span style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${fe(i.readiness,"var(--m3-teal)","var(--m3-teal-track)")}
              <div>
                <div style="font-size: 12px; font-weight: 700;">${s}</div>
                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">Open: ${Math.round(i.readiness_open)} pts</div>
              </div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
              HRV ${Math.round(i.hrv)} ms • RHR ${Math.round(i.rhr)} bpm
            </div>
          </div>

          <div class="m3-pair-r clickable-tile" data-open-metric="sleep" style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Sleep</span>
              <span style="font-size: 11px; color: var(--m3-blue); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
              ${fe(i.sleep_score,"var(--m3-blue)","var(--m3-blue-track)")}
              <div>
                <div class="tabular" style="font-size: 13px; font-weight: 800;">${Z(i.sleep_text)}</div>
                <div style="font-size: 11px; color: var(--m3-ink-2);">${c}</div>
              </div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
              Open Sleep: ${Math.round(i.sleep_open)} • Eff ${Math.round(e.sleep?.efficiency_pct||92)}%
            </div>
          </div>
        </div>
      </div>

      <!-- Beat 2: Steps Capsule Chart + Cardio Load / RHR 2-Up Pair -->
      <div class="m3-split-12">
        <div class="span-7 m3-card" style="padding: 15px 16px; display: flex; flex-direction: column; gap: 10px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
            <div>
              <div style="font-size: 13px; font-weight: 700;">Steps &amp; Hourly Cadence</div>
              <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                ${a==="24h"?"24h distribution across today":"Last 7 days vs 10,000 goal"}
              </div>
            </div>
            <div class="m3-seg">
              <button type="button" id="btn-step-24h" data-step-mode="24h" data-on="${a==="24h"?"true":"false"}">24h</button>
              <button type="button" id="btn-step-7d" data-step-mode="7d" data-on="${a==="7d"?"true":"false"}">7d</button>
            </div>
          </div>
          <div style="width: 100%; height: 122px;">
            <canvas id="stepsCapsuleCanvas" style="width: 100%; height: 100%;"></canvas>
          </div>
        </div>

        <div class="span-5 m3-pair">
          <div class="m3-pair-l clickable-tile" data-open-metric="vo2" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Cardio Load</span>
              <span style="font-size: 11px; color: var(--m3-amber); font-weight: 700;">TRIMP</span>
            </div>
            <div>
              <div class="tabular" style="font-size: 24px; font-weight: 800;">${Math.round(i.cardio_load)}</div>
              <div style="font-size: 11px; color: var(--m3-ink-2);">Target sweet spot: 360–460</div>
            </div>
            <div style="height: 8px; border-radius: 999px; background: var(--m3-amber-track); overflow: hidden;">
              <div style="height: 100%; width: ${Math.min(100,Math.round(i.cardio_load/520*100))}%; background: var(--m3-amber); border-radius: 999px;"></div>
            </div>
          </div>

          <div class="m3-pair-r clickable-tile" data-open-metric="rhr" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Resting HR</span>
              <span style="font-size: 11px; color: var(--m3-coral); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: baseline; gap: 4px;">
              <span class="tabular" style="font-size: 24px; font-weight: 800;">${Math.round(i.rhr)}</span>
              <span style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">bpm</span>
            </div>
            <div style="width: 100%; height: 36px;">
              <canvas id="rhrMiniWaveCanvas" style="width: 100%; height: 100%;"></canvas>
            </div>
          </div>
        </div>
      </div>

      <!-- Beat 3: Overnight Health Metrics Carousel -->
      <div class="m3-card" style="padding: 14px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 13px;">Overnight Health Vitals (Fitbit Air → Google Health)</strong>
          <span style="font-size: 11px; color: var(--m3-ink-2);">Tap any metric for 4y curve</span>
        </div>
        <div class="m3-carousel vitals-row">
          <div class="m3-carousel-item clickable-tile" data-open-metric="hrv" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">HRV (RMSSD)</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${Math.round(i.hrv)} ms</div>
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">In personal range</div>
          </div>
          <div class="m3-carousel-item clickable-tile" data-open-metric="rhr" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Sleeping RHR</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${Math.round(i.rhr)} bpm</div>
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">Optimal dip</div>
          </div>
          <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">SpO2</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${(i.spo2||98).toFixed(0)}%</div>
            <div style="font-size: 11px; color: var(--m3-ink-2);">96–99% baseline</div>
          </div>
          <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Breathing Rate</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">14.2 brpm</div>
            <div style="font-size: 11px; color: var(--m3-ink-2);">Steady</div>
          </div>
          <div class="m3-carousel-item clickable-tile" data-open-metric="vo2" style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 12px;">
            <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Cardio Fitness</div>
            <div class="tabular" style="font-size: 18px; font-weight: 800; margin-top: 2px;">${(i.vo2||49.4).toFixed(1)}</div>
            <div style="font-size: 11px; color: var(--m3-amber); font-weight: 700;">mL/kg/min</div>
          </div>
        </div>
      </div>

      <!-- Beat 4: Recent Garmin .FIT Run + Strength Session Seam Stack AND Weight EWMA + Body Comp -->
      <div class="m3-split-12">
        <div class="span-7 m3-seam">
          <div class="m3-seam-top clickable-tile" data-switch-tab="fitness" style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-amber);">LATEST GARMIN .FIT RUN</div>
              <div style="font-size: 14px; font-weight: 800; margin-top: 1px;">
                ${Z(r?.title||"Garmin Aerobic Run (.FIT)")}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${r?`${(r.distance_m/1609.344).toFixed(2)} mi • Avg HR ${r.avg_hr} bpm • VDOT ${r.vdot_open.toFixed(1)} • TRIMP ${Math.round(r.trimp)}`:"Upload or generate a .FIT run in Fitness tab"}
              </div>
            </div>
            <span class="m3-pill">Splits ›</span>
          </div>

          <div class="m3-seam-bot clickable-tile" data-switch-tab="lift" style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal);">LATEST STRENGTH SESSION</div>
              <div style="font-size: 14px; font-weight: 800; margin-top: 1px;">
                ${Z(t?.title||"Push / Chest & Triceps")}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${t?`${t.local_date} • ${t.sets?.length||0} working sets (${Z(t.source)})`:"Tap + Lift to log sets in 1 tap"}
              </div>
            </div>
            <span class="m3-btn-tonal">+ Lift</span>
          </div>
        </div>

        <div class="span-5 m3-pair">
          <div class="m3-pair-l" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div class="clickable-tile" data-open-metric="weight" style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Weight (EWMA)</span>
              <span style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">4y ›</span>
            </div>
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 6px;">
              <div>
                <div class="tabular" style="font-size: 22px; font-weight: 800;">
                  ${l?l.ewma_weight_lb.toFixed(1):"171.4"} <span style="font-size: 12px; font-weight: 600;">lb</span>
                </div>
                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Scale: ${l?l.weight_lb.toFixed(1):"171.6"} lb (${l&&l.delta_vs_peak<=0?"":"+"}${l?l.delta_vs_peak.toFixed(1):"-8.4"} vs peak)
                </div>
              </div>
              ${l?.sparkline?.length?re(l.sparkline,"var(--m3-teal)",62,24):""}
            </div>
            <form id="form-quick-weight" style="display: flex; gap: 5px; margin-top: 2px;">
              <input
                id="input-quick-weight"
                type="number"
                step="0.1"
                placeholder="${l?l.weight_lb.toFixed(1):"171.5"} lb"
                class="m3-input tabular"
                style="padding: 6px 9px; font-size: 12px;"
                aria-label="Quick log weight in pounds"
              />
              <button id="btn-quick-weight-save" type="submit" class="m3-btn-fill" style="padding: 6px 11px;">Log</button>
            </form>
          </div>

          <div class="m3-pair-r clickable-tile" data-open-metric="body_fat" style="display: flex; flex-direction: column; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
              <span style="font-size: 13px; font-weight: 700;">Body Comp</span>
              <span style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">4y ›</span>
            </div>
            <div>
              <div class="tabular" style="font-size: 22px; font-weight: 800;">
                ${l?.body_fat_pct?l.body_fat_pct.toFixed(1):"13.6"}%
              </div>
              <div style="font-size: 11px; color: var(--m3-ink-2);">Body Fat</div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
              Lean Mass: ${l?.lean_mass_lb?l.lean_mass_lb.toFixed(1):"148.1"} lb
            </div>
          </div>
        </div>
      </div>
    </div>
  `}function Z(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ye(e,a,i){const p=e.overview;if(!p)return $e(e,i);const d=p.pillars.filter(o=>o.enabled),r=d.filter(o=>o.role==="focus"),t=d.filter(o=>o.role!=="focus"),l=p.pillars.length-d.length,s=!!p.preferences?.feature_flags?.tool_wearable_intraday,c=r.map(o=>o.label).join(" + ")||"Pick 1–2 Focus Pillars";return`
    <div id="view-overview" style="display: flex; flex-direction: column; gap: 14px;">
      <!-- Beat 1: Calm Active Phase Banner -->
      <section class="m3-hero" style="padding: 18px 20px; display: flex; flex-direction: column; gap: 12px;">
        <div style="display: flex; flex-wrap: wrap; align-items: flex-start; justify-content: space-between; gap: 12px;">
          <div style="display: flex; flex-direction: column; gap: 4px; max-width: 640px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-on-teal); opacity: 0.82;">
                ACTIVE PHASE • SINCE ${E(p.phase.start_date)}
              </span>
              <span class="tabular" style="font-size: 11px; font-weight: 800; padding: 2px 9px; border-radius: 999px; background: var(--m3-hero-pill); color: var(--m3-on-teal);">
                ${p.on_track_count} / ${p.enabled_count} on track
              </span>
            </div>
            <h2 style="margin: 0; font-size: 21px; font-weight: 800; letter-spacing: -0.02em; color: var(--m3-on-teal);">
              ${E(p.phase.name)}
            </h2>
            <div style="font-size: 13px; color: var(--m3-on-teal); opacity: 0.88;">
              Focusing on <strong>${E(c)}</strong>${t.length>0?` while holding <strong>${E(t.map(o=>o.label).join(", "))}</strong> at baseline.`:"."}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
            <button type="button" id="btn-hero-checkin" class="m3-btn-fill" style="padding: 8px 15px;">
              + Check-In
            </button>
            <button type="button" id="btn-hero-lift" data-switch-tab="lift" class="m3-pill" style="background: var(--m3-hero-pill); color: var(--m3-on-teal);">
              + Log Lift
            </button>
            <button type="button" id="btn-hero-customize" class="m3-pill" style="background: var(--m3-hero-pill); color: var(--m3-on-teal);">
              ⚙ Phase &amp; Flags
            </button>
          </div>
        </div>
      </section>

      <!-- Beat 2: Active Focus Pillars (1-2 Large Glass-Box Cards) -->
      ${r.length>0?`
          <section style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-teal);">
                PRIMARY FOCUS (${r.length}) — MEANINGFUL PROGRESSION
              </span>
              <span style="font-size: 11px; color: var(--m3-ink-2);">
                Computed live from raw logs • tap "Under the Hood" for exact math
              </span>
            </div>
            <div class="pillar-grid-focus">
              ${r.map(o=>Se(o,!!a[o.key],!0)).join("")}
            </div>
          </section>
        `:""}

      <!-- Beat 3: Maintenance Baseline Guardrails -->
      ${t.length>0?`
          <section style="display: flex; flex-direction: column; gap: 8px;">
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 0 4px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-ink-2);">
                MAINTENANCE BASELINE (${t.length}) — HOLD ABOVE FLOOR
              </span>
              <span style="font-size: 11px; color: var(--m3-ink-2);">
                Alerts only if drifting below guardrail
              </span>
            </div>
            <div class="pillar-grid-maint">
              ${t.map(o=>Se(o,!!a[o.key],!1)).join("")}
            </div>
          </section>
        `:""}

      <!-- Calm Feature-Flag Expand Footer -->
      <div class="m3-card" style="padding: 12px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px;">
        <div style="color: var(--m3-ink-2);">
          Showing <strong>${d.length} of ${p.pillars.length}</strong> life pillars
          ${l>0?` • ${l} feature-flagged off to keep your view calm`:" • All pillars active"}
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <button type="button" id="btn-footer-customize" class="m3-btn-tonal" style="padding: 5px 11px;">
            ⚙ Manage Pillars &amp; Formulas
          </button>
        </div>
      </div>

      ${s?`
          <div style="margin-top: 6px; display: flex; flex-direction: column; gap: 8px;">
            <div style="font-size: 11px; font-weight: 800; letter-spacing: 0.05em; color: var(--m3-ink-2); padding: 0 4px;">
              DAILY WEARABLE INTRADAY (FEATURE-FLAGGED)
            </div>
            ${$e(e,i)}
          </div>
        `:""}
    </div>
  `}function Se(e,a,i){const p=`var(${e.color_token||"--m3-teal"})`,d=et(e.color_token),r=tt(e.status),t=e.score_model==="percentile"?"Percentile":"Optimum",l=e.has_data?Math.max(4,Math.min(100,Math.round(e.score))):0,s=Math.max(5,Math.min(98,Math.round(e.target_or_floor||75)));return`
    <article
      class="m3-card"
      data-pillar-card="${E(e.key)}"
      style="padding: ${i?"17px 18px":"15px 16px"}; display: flex; flex-direction: column; gap: 11px; border: 1.5px solid ${e.status==="slipping"?"var(--m3-coral)":i?"var(--m3-hairline)":"transparent"};"
    >
      <!-- Top Row: Name + Model Tag + Status Pill -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 7px;">
          <strong style="font-size: ${i?"16px":"15px"}; letter-spacing: -0.01em;">${E(e.label)}</strong>
          <span
            style="font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 999px; background: var(--m3-surface-dim); color: var(--m3-ink-2);"
            title="${E(e.score_model_note)}"
          >${t}</span>
        </div>

        <span class="tabular" style="font-size: 11px; font-weight: 800; padding: 3px 9px; border-radius: 999px; ${r}">
          ${E(e.status_label)}
        </span>
      </div>

      <!-- Core Stat Row: 0-100 Gauge + Primary Raw Metric Right Beside It -->
      <div style="display: flex; align-items: center; gap: 14px;">
        <div style="flex-shrink: 0;">
          ${fe(e.has_data?e.score:0,p,d)}
        </div>

        <div style="min-width: 0; flex: 1; display: flex; flex-direction: column; gap: 3px;">
          <div class="tabular" style="font-size: ${i?"16px":"14.5px"}; font-weight: 800; line-height: 1.25; color: var(--m3-ink);">
            ${E(e.primary_raw)}
          </div>
          ${e.secondary_raw?`<div class="tabular" style="font-size: 12px; color: var(--m3-ink-2);">${E(e.secondary_raw)}</div>`:""}
          <div class="tabular" style="font-size: 11.5px; font-weight: 700; color: ${e.delta_30d>0?"var(--m3-teal)":e.delta_30d<0?"var(--m3-coral)":"var(--m3-ink-2)"};">
            ${E(e.delta_text)}
          </div>
        </div>
      </div>

      <!-- Objective Target / Maintenance Floor Guardrail Bar -->
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--m3-ink-2);" class="tabular">
          <span>${e.has_data?`${Math.round(e.score)} / 100`:"No data"}</span>
          <span>${i?`Phase Target: ${Math.round(e.target_or_floor)}`:`Maintenance Floor: ${Math.round(e.target_or_floor)}`}</span>
        </div>
        <div style="position: relative; height: 7px; border-radius: 999px; background: var(--m3-surface-dim); overflow: visible;">
          <div style="width: ${l}%; height: 100%; border-radius: 999px; background: ${p}; transition: width 220ms ease;"></div>
          <div
            title="${i?"Phase Target":"Maintenance Floor"}: ${Math.round(e.target_or_floor)}"
            style="position: absolute; top: -2px; left: ${s}%; width: 2.5px; height: 11px; border-radius: 2px; background: var(--m3-ink); opacity: 0.55;"
          ></div>
        </div>
      </div>

      <!-- Seamless Actions: Under the Hood + 4y Chart -->
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; padding-top: 2px;">
        <button
          type="button"
          class="m3-pill"
          data-toggle-hood="${E(e.key)}"
          style="padding: 5px 11px; font-size: 11.5px;"
        >
          ${a?"Hide Raw Math ▴":"Under the Hood ▾"}
        </button>

        <button
          type="button"
          class="m3-btn-tonal"
          data-open-metric="${E(e.metric_key)}"
          style="padding: 5px 11px; font-size: 11.5px;"
        >
          4y Trend ›
        </button>
      </div>

      <!-- Expandable Glass-Box Breakdown -->
      ${a?`
          <div style="border-top: 1px solid var(--m3-hairline); padding-top: 10px; display: flex; flex-direction: column; gap: 7px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--m3-ink-2); flex-wrap: wrap;">
              <span>${E(e.score_model_note)}</span>
              <code style="font-size: 10.5px; background: var(--m3-surface-dim); padding: 1px 6px; border-radius: 6px;">${E(e.formula_version)}</code>
            </div>

            ${e.breakdown&&e.breakdown.length>0?e.breakdown.map(c=>`
                  <div
                    class="${c.metric_key?"clickable-tile":""}"
                    ${c.metric_key?`data-open-metric="${E(c.metric_key)}"`:""}
                    style="background: var(--m3-surface-dim); border-radius: 14px; padding: 8px 11px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
                  >
                    <div style="min-width: 0;">
                      <div style="font-size: 12px; font-weight: 700;">
                        ${E(c.label)}
                        ${c.weight_pct>0?`<span style="font-size: 10.5px; color: var(--m3-ink-2); font-weight: 600;"> (${c.weight_pct}%)</span>`:""}
                      </div>
                      ${c.note?`<div style="font-size: 11px; color: var(--m3-ink-2); margin-top: 1px;">${E(c.note)}</div>`:""}
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                      <div class="tabular" style="font-size: 12.5px; font-weight: 800;">${E(c.raw_value)}</div>
                      ${c.max_points>0?`<div class="tabular" style="font-size: 10.5px; color: var(--m3-teal); font-weight: 700;">${c.points} / ${c.max_points} pts</div>`:'<div style="font-size: 10.5px; color: var(--m3-ink-2);">Context</div>'}
                    </div>
                  </div>
                `).join(""):'<div style="font-size: 12px; color: var(--m3-ink-2);">Log an entry via <strong>+ Check-In</strong> to populate this formula.</div>'}
          </div>
        `:""}
    </article>
  `}function et(e){switch(e){case"--m3-blue":return"var(--m3-blue-track)";case"--m3-amber":return"var(--m3-amber-track)";case"--m3-coral":return"var(--m3-coral-track)";default:return"var(--m3-teal-track)"}}function tt(e){switch(e){case"focus_improving":case"improving":case"holding":return"background: var(--m3-teal-tint); color: var(--m3-on-teal);";case"focus_steady":return"background: var(--m3-amber-tint); color: var(--m3-on-amber);";case"slipping":return"background: hsla(12, 82%, 56%, 0.16); color: var(--m3-coral);";default:return"background: var(--m3-surface-dim); color: var(--m3-ink-2);"}}function E(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function at(e){const a=e.sleep||{local_date:e.selected_date,efficiency_pct:92,deep_min:98,rem_min:108,light_min:248,awake_min:28,nadir_hr_bpm:47,nadir_time:"03:40 AM",bedtime_label:"11:08 PM – 6:52 AM",sleep_score_open:88},p=(e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1])?.sleep_score||a.sleep_score_open||88,d=(a.deep_min||96)+(a.rem_min||106)+(a.light_min||245),r=(a.deep_min||96)+(a.rem_min||106),t=Math.round(r/Math.max(1,d)*100),l=s=>`${Math.floor(s/60)}h ${String(s%60).padStart(2,"0")}m`;return`
    <div id="view-sleep" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Sleep Hero + Stages Donut -->
      <section class="m3-seam">
        <div class="m3-seam-top clickable-tile" data-open-metric="sleep" style="padding: 18px 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: var(--m3-blue); letter-spacing: 0.04em;">
              SLEEP ARCHITECTURE • ${ce(a.bedtime_label||"11:10 PM – 6:55 AM")}
            </span>
            <div style="display: flex; align-items: baseline; gap: 10px;">
              <span class="tabular" style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em;">${l(d)}</span>
              <span class="badge-trend tabular" style="background: var(--m3-blue-tint); color: var(--m3-on-blue);">Score ${Math.round(p)}</span>
            </div>
            <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2);">
              Restorative (Deep + REM): <strong>${l(r)} (${t}%)</strong> • Open Score: ${Math.round(a.sleep_score_open||87)}
            </div>
          </div>

          ${Ce(a.deep_min||96,a.rem_min||106,a.light_min||245,a.awake_min||26,a.efficiency_pct||92)}
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-blue); font-weight: 800;">● Deep</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${l(a.deep_min||96)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">● REM</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${l(a.rem_min||106)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-amber); font-weight: 800;">● Light</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${l(a.light_min||245)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-coral); font-weight: 800;">● Awake</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${a.awake_min||26}m</div>
          </div>
        </div>
      </section>

      <!-- Bedtime Consistency | Sleeping HR Dip Pair -->
      <div class="m3-pair">
        <div class="m3-pair-l" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Bedtime Window</span>
          <div class="tabular" style="font-size: 18px; font-weight: 800;">${ce(a.bedtime_label||"11:08 PM – 6:52 AM")}</div>
          <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">Within ±22 min of 14d median</div>
        </div>
        <div class="m3-pair-r clickable-tile" data-open-metric="rhr" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Sleeping HR Nadir</span>
          <div class="tabular" style="font-size: 18px; font-weight: 800;">
            ${Math.round(a.nadir_hr_bpm||47)} bpm <span style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">@ ${ce(a.nadir_time||"03:40 AM")}</span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">Hammock recovery curve</div>
        </div>
      </div>

      <!-- 14-Day Sleep Duration Capsule Chart -->
      <div class="m3-card" style="padding: 15px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between;">
          <strong style="font-size: 13px;">14-Day Sleep Duration vs 7.75h Target</strong>
          <span class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">Dashed line = 7.75h target</span>
        </div>
        <div style="width: 100%; height: 126px;">
          <canvas id="sleep14dCanvas" style="width: 100%; height: 100%;"></canvas>
        </div>
      </div>
    </div>
  `}function ce(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const it={today:"pillar:strength",fitness:"lift:bench-press",sleep:"pillar:sleep",health:"lab:apob",lift:"lift:bench-press"},n={theme:localStorage.getItem("autofit_theme")||"light",viewport:window.innerWidth<760?"mobile":"desktop",activeTab:"today",selectedDate:"",stepMode:"24h",liftQuery:"",calDrawerOpen:!1,syncDrawerOpen:!1,checkinDrawerOpen:!1,checkinShowAll:!1,customizeDrawerOpen:!1,expandedPillars:{},explorerOpen:!1,activeMetric:"pillar:strength",activeHorizon:"all",bootstrap:null,trend:null,toastMessage:null,lift:{selectedSplitIdx:0,customItems:[],loggedSlugs:{},expandedSlug:null,weightOverrides:{},repsOverrides:{},equipOverrides:{},calcTargetSlug:null,calcEquipKey:"olympic_45",calcPlatesPerSide:[45,10,2.5],restSecondsLeft:0,simulateOffline:!1,queuedOfflineCount:0}};let ue=null,Y=null;function f(e){n.toastMessage=e,h(),ue&&window.clearTimeout(ue),ue=window.setTimeout(()=>{n.toastMessage=null;const a=document.getElementById("m3-toast-banner");a&&a.remove()},3400)}function ze(e){n.lift.restSecondsLeft=e,Y&&window.clearInterval(Y),h(),Y=window.setInterval(()=>{if(n.lift.restSecondsLeft>0){if(n.lift.restSecondsLeft-=1,n.activeTab==="lift"){const a=document.getElementById("btn-rest-90");if(a){const i=n.lift.restSecondsLeft;a.textContent=i>0?`⏱ ${Math.floor(i/60)}:${String(i%60).padStart(2,"0")}`:"90s",a.setAttribute("data-on",i>0?"true":"false")}}n.lift.restSecondsLeft===0&&(Y&&window.clearInterval(Y),f("Rest complete — ready for next set!"))}},1e3)}async function $(e){try{const a=await S.getBootstrap(e||n.selectedDate||void 0);n.bootstrap=a,n.selectedDate=a.selected_date;const i=await te();n.lift.queuedOfflineCount=i.length,await Q(n.activeMetric,n.activeHorizon,!1),h()}catch(a){f(`Offline / cached mode: ${a.message}`),h()}}async function Q(e,a,i=!0){n.activeMetric=e,n.activeHorizon=a;try{n.trend=await S.getTrend(e,a)}catch{}i&&h()}function h(){const e=document.getElementById("m3-app");if(!e)return;e.setAttribute("data-mode",n.theme),e.setAttribute("data-viewport",n.viewport);const a=n.bootstrap;if(!a){e.innerHTML=`
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">✦</div>
        <strong style="font-size: 15px;">Loading Autofit SQLite Engine…</strong>
      </div>
    `;return}const i=a.week_strip[a.selected_index]||a.week_strip[a.week_strip.length-1],p=a.integrations?.google_health,d=a.overview?.preferences?.feature_flags||{pillar_sleep:!0,view_health_labs:!1,tool_ols_calibration:!1,tool_wearable_intraday:!1};n.activeTab==="health"&&!d.view_health_labs&&(n.activeTab="today"),n.activeTab==="sleep"&&!d.pillar_sleep&&(n.activeTab="today");const r={today:"Overview",fitness:"Fitness & Lifts",sleep:"Sleep & Recovery",health:"Clinical Health",lift:"1-Tap Lift Logger"},t=(a.week_strip||[]).map((c,o)=>{const y=o===a.selected_index;return`
        <button
          type="button"
          id="cal-day-${c.date}"
          class="cal-btn"
          data-select-date="${c.date}"
          data-sel="${y?"true":"false"}"
        >
          <span style="font-size: 11px; color: var(--m3-ink-2);">${c.day_letter}</span>
          ${Fe(c.steps/1e4,c.day_num,y)}
        </button>
      `}).join("");let l="";switch(n.activeTab){case"today":l=Ye(a,n.expandedPillars,n.stepMode);break;case"fitness":l=Ue(a,n.liftQuery);break;case"sleep":l=at(a);break;case"health":l=Je(a);break;case"lift":l=Xe(a,n.lift);break}const s=n.activeTab==="sleep"||n.activeTab==="today"&&d.tool_wearable_intraday;e.innerHTML=`
    <!-- Top App & Viewport Bar -->
    <header class="preview-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: var(--m3-teal-tint); color: var(--m3-on-teal); width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800;">✦</span>
        <strong style="font-size: 14px;">Autofit</strong>
        <span class="tabular" style="color: var(--m3-ink-2); font-weight: 600;">
          ${a.overview?`${a.overview.on_track_count}/${a.overview.enabled_count} pillars on track`:`${a.total_workouts} workouts`}
          ${n.lift.queuedOfflineCount>0?` • ${n.lift.queuedOfflineCount} offline queued`:""}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <button type="button" id="btn-open-customize" class="m3-pill" style="padding: 5px 11px;">
          <span>⚙ Customize</span>
        </button>

        <button type="button" id="btn-open-sync" class="m3-pill" style="padding: 5px 11px;">
          <span>⇄ Sync &amp; CSV</span>
          ${p?.status==="expiring_soon"?'<span style="color: var(--m3-amber);">●</span>':""}
        </button>

        <div class="m3-seg" role="group" aria-label="Viewport Mode">
          <button type="button" id="btn-vp-mobile" data-vp="mobile" data-on="${n.viewport==="mobile"?"true":"false"}">Mobile PWA</button>
          <button type="button" id="btn-vp-desktop" data-vp="desktop" data-on="${n.viewport==="desktop"?"true":"false"}">Desktop Web</button>
        </div>

        <button type="button" id="btn-theme-toggle" class="m3-pill" style="padding: 5px 11px;">
          <span>${n.theme==="light"?"☾ Dark":"☀ Light"}</span>
        </button>
      </div>
    </header>

    <div class="app-shell">
      <!-- Desktop Left Navigation Rail (Feature-Flagged) -->
      <aside id="m3-rail" aria-label="Primary Navigation">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%;">
          <button
            type="button"
            id="rail-fab-lift"
            data-switch-tab="lift"
            data-active="${n.activeTab==="lift"?"true":"false"}"
            style="width: 56px; height: 56px; border-radius: 18px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px; font-weight: 700;"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Lift</span>
          </button>

          <nav style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            ${ne("today","Overview",'<rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/>')}
            ${ne("fitness","Fitness",'<path d="M3 17l5-5 4 4 8-9"/><path d="M16 7h4v4"/>')}
            ${d.pillar_sleep?ne("sleep","Sleep",'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>'):""}
            ${d.view_health_labs?ne("health","Health",'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'):""}
          </nav>
        </div>

        <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); text-align: center;">
          WAL Ready<br/>v0.2
        </div>
      </aside>

      <!-- Main Content Stage -->
      <main class="main-stage">
        <div class="stage-inner">
          <!-- Calm Context Bar -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 10px;">
                <h1 id="top-view-title" style="margin: 0; font-size: 19px; font-weight: 800; letter-spacing: -0.02em;">
                  ${r[n.activeTab]}
                </h1>
                ${d.tool_wearable_intraday?`<button
                         type="button"
                         id="btn-device-pill"
                         data-toggle-sync="true"
                         style="background: var(--m3-surface); padding: 5px 10px 5px 8px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 6px; font-size: 11.5px; font-weight: 600;"
                       >
                         <span style="width: 7px; height: 7px; border-radius: 9999px; background: var(--m3-teal);"></span>
                         <span>Fitbit Air</span>
                         <span class="tabular" style="color: var(--m3-ink-2); font-weight: 500;">${i?.battery_pct||92}%</span>
                       </button>`:""}
              </div>

              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                <button
                  type="button"
                  id="btn-open-checkin"
                  class="m3-pill"
                  style="background: var(--m3-surface); padding: 6px 11px;"
                >
                  ${n.checkinDrawerOpen?"Close Check-In":"+ Check-In"}
                </button>
                <button
                  type="button"
                  id="btn-toggle-explorer"
                  class="m3-btn-tonal"
                  style="padding: 6px 11px;"
                >
                  ${n.explorerOpen?"Hide 4y Chart":"4y Trends"}
                </button>
                ${d.tool_ols_calibration?`<button
                         type="button"
                         id="btn-tune-scores"
                         class="m3-pill"
                         style="background: var(--m3-surface); padding: 6px 11px;"
                       >Tune</button>`:""}
              </div>
            </div>

            ${s?`<div id="week-strip" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px;">
                     ${t}
                   </div>`:""}
          </div>

          ${qe(a,n.checkinDrawerOpen,n.checkinShowAll)}
          ${We(a,n.customizeDrawerOpen)}
          ${Ve(a,n.calDrawerOpen&&d.tool_ols_calibration)}
          ${Ge(a,n.syncDrawerOpen)}

          ${n.explorerOpen?Be(n.trend,a.metric_catalog||[],n.activeHorizon,n.activeTab!=="fitness"):""}

          ${l}
        </div>
      </main>

      <!-- Mobile Sticky Frosted Pill Dock + Squircle + Lift FAB (Feature-Flagged) -->
      <div id="m3-floating-dock" role="navigation" aria-label="Mobile Navigation">
        <div class="dock-pill">
          ${se("today","Overview")}
          ${se("fitness","Fitness")}
          ${d.pillar_sleep?se("sleep","Sleep"):""}
          ${d.view_health_labs?se("health","Health"):""}
        </div>
        <button
          type="button"
          id="dock-fab-lift"
          data-switch-tab="lift"
          data-active="${n.activeTab==="lift"?"true":"false"}"
          class="dock-fab"
          aria-label="Log Lift"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <span style="font-size: 10px;">Lift</span>
        </button>
      </div>
    </div>

    ${n.toastMessage?`<div id="m3-toast-banner" class="m3-toast" role="status">${st(n.toastMessage)}</div>`:""}
  `,Le(a),lt(e,a)}function ne(e,a,i){return`
    <button type="button" id="rail-nav-${e}" data-switch-tab="${e}" data-active="${n.activeTab===e?"true":"false"}" class="rail-btn">
      <span class="rail-pill">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">${i}</svg>
      </span>
      <span>${a}</span>
    </button>
  `}function se(e,a){return`
    <button type="button" id="dock-nav-${e}" data-switch-tab="${e}" data-active="${n.activeTab===e?"true":"false"}" class="dock-tab">
      <span>${a}</span>
    </button>
  `}function Le(e){if(n.explorerOpen&&n.trend&&Pe(document.getElementById("longTermCanvas"),document.getElementById("trend-scrub-readout"),n.trend),n.activeTab==="today"){const a=document.getElementById("stepsCapsuleCanvas");if(n.stepMode==="24h"){const i=e.intraday?.hourly_steps||new Array(24).fill(0),p=i.map((d,r)=>r===0?"12a":r===6?"6a":r===12?"12p":r===18?"6p":r===23?"11p":"");pe(a,i,p,"--m3-teal")}else{const i=(e.week_strip||[]).map(d=>d.steps),p=(e.week_strip||[]).map(d=>d.day_letter);pe(a,i,p,"--m3-teal",1e4)}Oe(document.getElementById("rhrMiniWaveCanvas"),e.intraday?.intraday_hr||[56,54,53,52,51,52,50],"--m3-coral")}if(n.activeTab==="sleep"){const a=e.intraday?.sleep_14d||[];pe(document.getElementById("sleep14dCanvas"),a.map(i=>i.hours),a.map(i=>i.label),"--m3-blue",7.75)}}function lt(e,a){document.getElementById("btn-theme-toggle")?.addEventListener("click",()=>{n.theme=n.theme==="light"?"dark":"light",localStorage.setItem("autofit_theme",n.theme),h()}),e.querySelectorAll("[data-vp]").forEach(r=>{r.addEventListener("click",()=>{const t=r.getAttribute("data-vp");t&&(n.viewport=t,h())})}),e.querySelectorAll("[data-switch-tab]").forEach(r=>{r.addEventListener("click",t=>{t.preventDefault(),t.stopPropagation();const l=r.getAttribute("data-switch-tab");l&&(n.activeTab=l,n.calDrawerOpen=!1,n.syncDrawerOpen=!1,n.checkinDrawerOpen=!1,n.customizeDrawerOpen=!1,n.explorerOpen=l==="fitness",l==="fitness"&&!n.activeMetric.startsWith("lift:")&&n.activeMetric!=="vo2"?Q("lift:bench-press",n.activeHorizon,!0):h(),window.scrollTo({top:0,behavior:"instant"}))})});const i=()=>{n.checkinDrawerOpen=!n.checkinDrawerOpen,n.checkinDrawerOpen&&(n.customizeDrawerOpen=!1,n.syncDrawerOpen=!1,n.calDrawerOpen=!1),h()},p=()=>{n.customizeDrawerOpen=!n.customizeDrawerOpen,n.customizeDrawerOpen&&(n.checkinDrawerOpen=!1,n.syncDrawerOpen=!1,n.calDrawerOpen=!1),h()};document.getElementById("btn-open-checkin")?.addEventListener("click",i),document.getElementById("btn-hero-checkin")?.addEventListener("click",i),document.getElementById("btn-close-checkin")?.addEventListener("click",()=>{n.checkinDrawerOpen=!1,h()}),document.getElementById("btn-toggle-all-checkin")?.addEventListener("click",()=>{n.checkinShowAll=!n.checkinShowAll,h()}),document.getElementById("btn-open-customize")?.addEventListener("click",p),document.getElementById("btn-hero-customize")?.addEventListener("click",p),document.getElementById("btn-footer-customize")?.addEventListener("click",p),document.getElementById("btn-close-customize")?.addEventListener("click",()=>{n.customizeDrawerOpen=!1,h()}),document.getElementById("btn-tune-scores")?.addEventListener("click",()=>{n.calDrawerOpen=!n.calDrawerOpen,h()}),document.getElementById("btn-close-cal")?.addEventListener("click",()=>{n.calDrawerOpen=!1,h()}),document.getElementById("btn-open-sync")?.addEventListener("click",()=>{n.syncDrawerOpen=!n.syncDrawerOpen,n.syncDrawerOpen&&(n.checkinDrawerOpen=!1,n.customizeDrawerOpen=!1),h()}),document.getElementById("btn-device-pill")?.addEventListener("click",()=>{n.syncDrawerOpen=!n.syncDrawerOpen,h()}),document.getElementById("btn-close-sync")?.addEventListener("click",()=>{n.syncDrawerOpen=!1,h()}),document.getElementById("btn-toggle-explorer")?.addEventListener("click",()=>{const r=!n.explorerOpen;if(n.explorerOpen=r,r){const t=it[n.activeTab]||"pillar:strength";if(n.activeTab!=="fitness"&&n.activeMetric!==t){Q(t,n.activeHorizon,!0);return}}h()}),document.getElementById("btn-close-explorer")?.addEventListener("click",()=>{n.explorerOpen=!1,h()}),e.querySelectorAll("[data-toggle-hood]").forEach(r=>{r.addEventListener("click",t=>{t.stopPropagation();const l=r.getAttribute("data-toggle-hood")||"";l&&(n.expandedPillars[l]=!n.expandedPillars[l],h())})}),e.querySelectorAll("[data-toggle-flag]").forEach(r=>{r.addEventListener("click",async()=>{const t=r.getAttribute("data-toggle-flag"),l=a.overview?.preferences;if(!t||!l)return;const s={...l,feature_flags:{...l.feature_flags,[t]:!l.feature_flags[t]}};try{await S.updatePreferences(s),await $(n.selectedDate)}catch(c){f(`Flag update failed: ${c.message}`)}})}),e.querySelectorAll("[data-toggle-focus]").forEach(r=>{r.addEventListener("click",async()=>{const t=r.getAttribute("data-toggle-focus")||"",l=a.overview?.phase;if(!t||!l)return;const s=[...l.focus_pillars||[]],c=s.indexOf(t);if(c>=0){if(s.length===1){f("Keep at least 1 Focus pillar in your active phase.");return}s.splice(c,1)}else s.length>=2&&s.shift(),s.push(t);try{await S.updateActivePhase({...l,focus_pillars:s}),await $(n.selectedDate)}catch(o){f(`Phase update failed: ${o.message}`)}})}),document.getElementById("form-phase-editor")?.addEventListener("submit",async r=>{r.preventDefault();const t=a.overview?.phase;if(!t)return;const l=document.getElementById("in-phase-name")?.value.trim()||t.name,s=document.getElementById("in-phase-start")?.value||t.start_date,c=parseFloat(document.getElementById("in-phase-floor")?.value||"75"),o={...t.floors||{}};["strength","cardio","sleep","weight","body_fat","flexibility","screen_time"].forEach(y=>{o[y]=Number.isFinite(c)?c:75});try{await S.updateActivePhase({...t,name:l,start_date:s,floors:o}),f(`Updated phase "${l}"!`),await $(n.selectedDate)}catch(y){f(`Phase save failed: ${y.message}`)}}),document.getElementById("form-formula-prefs")?.addEventListener("submit",async r=>{r.preventDefault();const t=a.overview?.preferences;if(!t)return;const l=document.getElementById("in-pref-sex")?.value||t.sex,s=parseInt(document.getElementById("in-pref-age")?.value||String(t.age),10),c=parseFloat(document.getElementById("in-pref-weight")?.value||String(t.weight_target_lb)),o=parseFloat(document.getElementById("in-pref-bflo")?.value||String(t.bf_opt_low)),y=parseFloat(document.getElementById("in-pref-bfhi")?.value||String(t.bf_opt_high)),m=parseInt(document.getElementById("in-pref-screen")?.value||String(t.screen_time_target_min),10),v=parseInt(document.getElementById("in-pref-mob")?.value||String(t.mobility_weekly_target_min),10);try{await S.updatePreferences({...t,sex:l,age:Number.isFinite(s)?s:t.age,weight_target_lb:Number.isFinite(c)?c:t.weight_target_lb,bf_opt_low:Number.isFinite(o)?o:t.bf_opt_low,bf_opt_high:Number.isFinite(y)?y:t.bf_opt_high,screen_time_target_min:Number.isFinite(m)?m:t.screen_time_target_min,mobility_weekly_target_min:Number.isFinite(v)?v:t.mobility_weekly_target_min}),f("Formulas updated — all scores recalculated on demand!"),await $(n.selectedDate)}catch(b){f(`Formula save failed: ${b.message}`)}}),document.getElementById("form-unified-checkin")?.addEventListener("submit",async r=>{r.preventDefault();const t=b=>{const g=document.getElementById(b)?.value?.trim()||"";if(!g)return 0;const w=parseFloat(g);return Number.isFinite(w)?w:0},l=b=>(document.getElementById(b)?.value?.trim()||"")!=="",s=document.getElementById("in-chk-date")?.value||n.selectedDate,c=t("in-chk-screen-h"),o=t("in-chk-screen-m"),y=l("in-chk-screen-h")||l("in-chk-screen-m")?Math.round(c*60+o):0,m=[];l("in-rom-ankle")&&m.push({test_slug:"ankle_ktw_cm",value_num:t("in-rom-ankle"),unit:"cm"}),l("in-rom-reach")&&m.push({test_slug:"sit_reach_in",value_num:t("in-rom-reach"),unit:"in"}),l("in-rom-shoulder")&&m.push({test_slug:"shoulder_flex_deg",value_num:t("in-rom-shoulder"),unit:"deg"}),l("in-rom-squat")&&m.push({test_slug:"deep_squat_score",value_num:t("in-rom-squat"),unit:"/5"});const v={local_date:s,weight_lb:t("in-chk-weight"),body_fat_pct:t("in-chk-bf"),waist_in:t("in-chk-waist"),screen_time_min:y,mobility_min:Math.round(t("in-chk-mob-min")),sleep_hours:t("in-chk-sleep-hrs"),sleep_efficiency_pct:t("in-chk-sleep-eff"),cardio_min:t("in-chk-cardio-min"),cardio_distance_mi:t("in-chk-cardio-mi"),cardio_avg_hr:Math.round(t("in-chk-cardio-hr")),mobility_tests:m};try{const b=await S.logCheckin(v);n.checkinDrawerOpen=!1;const g=b.logged?.length?b.logged.join(", "):"check-in";f(`Saved ${g} — scores updated!`),await $(s)}catch(b){f(`Check-in failed: ${b.message}`)}}),e.querySelectorAll("[data-select-date]").forEach(r=>{r.addEventListener("click",()=>{const t=r.getAttribute("data-select-date");t&&$(t)})}),e.querySelectorAll("[data-open-metric]").forEach(r=>{r.addEventListener("click",t=>{const l=t.target;if(l!==r&&(l.tagName==="INPUT"||l.tagName==="BUTTON"||l.closest("form")))return;const s=r.getAttribute("data-open-metric");s&&(n.explorerOpen=!0,Q(s,n.activeHorizon,!0).then(()=>{document.getElementById("trend-explorer-card")?.scrollIntoView({behavior:"smooth",block:"nearest"})}))})}),e.querySelectorAll("[data-metric-chip]").forEach(r=>{r.addEventListener("click",()=>{const t=r.getAttribute("data-metric-chip");t&&Q(t,n.activeHorizon,!0)})}),e.querySelectorAll("[data-hz-btn]").forEach(r=>{r.addEventListener("click",()=>{const t=r.getAttribute("data-hz-btn");t&&Q(n.activeMetric,t,!0)})}),e.querySelectorAll("[data-step-mode]").forEach(r=>{r.addEventListener("click",()=>{n.stepMode=r.getAttribute("data-step-mode")||"24h",h()})}),document.getElementById("form-quick-weight")?.addEventListener("submit",async r=>{r.preventDefault();const t=document.getElementById("input-quick-weight"),l=parseFloat(t?.value||"");if(!l||l<60||l>500){f("Enter a valid body weight in lb");return}try{await S.logBody(l,a.body?.body_fat_pct,n.selectedDate),f(`Logged ${l.toFixed(1)} lb — EWMA & outbound ledger updated!`),await $(n.selectedDate)}catch(s){f(`Weight log failed: ${s.message}`)}}),document.getElementById("form-calibration")?.addEventListener("submit",async r=>{r.preventDefault();const t=parseFloat(document.getElementById("in-cal-r")?.value||"84"),l=parseFloat(document.getElementById("in-cal-s")?.value||"88"),s=parseFloat(document.getElementById("in-cal-c")?.value||"412");try{await S.saveCalibration(t,l,s,n.selectedDate),n.calDrawerOpen=!1,f("OLS Calibration curve updated!"),await $(n.selectedDate)}catch(c){f(`Calibration error: ${c.message}`)}}),document.getElementById("btn-trigger-sync")?.addEventListener("click",async()=>{try{await S.triggerSync(),f("Connector sync poll completed."),await $(n.selectedDate)}catch(r){f(`Sync note: ${r.message}`)}}),document.getElementById("form-xlsx-url")?.addEventListener("submit",async r=>{r.preventDefault();const t=document.getElementById("input-xlsx-url")?.value.trim();if(t)try{f("Importing 2022–2026 Google Sheet (.xlsx)…");const l=await S.importXLSXUrl(t);f(`Imported ${l.summary.workouts_imported||""} workouts cleanly!`),await $()}catch(l){f(`.xlsx import failed: ${l.message}`)}}),document.getElementById("input-xlsx-file")?.addEventListener("change",async r=>{const t=r.target.files?.[0];if(t)try{f(`Parsing ${t.name}…`);const l=await S.importXLSXFile(t);f(`Backfilled ${l.summary.workouts_imported||""} workouts!`),await $()}catch(l){f(`Upload error: ${l.message}`)}});const d=document.getElementById("input-filter-lifts");d&&d.addEventListener("input",()=>{n.liftQuery=d.value;const r=d.selectionStart||d.value.length;h();const t=document.getElementById("input-filter-lifts");t&&(t.focus(),t.setSelectionRange(r,r))}),document.getElementById("btn-sample-fit")?.addEventListener("click",async()=>{try{const r=await S.generateSampleFIT();f(`Decoded binary .FIT: ${r.activity.splits.length} mile splits • VDOT ${r.activity.vdot_open.toFixed(1)}`),await $(n.selectedDate)}catch(r){f(`.FIT decode error: ${r.message}`)}}),document.getElementById("input-fit-upload")?.addEventListener("change",async r=>{const t=r.target.files?.[0];if(t)try{const l=await S.importFITFile(t);f(`Imported ${t.name} • VDOT ${l.activity.vdot_open.toFixed(1)}`),await $(n.selectedDate)}catch(l){f(`.FIT upload failed: ${l.message}`)}}),document.getElementById("btn-load-sample-shlink")?.addEventListener("click",async()=>{try{const r=await S.getSampleSHLink(),t=document.getElementById("input-shlink-uri");t&&(t.value=r.shlink),f("Generated A256GCM encrypted shlink:/ — click Decrypt & Import!")}catch(r){f(`Sample shlink error: ${r.message}`)}}),document.getElementById("form-shlink-import")?.addEventListener("submit",async r=>{r.preventDefault();const t=document.getElementById("input-shlink-uri")?.value.trim();if(t)try{const l=await S.importMedical({shlink:t});f(`Decrypted JWE & imported ${l.observations_imported} FHIR R4 LOINC biomarkers!`),await $(n.selectedDate)}catch(l){f(`shlink:/ decrypt error: ${l.message}`)}}),document.getElementById("input-fhir-file")?.addEventListener("change",async r=>{const t=r.target.files?.[0];if(t)try{const l=await t.text(),s=await S.importMedical({fhir_json:JSON.parse(l)});f(`Imported ${s.observations_imported} FHIR R4 observations!`),await $(n.selectedDate)}catch(l){f(`FHIR JSON error: ${l.message}`)}}),document.getElementById("form-manual-lab")?.addEventListener("submit",async r=>{r.preventDefault();const t=document.getElementById("select-manual-biomarker")?.value,l=parseFloat(document.getElementById("input-manual-lab-val")?.value||"");if(!(!t||!l||l<=0))try{await S.importMedical({biomarker:t,value:l,local_date:n.selectedDate}),f(`Saved ${t}: ${l}`),await $(n.selectedDate)}catch(s){f(`Lab save error: ${s.message}`)}}),nt(e,a)}function nt(e,a){if(n.activeTab!=="lift")return;e.querySelectorAll("[data-split-idx]").forEach(t=>{t.addEventListener("click",()=>{n.lift.selectedSplitIdx=parseInt(t.getAttribute("data-split-idx")||"0",10),n.lift.customItems=[],n.lift.calcTargetSlug=null,h()})}),e.querySelectorAll("[data-rest-sec]").forEach(t=>{t.addEventListener("click",()=>{const l=parseInt(t.getAttribute("data-rest-sec")||"90",10);ze(l)})}),document.getElementById("btn-toggle-offline-sim")?.addEventListener("click",()=>{n.lift.simulateOffline=!n.lift.simulateOffline,f(n.lift.simulateOffline?"Offline Gym Simulation ON: sets queue locally in IndexedDB!":"Back Online: flushing IndexedDB workout queue…"),n.lift.simulateOffline||ge().then(async t=>{n.lift.queuedOfflineCount=t.remaining,t.flushed>0?(f(`Synced ${t.flushed} queued offline workout(s) to SQLite!`),await $(n.selectedDate)):h()})}),document.getElementById("btn-flush-offline")?.addEventListener("click",async()=>{n.lift.simulateOffline=!1;const t=await ge();n.lift.queuedOfflineCount=t.remaining,f(`Flushed ${t.flushed} offline workout(s) to SQLite!`),await $(n.selectedDate)}),document.getElementById("select-calc-target")?.addEventListener("change",t=>{n.lift.calcTargetSlug=t.target.value,h()}),e.querySelectorAll("[data-calc-equip]").forEach(t=>{t.addEventListener("click",()=>{const l=t.getAttribute("data-calc-equip")||"olympic_45";n.lift.calcEquipKey=l,l==="dumbbell_2x"&&(n.lift.calcPlatesPerSide=[45]),h()})}),e.querySelectorAll("[data-add-plate]").forEach(t=>{t.addEventListener("click",()=>{const l=parseFloat(t.getAttribute("data-add-plate")||"0");l>0&&(n.lift.calcPlatesPerSide=[...n.lift.calcPlatesPerSide,l],h())})}),document.getElementById("btn-clear-plates")?.addEventListener("click",()=>{n.lift.calcPlatesPerSide=[],h()});const i=a.splits||[],p=i[n.lift.selectedSplitIdx]||i[0],d=[...p?.items||[],...n.lift.customItems];document.getElementById("btn-apply-calc")?.addEventListener("click",()=>{const t=d.find(c=>c.slug===n.lift.calcTargetSlug)||d[0];if(!t)return;const l=ae[n.lift.calcEquipKey]||ae.olympic_45,s=Ee(n.lift.calcEquipKey,n.lift.calcPlatesPerSide);n.lift.weightOverrides[t.slug]=s.displayLb,n.lift.equipOverrides[t.slug]={equipment:l.equipment,tare:l.tare,mode:l.mode},f(`Applied ${s.formula} (${s.totalLb.toFixed(1)} lb) to ${t.name}`)}),e.querySelectorAll("[data-expand-slug]").forEach(t=>{t.addEventListener("click",()=>{const l=t.getAttribute("data-expand-slug");n.lift.expandedSlug=n.lift.expandedSlug===l?null:l,h()})}),e.querySelectorAll("[data-step-weight]").forEach(t=>{t.addEventListener("click",()=>{const[l,s]=(t.getAttribute("data-step-weight")||"").split(":"),c=d.find(y=>y.slug===l);if(!c)return;const o=n.lift.weightOverrides[l]??c.last_display_lb;n.lift.weightOverrides[l]=Math.max(0,o+parseFloat(s||"0")),h()})}),e.querySelectorAll("[data-input-weight]").forEach(t=>{t.addEventListener("change",()=>{const l=t.getAttribute("data-input-weight")||"",s=parseFloat(t.value);l&&!Number.isNaN(s)&&s>=0&&(n.lift.weightOverrides[l]=s,h())})}),e.querySelectorAll("[data-input-reps]").forEach(t=>{t.addEventListener("change",()=>{const l=t.getAttribute("data-input-reps")||"",s=parseInt(t.value,10);l&&s>0&&(n.lift.repsOverrides[l]=s,h())})});const r=(t,l)=>{const s=n.lift.weightOverrides[t.slug]??t.last_display_lb,c=n.lift.repsOverrides[t.slug]??t.target_reps,o=n.lift.equipOverrides[t.slug],y=o?.equipment||t.equipment,m=o?.tare??t.tare_lb,v=o?.mode||t.load_mode,b=v==="per_hand"||y==="dumbbell_pair",g=b?s*2:s,w=b?s:m>0&&g>=m?(g-m)/2:g,k=[];for(let z=0;z<t.target_sets;z++)k.push({exercise_id:t.exercise_id,exercise_slug:t.slug,exercise_name:t.name,set_index:l+z,equipment:y,tare_lb:m,load_mode:v,per_side_or_hand_lb:w,total_weight_lb:g,reps:c});return k};e.querySelectorAll("[data-log-lift]").forEach(t=>{t.addEventListener("click",async()=>{const l=t.getAttribute("data-log-lift")||"",s=d.find(y=>y.slug===l);if(!s)return;const c=r(s,1),o=await ke({id:we(),local_date:n.selectedDate||a.anchor_date,split_id:p?.id,title:`${p?.title||"Gym"} — ${s.name}`,sets:c},n.lift.simulateOffline);n.lift.loggedSlugs[l]=!0,n.lift.queuedOfflineCount=o.queuedCount,ze(90),o.synced?(f(`Logged ${s.target_sets}× sets of ${s.name} to SQLite!`),await $(n.selectedDate)):f(`Queued ${s.name} offline in IndexedDB (${o.queuedCount} pending)!`)})}),document.getElementById("btn-add-custom-exercise")?.addEventListener("click",()=>{const l=document.getElementById("select-add-exercise")?.value||"";if(!l)return;const s=(a.exercises||[]).find(c=>c.slug===l);if(s){if(d.some(c=>c.slug===l)){f(`${s.name} is already in this session.`);return}n.lift.customItems.push({exercise_id:s.id,slug:s.slug,name:s.name,primary_muscle:s.primary_muscle,equipment:s.default_equipment,tare_lb:s.default_tare_lb,load_mode:s.load_mode,target_sets:s.default_sets||4,target_reps:s.default_reps||10,scheme:`${s.default_sets||4} × ${s.default_reps||10}`,last_display_lb:s.default_equipment==="olympic_bar"?135:35,last_total_lb:s.default_equipment==="olympic_bar"?135:70,subtitle:`Added from catalog • ${s.default_equipment}`,sparkline:[]}),h()}}),document.getElementById("btn-log-entire-split")?.addEventListener("click",async()=>{if(!d.length)return;const t=[];d.forEach(s=>{t.push(...r(s,t.length+1)),n.lift.loggedSlugs[s.slug]=!0});const l=await ke({id:we(),local_date:n.selectedDate||a.anchor_date,split_id:p?.id,title:p?.title||"Full Split Session",sets:t},n.lift.simulateOffline);n.lift.queuedOfflineCount=l.queuedCount,l.synced?(f(`Saved ${t.length} sets (${p?.title}) to SQLite!`),await $(n.selectedDate)):f(`Saved ${t.length} sets to IndexedDB offline queue!`)})}function st(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{})});window.addEventListener("online",()=>{n.lift.simulateOffline||ge().then(async e=>{n.lift.queuedOfflineCount=e.remaining,e.flushed>0&&(f(`Synced ${e.flushed} offline workout(s) to SQLite!`),await $(n.selectedDate))})});let me=null;window.addEventListener("resize",()=>{me&&window.clearTimeout(me),me=window.setTimeout(()=>{n.bootstrap&&Le(n.bootstrap)},120)});$();
