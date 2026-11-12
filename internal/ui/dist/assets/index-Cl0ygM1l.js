(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const d of a)if(d.type==="childList")for(const s of d.addedNodes)s.tagName==="LINK"&&s.rel==="modulepreload"&&n(s)}).observe(document,{childList:!0,subtree:!0});function i(a){const d={};return a.integrity&&(d.integrity=a.integrity),a.referrerPolicy&&(d.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?d.credentials="include":a.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function n(a){if(a.ep)return;a.ep=!0;const d=i(a);fetch(a.href,d)}})();async function T(e,t){const i=await fetch(e,{...t,headers:{...t?.body instanceof FormData?{}:{"Content-Type":"application/json"},...t?.headers||{}}});if(!i.ok){let n=`HTTP ${i.status}`;try{const a=await i.json();a?.error&&(n=a.error)}catch{}throw new Error(n)}return i.json()}const M={getBootstrap(e){const t=e?`?date=${encodeURIComponent(e)}`:"";return T(`/api/v1/bootstrap${t}`)},getTrend(e,t){const i=`?metric=${encodeURIComponent(e)}&horizon=${encodeURIComponent(t)}`;return T(`/api/v1/trends${i}`)},logWorkout(e){return T("/api/v1/workouts",{method:"POST",body:JSON.stringify(e)})},syncWorkoutsBatch(e){return T("/api/v1/workouts/sync",{method:"POST",body:JSON.stringify({workouts:e})})},logBody(e,t,i){return T("/api/v1/body",{method:"POST",body:JSON.stringify({weight_lb:e,body_fat_pct:t||0,local_date:i||""})})},saveCalibration(e,t,i,n){return T("/api/v1/calibrations",{method:"POST",body:JSON.stringify({local_date:n||"",gh_readiness:e,gh_sleep_score:t,gh_cardio_load:i})})},importXLSXFile(e){const t=new FormData;return t.append("file",e),T("/api/v1/import/xlsx",{method:"POST",body:t})},importXLSXUrl(e){return T("/api/v1/import/xlsx",{method:"POST",body:JSON.stringify({sheet_url:e})})},importFITFile(e,t){const i=new FormData;return i.append("file",e),t&&i.append("title",t),T("/api/v1/import/fit",{method:"POST",body:i})},generateSampleFIT(){return T("/api/v1/import/fit",{method:"POST",body:JSON.stringify({generate_sample:!0,title:"Garmin Threshold Progression (.FIT)"})})},getSampleSHLink(){return T("/api/v1/import/medical/sample-shlink")},importMedical(e){return T("/api/v1/import/medical",{method:"POST",body:JSON.stringify(e)})},seedDemo(){return T("/api/v1/demo/seed",{method:"POST",body:"{}"})},triggerSync(){return T("/api/v1/integrations/sync",{method:"POST",body:"{}"})}};function se(e,t="var(--m3-teal)",i=72,n=24){const a=e.filter(f=>f!=null&&!Number.isNaN(f));if(a.length<2)return`<svg width="${i}" height="${n}" viewBox="0 0 ${i} ${n}"></svg>`;const d=Math.min(...a),s=Math.max(...a),p=Math.max(1,s-d),o=3,u=4,r=(i-o*2)/Math.max(1,e.length-1);let w="",m=!1,y=0,$=0;return e.forEach((f,x)=>{if(f==null||Number.isNaN(f)){m=!1;return}const b=o+x*r,_=n-u-(f-d)/p*(n-u*2);w+=`${m?"L":"M"}${b.toFixed(1)},${_.toFixed(1)} `,m=!0,y=b,$=_}),`
    <svg width="${i}" height="${n}" viewBox="0 0 ${i} ${n}" style="overflow: visible; flex-shrink: 0;" aria-hidden="true">
      <path d="${w.trim()}" fill="none" stroke="${t}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${y.toFixed(1)}" cy="${$.toFixed(1)}" r="2.6" fill="${t}" />
    </svg>
  `}function re(e,t,i,n="--m3-teal",a){if(!e||!t.length)return;const d=e.getBoundingClientRect(),s=Math.max(220,d.width||320),p=Math.max(90,d.height||120),o=window.devicePixelRatio||1;e.width=Math.round(s*o),e.height=Math.round(p*o);const u=e.getContext("2d");if(!u)return;u.scale(o,o),u.clearRect(0,0,s,p);const r=getComputedStyle(document.getElementById("m3-app")||document.documentElement),w=r.getPropertyValue(n).trim()||"#0b7f6b",m=r.getPropertyValue("--m3-surface-dim").trim()||"#e2ebe8",y=r.getPropertyValue("--m3-ink-2").trim()||"#556b67",$=r.getPropertyValue("--m3-hairline").trim()||"rgba(0,0,0,0.1)",f=10,b=p-f-20,_=Math.max(a||1,...t,1)*1.1;if(a&&a>0){const I=f+b-a/_*b;u.save(),u.setLineDash([4,4]),u.strokeStyle=$,u.lineWidth=1.2,u.beginPath(),u.moveTo(4,I),u.lineTo(s-4,I),u.stroke(),u.restore()}const E=t.length,W=(s-8)/E,A=Math.max(5,Math.min(18,W*.58));t.forEach((I,O)=>{const S=4+W*O+W/2,te=S-A/2;ye(u,te,f,A,b,A/2,m);const V=Math.max(I>0?5:0,Math.max(0,I)/_*b);V>0&&ye(u,te,f+b-V,A,V,A/2,w),(E<=7||O===0||O===Math.floor(E/2)||O===E-1||E===24&&O%6===0)&&i[O]&&(u.fillStyle=y,u.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif",u.textAlign="center",u.fillText(i[O],S,p-5))})}function ze(e,t,i="--m3-coral"){if(!e||t.length<2)return;const n=e.getBoundingClientRect(),a=Math.max(90,n.width||130),d=Math.max(30,n.height||38),s=window.devicePixelRatio||1;e.width=Math.round(a*s),e.height=Math.round(d*s);const p=e.getContext("2d");if(!p)return;p.scale(s,s),p.clearRect(0,0,a,d);const u=getComputedStyle(document.getElementById("m3-app")||document.documentElement).getPropertyValue(i).trim()||"#df3c2a",r=Math.min(...t),w=Math.max(...t),m=Math.max(1,w-r),y=(a-8)/(t.length-1);p.strokeStyle=u,p.lineWidth=2.2,p.lineCap="round",p.lineJoin="round",p.beginPath(),t.forEach(($,f)=>{const x=4+f*y,b=d-5-($-r)/m*(d-10);f===0?p.moveTo(x,b):p.lineTo(x,b)}),p.stroke()}function ye(e,t,i,n,a,d,s){const p=Math.min(d,n/2,a/2);e.fillStyle=s,e.beginPath(),e.moveTo(t+p,i),e.arcTo(t+n,i,t+n,i+a,p),e.arcTo(t+n,i+a,t,i+a,p),e.arcTo(t,i+a,t,i,p),e.arcTo(t,i,t+n,i,p),e.closePath(),e.fill()}function Le(e,t){const s=Math.max(8,Math.min(262,262*Math.min(1,Math.max(0,e)))),p=Math.max(8,Math.min(190,190*Math.min(1,Math.max(0,t))));return`
    <svg width="132" height="132" viewBox="0 0 136 136" aria-hidden="true">
      <g transform="rotate(140 68 68)">
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal-track)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="262 ${364.4}" />
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="${s.toFixed(1)} ${364.4}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber-track)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="190 ${263.9}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${p.toFixed(1)} ${263.9}" />
      </g>
    </svg>
  `}function Me(e,t,i){const a=2*Math.PI*13,d=a*.82,s=Math.max(3,Math.min(d,d*Math.min(1,Math.max(0,e))));return`
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <g transform="rotate(122 16 16)">
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--m3-teal-track)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${d.toFixed(1)} ${a.toFixed(1)}" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--m3-teal)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${s.toFixed(1)} ${a.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 11px; font-weight: ${i?800:600};">${t}</span>
    </div>
  `}function xe(e,t,i,n=64){const d=2*Math.PI*24,s=d*.74,p=Math.max(.05,Math.min(1,e/100)),o=s*p;return`
    <div style="position: relative; width: ${n}px; height: ${n}px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <svg width="${n}" height="${n}" viewBox="0 0 60 60" aria-hidden="true">
        <g transform="rotate(136 30 30)">
          <circle cx="30" cy="30" r="24" fill="none" stroke="${i}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${s.toFixed(1)} ${d.toFixed(1)}" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="${t}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${o.toFixed(1)} ${d.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;">${Math.round(e)}</span>
    </div>
  `}function Te(e,t,i,n,a){const d=Math.max(1,e+t+i+n),s=46,p=2*Math.PI*s,o=8,u=[{val:e,color:"var(--m3-blue)"},{val:t,color:"var(--m3-teal)"},{val:i,color:"var(--m3-amber)"},{val:Math.max(8,n),color:"var(--m3-coral)"}];let r=0;return`
    <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <g transform="rotate(-90 60 60)">${u.map(m=>{const y=m.val/d*p,$=Math.max(4,y-o),f=`<circle cx="60" cy="60" r="${s}" fill="none" stroke="${m.color}" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${$.toFixed(1)} ${p.toFixed(1)}"
        stroke-dashoffset="${(-r).toFixed(1)}" />`;return r+=y,f}).join("")}</g>
      </svg>
      <div style="position: absolute; text-align: center;">
        <div class="tabular" style="font-size: 20px; font-weight: 800; line-height: 1.05;">${Math.round(a)}%</div>
        <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Efficiency</div>
      </div>
    </div>
  `}const Ee=[{key:"7d",label:"7D"},{key:"1m",label:"1M"},{key:"3m",label:"3M"},{key:"6m",label:"6M"},{key:"1y",label:"1Y"},{key:"all",label:"All ('22–'26)"}];function Ie(e,t,i,n=!1){const a=e?.title||"Bench Press (Working Weight)",d=e?.current||"--",s=e?.delta||"Loading trajectory…",p=e?.summary||"2022–2026 longitudinal density",o=e?.insight||"Tap or drag across any regime to inspect exact dates, gaps, plateaus, and equipment shifts.",u=e?.key||"lift:bench-press",r=!!e?.alt_series?.points?.length,w=t.slice(0,22).map(x=>`
      <button
        type="button"
        class="m3-chip m3-carousel-item"
        id="chip-metric-${x.key.replace(/[^a-z0-9-]/gi,"-")}"
        data-metric-chip="${x.key}"
        data-sel="${x.key===u?"true":"false"}"
      >${H(x.label)}</button>
    `).join(""),m=Ee.map(x=>`
      <button
        type="button"
        id="btn-hz-${x.key}"
        data-hz-btn="${x.key}"
        data-on="${i===x.key?"true":"false"}"
      >${x.label}</button>
    `).join(""),y=e?.monthly_density?.length?e.monthly_density:e?.density||[],$=e?.monthly_labels?.length?e.monthly_labels:e?.labels||[],f=y.slice(-56).map((x,b)=>{const _=$[b]||"";let E="var(--m3-surface-dim)";return x>=5?E="var(--m3-teal)":x>=3?E="hsla(170, 74%, 38%, 0.68)":x>=1&&(E="hsla(170, 64%, 44%, 0.36)"),`<div class="density-cell" title="${H(_)}: ${x} entries" style="background: ${E};"></div>`}).join("");return`
    <section id="trend-explorer-card" class="m3-seam" aria-label="Longitudinal Trajectory and Regime Explorer">
      <div class="m3-seam-top" style="padding: 15px 16px 12px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              LONG-TERM PROGRESS • GAPS, PLATEAUS &amp; EQUIPMENT REGIMES
            </div>
            <div id="trend-metric-title" style="font-size: 17px; font-weight: 800; margin-top: 1px;">
              ${H(a)}
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
            <div class="m3-seg" role="group" aria-label="Time Horizon">
              ${m}
            </div>
            ${n?'<button type="button" id="btn-close-explorer" class="m3-pill" style="padding: 5px 10px;">✕ Close</button>':""}
          </div>
        </div>

        <div id="trend-metric-chips" class="m3-carousel" style="gap: 6px;">
          ${w}
        </div>
      </div>

      <div class="m3-seam-mid" style="padding: 14px 16px;">
        <div style="display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
            <span id="trend-current-val" class="tabular" style="font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
              ${H(d)}
            </span>
            <span id="trend-delta-badge" class="badge-trend tabular" style="background: var(--m3-teal-tint); color: var(--m3-on-teal);">
              ${H(s)}
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
            <span style="width: 12px; height: 3px; border-radius: 2px; background: var(--m3-teal);"></span>${r?"45 lb Barbell (=45+…)":"Primary Trajectory"}
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; border: 1px dashed var(--m3-gap-stroke); background: var(--m3-gap-fill); border-radius: 2px;"></span>No-Data Gap
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; background: var(--m3-plateau-fill); border-radius: 2px;"></span>Plateau Zone
          </span>
          ${r&&e?.alt_series?`<span
                   style="display: inline-flex; align-items: center; gap: 5px; cursor: help;"
                   title="Sessions logged with =15+… or =20+… (lighter / counterbalanced Smith bar) instead of a 45 lb Olympic bar. Plotted separately so they don't create fake dips on your 45 lb barbell line."
                 >
                   <span style="width: 8px; height: 8px; border-radius: 999px; border: 2px solid var(--m3-amber);"></span>${H(e.alt_series.label)}
                 </span>`:""}
        </div>
      </div>

      <div class="m3-seam-bot" style="padding: 12px 16px 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px;">
          <span style="font-weight: 700;">Consistency Density ('22 → '26)</span>
          <span class="tabular" style="color: var(--m3-ink-2);">${H(p)}</span>
        </div>
        <div class="density-strip">
          ${f}
        </div>
        <div id="trend-insight-banner" style="background: var(--m3-surface-dim); border-radius: 14px; padding: 9px 12px; font-size: 12px; color: var(--m3-ink); display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--m3-teal); font-weight: 800;">◈</span>
          <span>${H(o)}</span>
        </div>
      </div>
    </section>
  `}function Oe(e,t,i){if(!e||!i||!i.series?.length)return;let n=null;const a=()=>{const s=e.getBoundingClientRect(),p=Math.max(260,s.width||360),o=Math.max(170,s.height||204),u=window.devicePixelRatio||1;e.width=Math.round(p*u),e.height=Math.round(o*u);const r=e.getContext("2d");if(!r)return;r.scale(u,u),r.clearRect(0,0,p,o);const w=document.getElementById("m3-app")||document.documentElement,m=getComputedStyle(w),y=m.getPropertyValue(i.color_token||"--m3-teal").trim()||"#0b7f6b",$=m.getPropertyValue("--m3-ink").trim()||"#11221f",f=m.getPropertyValue("--m3-ink-2").trim()||"#556b67",x=m.getPropertyValue("--m3-hairline").trim()||"rgba(0,0,0,0.1)",b=m.getPropertyValue("--m3-gap-fill").trim()||"rgba(40,60,55,0.07)",_=m.getPropertyValue("--m3-gap-stroke").trim()||"rgba(40,60,55,0.25)",E=m.getPropertyValue("--m3-plateau-fill").trim()||"rgba(215,100,20,0.11)",W=m.getPropertyValue("--m3-amber").trim()||"#d76214",A=m.getPropertyValue("--m3-surface").trim()||"#ffffff",I=36,O=14,S=18,te=24,V=p-I-O,C=o-S-te,G=[];if(i.series.forEach(c=>{c!=null&&!Number.isNaN(c)&&G.push(c)}),i.alt_series?.points?.forEach(c=>G.push(c.val)),i.optimal_high&&i.optimal_high>0&&G.push(i.optimal_high),!G.length)return;let j=Math.min(...G),X=Math.max(...G);const fe=Math.max(1,X-j);j=Math.max(0,j-fe*.14),X=X+fe*.16;const ge=Math.max(1,X-j),D=i.series.length,F=c=>I+(D<=1?V/2:c/(D-1)*V),N=c=>S+C-(c-j)/ge*C;r.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif",r.textAlign="right";for(let c=0;c<=3;c++){const v=j+ge*c/3,L=N(v);r.strokeStyle=x,r.lineWidth=1,r.beginPath(),r.moveTo(I,L),r.lineTo(p-O,L),r.stroke(),r.fillStyle=f,r.fillText(v>=100?Math.round(v).toString():v.toFixed(v%1===0?0:1),I-5,L+3)}if(i.optimal_high&&i.optimal_high>j&&i.optimal_high<X){const c=N(i.optimal_high);r.save(),r.setLineDash([4,4]),r.strokeStyle=y,r.lineWidth=1.3,r.beginPath(),r.moveTo(I,c),r.lineTo(p-O,c),r.stroke(),r.fillStyle=y,r.textAlign="left",r.fillText(`Optimal ≤ ${i.optimal_high}`,I+4,c-4),r.restore()}(i.no_data_gaps||[]).forEach(c=>{const v=F(Math.max(0,c.start_bucket-.35)),L=F(Math.min(D-1,c.end_bucket+.35)),P=Math.max(10,L-v);r.fillStyle=b,r.fillRect(v,S,P,C),r.save(),r.setLineDash([3,3]),r.strokeStyle=_,r.strokeRect(v,S,P,C),r.restore(),P>=34&&(r.fillStyle=f,r.font="700 9.5px -apple-system, BlinkMacSystemFont, sans-serif",r.textAlign="center",r.fillText("No Data",v+P/2,S+C/2+3))}),(i.plateaus||[]).forEach(c=>{const v=F(Math.max(0,c.start_bucket)),L=F(Math.min(D-1,c.end_bucket)),P=Math.max(14,L-v),_e=N(c.level_value),oe=Math.max(S,_e-16),Se=Math.min(32,S+C-oe);r.fillStyle=E,r.fillRect(v,oe,P,Se),P>=40&&(r.fillStyle=W,r.font="700 9.5px -apple-system, BlinkMacSystemFont, sans-serif",r.textAlign="center",r.fillText("Plateau",v+P/2,Math.max(S+10,oe-3)))});let le=-1,Z=i.invert_good?1/0:-1/0,B=[];const ve=()=>{if(B.length){if(B.length>=2&&!i.sparse){const c=r.createLinearGradient(0,S,0,S+C);c.addColorStop(0,y.startsWith("hsl")?y.replace("hsl(","hsla(").replace(")",", 0.20)"):"rgba(11,127,107,0.18)"),c.addColorStop(1,"rgba(11,127,107,0.0)"),r.fillStyle=c,r.beginPath(),r.moveTo(B[0].x,S+C),B.forEach(v=>r.lineTo(v.x,v.y)),r.lineTo(B[B.length-1].x,S+C),r.closePath(),r.fill()}r.strokeStyle=y,r.lineWidth=2.6,r.lineCap="round",r.lineJoin="round",i.sparse&&r.setLineDash([4,3]),r.beginPath(),B.forEach((c,v)=>{v===0?r.moveTo(c.x,c.y):r.lineTo(c.x,c.y)}),r.stroke(),r.setLineDash([]),(i.sparse||B.length===1||D<=16)&&B.forEach(c=>{r.fillStyle=A,r.strokeStyle=y,r.lineWidth=2.2,r.beginPath(),r.arc(c.x,c.y,3.6,0,Math.PI*2),r.fill(),r.stroke()}),B=[]}};if(i.series.forEach((c,v)=>{if(c==null||Number.isNaN(c)){ve();return}const L=F(v),P=N(c);B.push({x:L,y:P}),(i.invert_good?c<Z:c>Z)&&(Z=c,le=v)}),ve(),(i.alt_series?.points||[]).forEach(c=>{if(c.idx<0||c.idx>=D)return;const v=F(c.idx),L=N(c.val);r.fillStyle=A,r.strokeStyle=W,r.lineWidth=2.2,r.beginPath(),r.arc(v,L,4.3,0,Math.PI*2),r.fill(),r.stroke()}),le>=0&&Number.isFinite(Z)){const c=F(le),v=N(Z);r.fillStyle=y,r.beginPath(),r.arc(c,v,4.2,0,Math.PI*2),r.fill(),r.font="800 11px -apple-system, BlinkMacSystemFont, sans-serif",r.textAlign="center",r.fillText("★",c,Math.max(11,v-7))}r.fillStyle=f,r.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif";const ie=Math.min(6,D);for(let c=0;c<ie;c++){const v=ie===1?0:Math.round(c*(D-1)/(ie-1)),L=i.labels[v]||"";r.textAlign=c===0?"left":c===ie-1?"right":"center",r.fillText(L,F(v),o-6)}if(n!==null&&n>=0&&n<D){const c=F(n);r.save(),r.strokeStyle=$,r.lineWidth=1.2,r.setLineDash([3,3]),r.beginPath(),r.moveTo(c,S),r.lineTo(c,S+C),r.stroke(),r.restore();const v=i.series[n];if(v!=null){const L=N(v);r.fillStyle=y,r.strokeStyle=A,r.lineWidth=2.5,r.beginPath(),r.arc(c,L,5.2,0,Math.PI*2),r.fill(),r.stroke()}}},d=s=>{const p=e.getBoundingClientRect(),o=36,r=Math.max(1,p.width-o-14),w=Math.max(0,Math.min(1,(s-p.left-o)/r)),m=Math.round(w*Math.max(0,i.series.length-1));if(n=m,a(),t){const y=i.labels[m]||i.bucket_dates?.[m]||"",$=i.series[m],f=i.alt_series?.points?.find(_=>_.idx===m),x=i.density?.[m]??0,b=f?.raw_formula?` [sheet: ${f.raw_formula}]`:"";if($==null)f?t.textContent=`${y} • ${f.val} ${i.unit} on 15–20 lb bar${b}`:t.textContent=`${y} • Explicit No-Data Hiatus (0 sessions)`;else{const _=f?` • also ${f.val} ${i.unit} on 15–20 lb bar${b}`:"";t.textContent=`${y} • ${$.toFixed($%1===0?0:1)} ${i.unit}${_} (${x} entries)`}}};e.onmousemove=s=>d(s.clientX),e.onmouseleave=()=>{n=null,a(),t&&(t.textContent="Tap/drag chart to inspect plateaus, gaps & rebounds")},e.ontouchstart=s=>{s.touches[0]&&d(s.touches[0].clientX)},e.ontouchmove=s=>{s.touches[0]&&d(s.touches[0].clientX)},requestAnimationFrame(a)}function H(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Ce="autofit_offline_db",Be=1,q="pending_workouts";function me(){return new Promise((e,t)=>{const i=indexedDB.open(Ce,Be);i.onupgradeneeded=()=>{const n=i.result;n.objectStoreNames.contains(q)||n.createObjectStore(q,{keyPath:"id"})},i.onsuccess=()=>e(i.result),i.onerror=()=>t(i.error)})}function he(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`wk-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}async function Pe(e){const t=await me();return new Promise((i,n)=>{const a=t.transaction(q,"readwrite"),d=a.objectStore(q),s={...e,queued_at:new Date().toISOString()};d.put(s),a.oncomplete=()=>{t.close(),i()},a.onerror=()=>{t.close(),n(a.error)}})}async function Y(){try{const e=await me();return await new Promise((t,i)=>{const a=e.transaction(q,"readonly").objectStore(q).getAll();a.onsuccess=()=>{e.close(),t(a.result||[])},a.onerror=()=>{e.close(),i(a.error)}})}catch{return[]}}async function Ae(e){if(!e.length)return;const t=await me();return new Promise((i,n)=>{const a=t.transaction(q,"readwrite"),d=a.objectStore(q);for(const s of e)d.delete(s);a.oncomplete=()=>{t.close(),i()},a.onerror=()=>{t.close(),n(a.error)}})}async function be(e,t=!1){if(!t&&navigator.onLine)try{return await M.logWorkout(e),{synced:!0,queuedCount:(await Y()).length}}catch{}return await Pe(e),{synced:!1,queuedCount:(await Y()).length}}async function ue(){const e=await Y();if(!e.length||!navigator.onLine)return{flushed:0,remaining:e.length};try{const t=await M.syncWorkoutsBatch(e);t.workout_ids?.length&&await Ae(t.workout_ids);const i=await Y();return{flushed:t.synced,remaining:i.length}}catch{return{flushed:0,remaining:e.length}}}function De(e,t){if(!t)return"";const i=e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1],n=e.calibration?.readiness?.r2??.97;return`
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
          Update OLS Calibration Curve (R² = ${n.toFixed(2)}, n = ${e.calibration?.readiness?.samples||0})
        </button>
      </form>
    </section>
  `}function Fe(e,t){if(!t)return"";const i=e.integrations?.google_health,n=e.integrations?.parity_scorecard,a=i?.status==="healthy"?"var(--m3-teal-tint)":i?.status==="expiring_soon"?"var(--m3-amber-tint)":"var(--m3-surface-dim)",d=i?.status==="healthy"?"var(--m3-on-teal)":i?.status==="expiring_soon"?"var(--m3-on-amber)":"var(--m3-ink-2)";return`
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
            <span class="tabular" style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${a}; color: ${d};">
              ${i?.connected?`${i.days_remaining.toFixed(1)}d token left`:i?.status||"Local Mode"}
            </span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            7-day Testing OAuth guard: sync cursor freezes on HTTP 401; outbound ledger prevents weight echo loops.
          </div>
          ${i?.reconsent_auth_url?`<a href="${Re(i.reconsent_auth_url)}" class="m3-btn-tonal" style="text-decoration: none; margin-top: 4px;">1-Click Weekly Re-Consent</a>`:'<button type="button" id="btn-trigger-sync" class="m3-pill" style="align-self: flex-start; margin-top: 2px;">Run Connector Poll</button>'}
        </div>

        <!-- 30-Day Shadow Parity Scorecard -->
        <div style="background: var(--m3-surface-dim); border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 13px;">Shadow Parity &amp; Provenance</strong>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">
              ${n?.sleep_agreement_pct??99.7}% Sleep Match
            </span>
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Steps Δ: ${n?.steps_delta_pct??.28}% • RHR Δ: ${n?.rhr_delta_bpm??0} bpm
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Soft-superseded rows: <strong>${n?.superseded_records??0}</strong> • Outbound ledger: <strong>${n?.outbound_ledger_cnt??0}</strong>
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
  `}function Re(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function He(e,t){const i=t.trim().toLowerCase(),n=(e.key_lifts||[]).filter(o=>!i||o.name.toLowerCase().includes(i)||o.primary_muscle.toLowerCase().includes(i)||o.equipment.toLowerCase().includes(i)),a=e.recent_runs?.[0],d=a?.zone2_pace_sec_per_mi?`${Math.floor(a.zone2_pace_sec_per_mi/60)}:${String(Math.round(a.zone2_pace_sec_per_mi%60)).padStart(2,"0")}/mi`:"8:14/mi",s=a?.hr_zones_minutes||{z1:3,z2:14,z3:9,z4:5,z5:1},p=Math.max(1,(s.z1||0)+(s.z2||0)+(s.z3||0)+(s.z4||0)+(s.z5||0));return`
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
              value="${R(t)}"
              placeholder="Filter muscle or lift…"
              class="m3-input"
              style="width: 185px; padding: 6px 12px; font-size: 12px;"
              aria-label="Filter tracked lifts"
            />
            <button type="button" id="btn-fitness-go-lift" data-switch-tab="lift" class="m3-btn-fill">+ Log Workout</button>
          </div>
        </div>

        <div class="m3-seam-bot" style="padding: 8px 12px 12px 12px; display: flex; flex-direction: column; gap: 6px;">
          ${n.slice(0,24).map(o=>`
              <div
                class="clickable-tile"
                data-open-metric="${R(o.metric_key)}"
                style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
              >
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <strong style="font-size: 14px;">${R(o.name)}</strong>
                    <span style="font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--m3-surface); color: var(--m3-ink-2); font-weight: 600;">
                      ${R(o.primary_muscle)} • ${R(qe(o.equipment))}
                    </span>
                  </div>
                  <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${R(o.narrative)} (${o.sessions} sessions)
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                  ${se(o.sparkline||[],"var(--m3-teal)",74,24)}
                  <div style="text-align: right; min-width: 78px;">
                    <div class="tabular" style="font-size: 15px; font-weight: 800;">
                      ${o.current_val.toFixed(o.current_val%1===0?0:1)} ${R(o.unit)}
                    </div>
                    <div class="tabular" style="font-size: 11px; font-weight: 700; color: ${o.pct_gain>=0?"var(--m3-teal)":"var(--m3-coral)"};">
                      ${o.pct_gain>=0?"+":""}${o.pct_gain}% vs '22
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
            ${a?a.vdot_open.toFixed(1):"49.4"} <span style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">mL/kg</span>
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Daniels-Gilbert grade-adjusted from Garmin .FIT
          </div>
        </div>

        <div class="m3-pair-r" style="display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <span style="font-size: 13px; font-weight: 700;">Zone 2 Aerobic Pace</span>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
              EF ${a?a.zone2_efficiency.toFixed(2):"1.41"}
            </span>
          </div>
          <div class="tabular" style="font-size: 26px; font-weight: 800;">
            ${d}
          </div>
          <div style="font-size: 11px; color: var(--m3-ink-2);">
            Normalized @ 141 bpm • Cadence ${a?.avg_cadence||180} spm
          </div>
        </div>
      </div>

      <!-- Binary Garmin .FIT Decoder & Mile Splits Card -->
      <section class="m3-seam">
        <div class="m3-seam-top" style="padding: 15px 16px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-amber);">MUKTIHARI/FIT BINARY TELEMETRY</div>
            <div style="font-size: 15px; font-weight: 800;">
              ${R(a?.title||"Garmin Tempo Run (.FIT)")}
              <span class="tabular" style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">
                • ${a?.local_date||""}
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
            ${(a?.splits||[]).map(o=>`
                <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px 13px; min-width: 116px;">
                  <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Mile ${o.mile}</div>
                  <div class="tabular" style="font-size: 17px; font-weight: 800; margin-top: 2px;">${R(o.pace_formatted)}</div>
                  <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${o.avg_hr} bpm • ${o.avg_cadence||180} spm
                  </div>
                </div>
              `).join("")||'<div style="font-size: 12px; color: var(--m3-ink-2);">Click "Decode Sample .FIT" or upload a Garmin .FIT file to inspect mile splits.</div>'}
          </div>

          <!-- 5-Zone HR Distribution -->
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">
              <span>Heart Rate Zones (1Hz .FIT Record Stream)</span>
              <span class="tabular">Z2: ${s.z2||0}m • Z3: ${s.z3||0}m • Z4: ${s.z4||0}m</span>
            </div>
            <div style="display: flex; gap: 3px; height: 10px; border-radius: 999px; overflow: hidden;">
              <div style="flex: ${Math.max(1,(s.z1||0)/p*100)}; background: var(--m3-surface-hi);" title="Z1"></div>
              <div style="flex: ${Math.max(2,(s.z2||0)/p*100)}; background: var(--m3-teal);" title="Z2 Aerobic"></div>
              <div style="flex: ${Math.max(1,(s.z3||0)/p*100)}; background: var(--m3-blue);" title="Z3 Tempo"></div>
              <div style="flex: ${Math.max(1,(s.z4||0)/p*100)}; background: var(--m3-amber);" title="Z4 Threshold"></div>
              <div style="flex: ${Math.max(.5,(s.z5||0)/p*100)}; background: var(--m3-coral);" title="Z5 Anaerobic"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `}function qe(e){switch(e){case"olympic_bar":return"45 lb Barbell";case"smith":return"Smith Machine";case"dumbbell_pair":return"2× Dumbbells";case"sled":return"Leg Press Sled";case"cable":case"cable_stack":return"Cable Stack";case"bodyweight":return"Bodyweight";case"machine":return"Machine";default:return e||"Standard"}}function R(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function je(e){const t=e.labs||[],i=e.body;return`
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
        ${t.map(n=>{const a=n.status.toLowerCase().includes("optimal"),d=a?"var(--m3-teal-tint)":"var(--m3-amber-tint)",s=a?"var(--m3-on-teal)":"var(--m3-on-amber)",p=(n.draws||[]).map(o=>o.value);return`
              <div
                class="m3-card clickable-tile"
                data-open-metric="${U(n.metric_key)}"
                style="padding: 14px 15px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                  <div>
                    <div style="font-size: 14px; font-weight: 800;">${U(n.name)}</div>
                    <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">LOINC ${U(n.loinc_code)}</div>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${d}; color: ${s};">
                    ${U(n.status)}
                  </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div>
                    <span class="tabular" style="font-size: 24px; font-weight: 800;">
                      ${n.latest_value.toFixed(n.latest_value%1===0?0:1)}
                    </span>
                    <span style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">${U(n.unit)}</span>
                  </div>
                  ${p.length>=2?se(p,"var(--m3-teal)",64,24):""}
                </div>

                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Trail: ${U(n.history_text)} • Optimal ≤ ${n.optimal_high||n.ref_high}
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
  `}function U(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const ee={olympic_45:{label:"45 lb Barbell",equipment:"olympic_bar",tare:45,mode:"plates_per_side"},smith_20:{label:"20 lb Bar / Smith",equipment:"smith",tare:20,mode:"plates_per_side"},smith_15:{label:"15 lb Bar / Smith",equipment:"smith",tare:15,mode:"plates_per_side"},sled_125:{label:"125 lb Sled",equipment:"sled",tare:125,mode:"plates_per_side"},sled_118:{label:"118 lb Sled",equipment:"sled",tare:118,mode:"plates_per_side"},dumbbell_2x:{label:"2× Per-Hand DB",equipment:"dumbbell_pair",tare:0,mode:"per_hand"}};function ke(e,t){const i=ee[e]||ee.olympic_45,n=t.reduce((d,s)=>d+s,0);if(i.mode==="per_hand"){const d=n||40;return{displayLb:d,totalLb:d*2,formula:`=2*${d}`}}const a=i.tare+2*n;return{displayLb:a,totalLb:a,formula:`=${i.tare}+2*(${t.length?t.join("+"):"0"})`}}function Ne(e,t){const i=e.splits||[],n=i[t.selectedSplitIdx]||i[0],a=[...n?.items||[],...t.customItems],d=a.find(o=>o.slug===t.calcTargetSlug)||a[0],s=ke(t.calcEquipKey,t.calcPlatesPerSide),p=t.restSecondsLeft>0?`${Math.floor(t.restSecondsLeft/60)}:${String(t.restSecondsLeft%60).padStart(2,"0")}`:"Rest Timer";return`
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
                ${k(n?.title||"Push / Chest & Triceps")}
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <!-- Rest Timer Pills -->
              <div class="m3-seg" role="group" aria-label="Rest Timer">
                <button type="button" id="btn-rest-60" data-rest-sec="60" data-on="false">60s</button>
                <button type="button" id="btn-rest-90" data-rest-sec="90" data-on="${t.restSecondsLeft>0?"true":"false"}">
                  ${t.restSecondsLeft>0?`⏱ ${p}`:"90s"}
                </button>
                <button type="button" id="btn-rest-120" data-rest-sec="120" data-on="false">120s</button>
              </div>

              <!-- Offline Gym Basement Simulator / Queue Flush -->
              <button
                type="button"
                id="btn-toggle-offline-sim"
                class="m3-pill"
                style="background: ${t.simulateOffline?"var(--m3-amber-tint)":"var(--m3-surface-dim)"}; color: ${t.simulateOffline?"var(--m3-on-amber)":"var(--m3-ink)"};"
                title="Test basement gym offline mode (queues sets to IndexedDB and auto-syncs when back online)"
              >
                ${t.simulateOffline?"⚡ Offline Sim ON":"● Online"}
                ${t.queuedOfflineCount>0?` (${t.queuedOfflineCount} queued)`:""}
              </button>
              ${t.queuedOfflineCount>0?`<button type="button" id="btn-flush-offline" class="m3-btn-tonal">Sync ${t.queuedOfflineCount} Now</button>`:""}
            </div>
          </div>

          <!-- All 6 Hybrid Split Templates Carousel -->
          <div class="m3-carousel" style="gap: 6px;">
            ${i.map((o,u)=>`
                <button
                  type="button"
                  id="btn-split-${k(o.slug)}"
                  class="m3-chip m3-carousel-item"
                  data-split-idx="${u}"
                  data-sel="${u===t.selectedSplitIdx?"true":"false"}"
                >${k(o.title)}</button>
              `).join("")}
          </div>
        </div>

        <!-- Built-in 1-Tap Bar & Plate Calculator (Replaces =45+2*45 / =20+... / =125+... / =2*47.5!) -->
        <div class="m3-seam-bot" style="padding: 13px 16px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 12px;">Bar &amp; Plate Calculator:</strong>
              <select id="select-calc-target" class="m3-input" style="width: auto; padding: 5px 10px; font-size: 12px;">
                ${a.map(o=>`<option value="${k(o.slug)}" ${o.slug===d?.slug?"selected":""}>${k(o.name)}</option>`).join("")}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tabular" style="font-size: 13px; font-weight: 800; color: var(--m3-teal);">
                ${s.formula} → ${s.totalLb.toFixed(1)} lb total
              </span>
              <button type="button" id="btn-apply-calc" class="m3-btn-tonal" style="padding: 5px 11px;">
                Apply to Card
              </button>
            </div>
          </div>

          <div class="m3-carousel" style="gap: 5px;">
            ${Object.entries(ee).map(([o,u])=>`
                <button
                  type="button"
                  class="m3-chip m3-carousel-item"
                  data-calc-equip="${o}"
                  data-sel="${t.calcEquipKey===o?"true":"false"}"
                >${k(u.label)}</button>
              `).join("")}
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Add per side/hand:</span>
            ${[45,35,25,10,5,2.5].map(o=>`<button type="button" class="m3-pill tabular" data-add-plate="${o}" style="padding: 4px 10px;">+${o}</button>`).join("")}
            <button type="button" id="btn-clear-plates" class="m3-pill" style="padding: 4px 10px; color: var(--m3-coral);">
              Clear (${t.calcPlatesPerSide.length?t.calcPlatesPerSide.join("+"):"0"})
            </button>
          </div>
        </div>
      </section>

      <!-- Spacious Exercise Fast Cards -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${a.map(o=>{const u=t.weightOverrides[o.slug]??o.last_display_lb,r=t.repsOverrides[o.slug]??o.target_reps,w=t.equipOverrides[o.slug],m=w?.equipment||o.equipment,y=w?.tare??o.tare_lb,x=(w?.mode||o.load_mode)==="per_hand"||m==="dumbbell_pair"?"lb/hand":"lb",b=!!t.loggedSlugs[o.slug],_=t.expandedSlug===o.slug;return`
              <article
                class="m3-card"
                style="padding: 15px 16px; border: 1.5px solid ${b?"var(--m3-teal)":"transparent"}; display: flex; flex-direction: column; gap: 10px;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
                      <strong style="font-size: 15px;">${k(o.name)}</strong>
                      <span class="tabular" style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--m3-surface-dim); font-weight: 700;">
                        ${o.target_sets} × ${r}
                      </span>
                      <button
                        type="button"
                        class="m3-pill"
                        data-open-metric="lift:${k(o.slug)}"
                        style="padding: 2px 8px; font-size: 11px; color: var(--m3-teal);"
                        title="Open 4-year trajectory for ${k(o.name)}"
                      >4y ›</button>
                    </div>
                    <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                      ${k(o.subtitle)}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px;">
                    ${se(o.sparkline||[],"var(--m3-teal)",64,22)}

                    <button
                      type="button"
                      class="m3-pill tabular"
                      data-expand-slug="${k(o.slug)}"
                      style="padding: 7px 11px; font-size: 13px; font-weight: 800;"
                      title="Adjust weight or reps"
                    >
                      ${u.toFixed(u%1===0?0:1)} ${x} ✎
                    </button>

                    <button
                      type="button"
                      id="btn-1tap-${k(o.slug)}"
                      data-log-lift="${k(o.slug)}"
                      class="${b?"m3-btn-tonal":"m3-btn-fill"}"
                      style="min-width: 98px;"
                    >
                      ${b?"✓ Logged":"1-Tap Log"}
                    </button>
                  </div>
                </div>

                ${_?`
                    <div style="padding-top: 10px; border-top: 1px solid var(--m3-hairline); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 700;">Working Weight (${x}):</span>
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(o.slug)}:-5">-5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(o.slug)}:-2.5">-2.5</button>
                        <input
                          type="number"
                          step="0.5"
                          value="${u}"
                          data-input-weight="${k(o.slug)}"
                          class="m3-input tabular"
                          style="width: 82px; text-align: center; padding: 6px;"
                        />
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(o.slug)}:2.5">+2.5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(o.slug)}:5">+5</button>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; font-weight: 700;">Reps:</span>
                        <input
                          type="number"
                          step="1"
                          value="${r}"
                          data-input-reps="${k(o.slug)}"
                          class="m3-input tabular"
                          style="width: 64px; text-align: center; padding: 6px;"
                        />
                        <span class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                          ${k(We(m,y))}
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
            ${(e.exercises||[]).map(o=>`<option value="${k(o.slug)}">${k(o.name)} (${k(o.primary_muscle)})</option>`).join("")}
          </select>
          <button type="button" id="btn-add-custom-exercise" class="m3-pill">Add Card</button>
        </div>

        <button type="button" id="btn-log-entire-split" class="m3-btn-fill" style="padding: 9px 18px;">
          Log Full Split Session (${a.length} Exercises)
        </button>
      </div>
    </div>
  `}function We(e,t){switch(e){case"olympic_bar":return`${t||45} lb Olympic bar`;case"smith":return`${t||20} lb lighter / Smith bar`;case"sled":return`${t||125} lb leg press sled`;case"dumbbell_pair":return"2× per-hand dumbbells";case"cable_stack":return"Cable / weight stack";case"bodyweight":return"Bodyweight";default:return t>0?`${e} (${t} lb bar/base)`:e}}function k(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ve(e){const t=e.sleep||{local_date:e.selected_date,efficiency_pct:92,deep_min:98,rem_min:108,light_min:248,awake_min:28,nadir_hr_bpm:47,nadir_time:"03:40 AM",bedtime_label:"11:08 PM – 6:52 AM",sleep_score_open:88},n=(e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1])?.sleep_score||t.sleep_score_open||88,a=(t.deep_min||96)+(t.rem_min||106)+(t.light_min||245),d=(t.deep_min||96)+(t.rem_min||106),s=Math.round(d/Math.max(1,a)*100),p=o=>`${Math.floor(o/60)}h ${String(o%60).padStart(2,"0")}m`;return`
    <div id="view-sleep" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Sleep Hero + Stages Donut -->
      <section class="m3-seam">
        <div class="m3-seam-top clickable-tile" data-open-metric="sleep" style="padding: 18px 20px; display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 16px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <span style="font-size: 11px; font-weight: 800; color: var(--m3-blue); letter-spacing: 0.04em;">
              SLEEP ARCHITECTURE • ${de(t.bedtime_label||"11:10 PM – 6:55 AM")}
            </span>
            <div style="display: flex; align-items: baseline; gap: 10px;">
              <span class="tabular" style="font-size: 32px; font-weight: 800; letter-spacing: -0.02em;">${p(a)}</span>
              <span class="badge-trend tabular" style="background: var(--m3-blue-tint); color: var(--m3-on-blue);">Score ${Math.round(n)}</span>
            </div>
            <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2);">
              Restorative (Deep + REM): <strong>${p(d)} (${s}%)</strong> • Open Score: ${Math.round(t.sleep_score_open||87)}
            </div>
          </div>

          ${Te(t.deep_min||96,t.rem_min||106,t.light_min||245,t.awake_min||26,t.efficiency_pct||92)}
        </div>

        <div class="m3-seam-bot" style="padding: 14px 16px; display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px;">
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-blue); font-weight: 800;">● Deep</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${p(t.deep_min||96)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">● REM</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${p(t.rem_min||106)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-amber); font-weight: 800;">● Light</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${p(t.light_min||245)}</div>
          </div>
          <div style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px;">
            <div style="font-size: 11px; color: var(--m3-coral); font-weight: 800;">● Awake</div>
            <div class="tabular" style="font-size: 15px; font-weight: 800; margin-top: 2px;">${t.awake_min||26}m</div>
          </div>
        </div>
      </section>

      <!-- Bedtime Consistency | Sleeping HR Dip Pair -->
      <div class="m3-pair">
        <div class="m3-pair-l" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Bedtime Window</span>
          <div class="tabular" style="font-size: 18px; font-weight: 800;">${de(t.bedtime_label||"11:08 PM – 6:52 AM")}</div>
          <div style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">Within ±22 min of 14d median</div>
        </div>
        <div class="m3-pair-r clickable-tile" data-open-metric="rhr" style="display: flex; flex-direction: column; gap: 6px;">
          <span style="font-size: 13px; font-weight: 700;">Sleeping HR Nadir</span>
          <div class="tabular" style="font-size: 18px; font-weight: 800;">
            ${Math.round(t.nadir_hr_bpm||47)} bpm <span style="font-size: 12px; font-weight: 600; color: var(--m3-ink-2);">@ ${de(t.nadir_time||"03:40 AM")}</span>
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
  `}function de(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ge(e,t){const i=e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1]||{date:e.selected_date,title:"Today",steps:0,distance_mi:0,total_kcal:0,azm:0,rhr:51,hrv:62,spo2:98,vo2:49,readiness:84,readiness_open:83,sleep_score:88,sleep_open:87,sleep_text:"7h 45m",cardio_load:412},n=1e4,a=45,d=e.recent_runs?.[0],s=e.recent_workouts?.[0],p=e.body,o=i.readiness>=80?"Optimal Recovery":i.readiness>=65?"Steady Baseline":"Prioritize Rest",u=i.sleep_score>=82?"Deep Restorative":"Solid Continuity";return`
    <div id="view-today" style="display: flex; flex-direction: column; gap: 12px;">
      <!-- Beat 1: Concentric Hero + Readiness/Sleep 2-Up Pair -->
      <div class="m3-split-12">
        <div class="span-7 m3-hero clickable-tile" data-open-metric="steps" style="padding: 18px 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px;">
          <div style="display: flex; align-items: center; justify-content: space-between; gap: 14px;">
            <div style="display: flex; flex-direction: column; gap: 8px;">
              <span style="font-size: 11px; font-weight: 800; letter-spacing: 0.04em; color: var(--m3-on-teal); opacity: 0.85;">
                DAILY MOVEMENT • ${J(i.title.toUpperCase())}
              </span>
              <div>
                <div class="tabular" style="font-size: 32px; font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; color: var(--m3-on-teal);">
                  ${i.steps.toLocaleString()}
                </div>
                <div style="font-size: 12px; font-weight: 600; color: var(--m3-on-teal); opacity: 0.82;">
                  of ${n.toLocaleString()} steps
                </div>
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span class="tabular" style="font-size: 20px; font-weight: 800; color: var(--m3-amber);">${i.azm}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--m3-on-teal); opacity: 0.84;">Active Zone Min / ${a}</span>
              </div>
            </div>

            ${Le(i.steps/n,i.azm/a)}
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
              ${xe(i.readiness,"var(--m3-teal)","var(--m3-teal-track)")}
              <div>
                <div style="font-size: 12px; font-weight: 700;">${o}</div>
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
              ${xe(i.sleep_score,"var(--m3-blue)","var(--m3-blue-track)")}
              <div>
                <div class="tabular" style="font-size: 13px; font-weight: 800;">${J(i.sleep_text)}</div>
                <div style="font-size: 11px; color: var(--m3-ink-2);">${u}</div>
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
                ${t==="24h"?"24h distribution across today":"Last 7 days vs 10,000 goal"}
              </div>
            </div>
            <div class="m3-seg">
              <button type="button" id="btn-step-24h" data-step-mode="24h" data-on="${t==="24h"?"true":"false"}">24h</button>
              <button type="button" id="btn-step-7d" data-step-mode="7d" data-on="${t==="7d"?"true":"false"}">7d</button>
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
                ${J(d?.title||"Garmin Aerobic Run (.FIT)")}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${d?`${(d.distance_m/1609.344).toFixed(2)} mi • Avg HR ${d.avg_hr} bpm • VDOT ${d.vdot_open.toFixed(1)} • TRIMP ${Math.round(d.trimp)}`:"Upload or generate a .FIT run in Fitness tab"}
              </div>
            </div>
            <span class="m3-pill">Splits ›</span>
          </div>

          <div class="m3-seam-bot clickable-tile" data-switch-tab="lift" style="padding: 14px 16px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal);">LATEST STRENGTH SESSION</div>
              <div style="font-size: 14px; font-weight: 800; margin-top: 1px;">
                ${J(s?.title||"Push / Chest & Triceps")}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${s?`${s.local_date} • ${s.sets?.length||0} working sets (${J(s.source)})`:"Tap + Lift to log sets in 1 tap"}
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
                  ${p?p.ewma_weight_lb.toFixed(1):"171.4"} <span style="font-size: 12px; font-weight: 600;">lb</span>
                </div>
                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Scale: ${p?p.weight_lb.toFixed(1):"171.6"} lb (${p&&p.delta_vs_peak<=0?"":"+"}${p?p.delta_vs_peak.toFixed(1):"-8.4"} vs peak)
                </div>
              </div>
              ${p?.sparkline?.length?se(p.sparkline,"var(--m3-teal)",62,24):""}
            </div>
            <form id="form-quick-weight" style="display: flex; gap: 5px; margin-top: 2px;">
              <input
                id="input-quick-weight"
                type="number"
                step="0.1"
                placeholder="${p?p.weight_lb.toFixed(1):"171.5"} lb"
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
                ${p?.body_fat_pct?p.body_fat_pct.toFixed(1):"13.6"}%
              </div>
              <div style="font-size: 11px; color: var(--m3-ink-2);">Body Fat</div>
            </div>
            <div class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 700;">
              Lean Mass: ${p?.lean_mass_lb?p.lean_mass_lb.toFixed(1):"148.1"} lb
            </div>
          </div>
        </div>
      </div>
    </div>
  `}function J(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Ue={today:"readiness",fitness:"lift:bench-press",sleep:"sleep",health:"lab:apob",lift:"lift:bench-press"},l={theme:localStorage.getItem("autofit_theme")||"light",viewport:window.innerWidth<760?"mobile":"desktop",activeTab:"today",selectedDate:"",stepMode:"24h",liftQuery:"",calDrawerOpen:!1,syncDrawerOpen:!1,explorerOpen:!1,activeMetric:"lift:bench-press",activeHorizon:"all",bootstrap:null,trend:null,toastMessage:null,lift:{selectedSplitIdx:0,customItems:[],loggedSlugs:{},expandedSlug:null,weightOverrides:{},repsOverrides:{},equipOverrides:{},calcTargetSlug:null,calcEquipKey:"olympic_45",calcPlatesPerSide:[45,10,2.5],restSecondsLeft:0,simulateOffline:!1,queuedOfflineCount:0}};let pe=null,K=null;function g(e){l.toastMessage=e,h(),pe&&window.clearTimeout(pe),pe=window.setTimeout(()=>{l.toastMessage=null;const t=document.getElementById("m3-toast-banner");t&&t.remove()},3400)}function we(e){l.lift.restSecondsLeft=e,K&&window.clearInterval(K),h(),K=window.setInterval(()=>{if(l.lift.restSecondsLeft>0){if(l.lift.restSecondsLeft-=1,l.activeTab==="lift"){const t=document.getElementById("btn-rest-90");if(t){const i=l.lift.restSecondsLeft;t.textContent=i>0?`⏱ ${Math.floor(i/60)}:${String(i%60).padStart(2,"0")}`:"90s",t.setAttribute("data-on",i>0?"true":"false")}}l.lift.restSecondsLeft===0&&(K&&window.clearInterval(K),g("Rest complete — ready for next set!"))}},1e3)}async function z(e){try{const t=await M.getBootstrap(e||l.selectedDate||void 0);l.bootstrap=t,l.selectedDate=t.selected_date;const i=await Y();l.lift.queuedOfflineCount=i.length,await Q(l.activeMetric,l.activeHorizon,!1),h()}catch(t){g(`Offline / cached mode: ${t.message}`),h()}}async function Q(e,t,i=!0){l.activeMetric=e,l.activeHorizon=t;try{l.trend=await M.getTrend(e,t)}catch{}i&&h()}function h(){const e=document.getElementById("m3-app");if(!e)return;e.setAttribute("data-mode",l.theme),e.setAttribute("data-viewport",l.viewport);const t=l.bootstrap;if(!t){e.innerHTML=`
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">✦</div>
        <strong style="font-size: 15px;">Loading Autofit SQLite Engine…</strong>
      </div>
    `;return}const i=t.week_strip[t.selected_index]||t.week_strip[t.week_strip.length-1],n=t.integrations?.google_health,a={today:i?.title||"Today",fitness:"Fitness & Lifts",sleep:"Sleep & Recovery",health:"Clinical Health",lift:"1-Tap Lift Logger"},d=(t.week_strip||[]).map((p,o)=>{const u=o===t.selected_index;return`
        <button
          type="button"
          id="cal-day-${p.date}"
          class="cal-btn"
          data-select-date="${p.date}"
          data-sel="${u?"true":"false"}"
        >
          <span style="font-size: 11px; color: var(--m3-ink-2);">${p.day_letter}</span>
          ${Me(p.steps/1e4,p.day_num,u)}
        </button>
      `}).join("");let s="";switch(l.activeTab){case"today":s=Ge(t,l.stepMode);break;case"fitness":s=He(t,l.liftQuery);break;case"sleep":s=Ve(t);break;case"health":s=je(t);break;case"lift":s=Ne(t,l.lift);break}e.innerHTML=`
    <!-- Top App & Viewport Bar -->
    <header class="preview-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: var(--m3-teal-tint); color: var(--m3-on-teal); width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800;">✦</span>
        <strong style="font-size: 14px;">Autofit</strong>
        <span class="tabular" style="color: var(--m3-ink-2); font-weight: 600;">
          ${t.total_workouts} SQLite workouts
          ${l.lift.queuedOfflineCount>0?` • ${l.lift.queuedOfflineCount} offline queued`:""}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <button type="button" id="btn-open-sync" class="m3-pill" style="padding: 5px 11px;">
          <span>⇄ Sync &amp; CSV</span>
          ${n?.status==="expiring_soon"?'<span style="color: var(--m3-amber);">●</span>':""}
        </button>

        <div class="m3-seg" role="group" aria-label="Viewport Mode">
          <button type="button" id="btn-vp-mobile" data-vp="mobile" data-on="${l.viewport==="mobile"?"true":"false"}">Mobile PWA</button>
          <button type="button" id="btn-vp-desktop" data-vp="desktop" data-on="${l.viewport==="desktop"?"true":"false"}">Desktop Web</button>
        </div>

        <button type="button" id="btn-theme-toggle" class="m3-pill" style="padding: 5px 11px;">
          <span>${l.theme==="light"?"☾ Dark":"☀ Light"}</span>
        </button>
      </div>
    </header>

    <div class="app-shell">
      <!-- Desktop Left Navigation Rail -->
      <aside id="m3-rail" aria-label="Primary Navigation">
        <div style="display: flex; flex-direction: column; align-items: center; gap: 18px; width: 100%;">
          <button
            type="button"
            id="rail-fab-lift"
            data-switch-tab="lift"
            data-active="${l.activeTab==="lift"?"true":"false"}"
            style="width: 56px; height: 56px; border-radius: 18px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px; font-weight: 700;"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Lift</span>
          </button>

          <nav style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            ${ae("today","Today",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}
            ${ae("fitness","Fitness",'<path d="M3 17l5-5 4 4 8-9"/><path d="M16 7h4v4"/>')}
            ${ae("sleep","Sleep",'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}
            ${ae("health","Health",'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>')}
          </nav>
        </div>

        <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); text-align: center;">
          WAL Ready<br/>v0.1
        </div>
      </aside>

      <!-- Main Content Stage -->
      <main class="main-stage">
        <div class="stage-inner">
          <!-- Flush Google Health App Bar (+ 7-Day Ring Strip on Daily Wearable Views) -->
          <div style="display: flex; flex-direction: column; gap: 10px;">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; flex-wrap: wrap;">
              <button
                type="button"
                id="btn-device-pill"
                data-toggle-sync="true"
                style="background: var(--m3-surface); padding: 6px 12px 6px 10px; border-radius: 9999px; display: inline-flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 600;"
              >
                <span style="width: 8px; height: 8px; border-radius: 9999px; background: var(--m3-teal);"></span>
                <span>Fitbit Air</span>
                <span class="tabular" style="color: var(--m3-ink-2); font-weight: 500;">${i?.battery_pct||92}%</span>
              </button>

              <h1 id="top-view-title" style="margin: 0; font-size: 17px; font-weight: 800; letter-spacing: -0.01em;">
                ${a[l.activeTab]}
              </h1>

              <div style="display: flex; align-items: center; gap: 6px;">
                <button
                  type="button"
                  id="btn-toggle-explorer"
                  class="m3-btn-tonal"
                  style="padding: 6px 11px;"
                >
                  ${l.explorerOpen?"Hide 4y Chart":"4y Trends"}
                </button>
                <button
                  type="button"
                  id="btn-tune-scores"
                  class="m3-pill"
                  style="background: var(--m3-surface); padding: 6px 11px;"
                >
                  Tune
                </button>
              </div>
            </div>

            ${l.activeTab==="today"||l.activeTab==="sleep"?`<div id="week-strip" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px;">
                     ${d}
                   </div>`:""}
          </div>

          ${De(t,l.calDrawerOpen)}
          ${Fe(t,l.syncDrawerOpen)}

          ${l.explorerOpen?Ie(l.trend,t.metric_catalog||[],l.activeHorizon,l.activeTab!=="fitness"):""}

          ${s}
        </div>
      </main>

      <!-- Mobile Sticky Frosted Pill Dock + Squircle + Lift FAB -->
      <div id="m3-floating-dock" role="navigation" aria-label="Mobile Navigation">
        <div class="dock-pill">
          ${ne("today","Today")}
          ${ne("fitness","Fitness")}
          ${ne("sleep","Sleep")}
          ${ne("health","Health")}
        </div>
        <button
          type="button"
          id="dock-fab-lift"
          data-switch-tab="lift"
          data-active="${l.activeTab==="lift"?"true":"false"}"
          class="dock-fab"
          aria-label="Log Lift"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <span style="font-size: 10px;">Lift</span>
        </button>
      </div>
    </div>

    ${l.toastMessage?`<div id="m3-toast-banner" class="m3-toast" role="status">${Ze(l.toastMessage)}</div>`:""}
  `,$e(t),Qe(e,t)}function ae(e,t,i){return`
    <button type="button" id="rail-nav-${e}" data-switch-tab="${e}" data-active="${l.activeTab===e?"true":"false"}" class="rail-btn">
      <span class="rail-pill">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">${i}</svg>
      </span>
      <span>${t}</span>
    </button>
  `}function ne(e,t){return`
    <button type="button" id="dock-nav-${e}" data-switch-tab="${e}" data-active="${l.activeTab===e?"true":"false"}" class="dock-tab">
      <span>${t}</span>
    </button>
  `}function $e(e){if(l.explorerOpen&&l.trend&&Oe(document.getElementById("longTermCanvas"),document.getElementById("trend-scrub-readout"),l.trend),l.activeTab==="today"){const t=document.getElementById("stepsCapsuleCanvas");if(l.stepMode==="24h"){const i=e.intraday?.hourly_steps||new Array(24).fill(0),n=i.map((a,d)=>d===0?"12a":d===6?"6a":d===12?"12p":d===18?"6p":d===23?"11p":"");re(t,i,n,"--m3-teal")}else{const i=(e.week_strip||[]).map(a=>a.steps),n=(e.week_strip||[]).map(a=>a.day_letter);re(t,i,n,"--m3-teal",1e4)}ze(document.getElementById("rhrMiniWaveCanvas"),e.intraday?.intraday_hr||[56,54,53,52,51,52,50],"--m3-coral")}if(l.activeTab==="sleep"){const t=e.intraday?.sleep_14d||[];re(document.getElementById("sleep14dCanvas"),t.map(i=>i.hours),t.map(i=>i.label),"--m3-blue",7.75)}}function Qe(e,t){document.getElementById("btn-theme-toggle")?.addEventListener("click",()=>{l.theme=l.theme==="light"?"dark":"light",localStorage.setItem("autofit_theme",l.theme),h()}),e.querySelectorAll("[data-vp]").forEach(n=>{n.addEventListener("click",()=>{const a=n.getAttribute("data-vp");a&&(l.viewport=a,h())})}),e.querySelectorAll("[data-switch-tab]").forEach(n=>{n.addEventListener("click",a=>{a.preventDefault(),a.stopPropagation();const d=n.getAttribute("data-switch-tab");d&&(l.activeTab=d,l.calDrawerOpen=!1,l.syncDrawerOpen=!1,l.explorerOpen=d==="fitness",d==="fitness"&&!l.activeMetric.startsWith("lift:")&&l.activeMetric!=="vo2"?Q("lift:bench-press",l.activeHorizon,!0):h(),window.scrollTo({top:0,behavior:"instant"}))})}),document.getElementById("btn-tune-scores")?.addEventListener("click",()=>{l.calDrawerOpen=!l.calDrawerOpen,h()}),document.getElementById("btn-close-cal")?.addEventListener("click",()=>{l.calDrawerOpen=!1,h()}),document.getElementById("btn-open-sync")?.addEventListener("click",()=>{l.syncDrawerOpen=!l.syncDrawerOpen,h()}),document.getElementById("btn-device-pill")?.addEventListener("click",()=>{l.syncDrawerOpen=!l.syncDrawerOpen,h()}),document.getElementById("btn-close-sync")?.addEventListener("click",()=>{l.syncDrawerOpen=!1,h()}),document.getElementById("btn-toggle-explorer")?.addEventListener("click",()=>{const n=!l.explorerOpen;if(l.explorerOpen=n,n){const a=Ue[l.activeTab]||"lift:bench-press";if(l.activeTab!=="fitness"&&l.activeMetric!==a){Q(a,l.activeHorizon,!0);return}}h()}),document.getElementById("btn-close-explorer")?.addEventListener("click",()=>{l.explorerOpen=!1,h()}),e.querySelectorAll("[data-select-date]").forEach(n=>{n.addEventListener("click",()=>{const a=n.getAttribute("data-select-date");a&&z(a)})}),e.querySelectorAll("[data-open-metric]").forEach(n=>{n.addEventListener("click",a=>{const d=a.target;if(d!==n&&(d.tagName==="INPUT"||d.tagName==="BUTTON"||d.closest("form")))return;const s=n.getAttribute("data-open-metric");s&&(l.explorerOpen=!0,Q(s,l.activeHorizon,!0).then(()=>{document.getElementById("trend-explorer-card")?.scrollIntoView({behavior:"smooth",block:"nearest"})}))})}),e.querySelectorAll("[data-metric-chip]").forEach(n=>{n.addEventListener("click",()=>{const a=n.getAttribute("data-metric-chip");a&&Q(a,l.activeHorizon,!0)})}),e.querySelectorAll("[data-hz-btn]").forEach(n=>{n.addEventListener("click",()=>{const a=n.getAttribute("data-hz-btn");a&&Q(l.activeMetric,a,!0)})}),e.querySelectorAll("[data-step-mode]").forEach(n=>{n.addEventListener("click",()=>{l.stepMode=n.getAttribute("data-step-mode")||"24h",h()})}),document.getElementById("form-quick-weight")?.addEventListener("submit",async n=>{n.preventDefault();const a=document.getElementById("input-quick-weight"),d=parseFloat(a?.value||"");if(!d||d<60||d>500){g("Enter a valid body weight in lb");return}try{await M.logBody(d,t.body?.body_fat_pct,l.selectedDate),g(`Logged ${d.toFixed(1)} lb — EWMA & outbound ledger updated!`),await z(l.selectedDate)}catch(s){g(`Weight log failed: ${s.message}`)}}),document.getElementById("form-calibration")?.addEventListener("submit",async n=>{n.preventDefault();const a=parseFloat(document.getElementById("in-cal-r")?.value||"84"),d=parseFloat(document.getElementById("in-cal-s")?.value||"88"),s=parseFloat(document.getElementById("in-cal-c")?.value||"412");try{await M.saveCalibration(a,d,s,l.selectedDate),l.calDrawerOpen=!1,g("OLS Calibration curve updated!"),await z(l.selectedDate)}catch(p){g(`Calibration error: ${p.message}`)}}),document.getElementById("btn-trigger-sync")?.addEventListener("click",async()=>{try{await M.triggerSync(),g("Connector sync poll completed."),await z(l.selectedDate)}catch(n){g(`Sync note: ${n.message}`)}}),document.getElementById("form-xlsx-url")?.addEventListener("submit",async n=>{n.preventDefault();const a=document.getElementById("input-xlsx-url")?.value.trim();if(a)try{g("Importing 2022–2026 Google Sheet (.xlsx)…");const d=await M.importXLSXUrl(a);g(`Imported ${d.summary.workouts_imported||""} workouts cleanly!`),await z()}catch(d){g(`.xlsx import failed: ${d.message}`)}}),document.getElementById("input-xlsx-file")?.addEventListener("change",async n=>{const a=n.target.files?.[0];if(a)try{g(`Parsing ${a.name}…`);const d=await M.importXLSXFile(a);g(`Backfilled ${d.summary.workouts_imported||""} workouts!`),await z()}catch(d){g(`Upload error: ${d.message}`)}});const i=document.getElementById("input-filter-lifts");i&&i.addEventListener("input",()=>{l.liftQuery=i.value;const n=i.selectionStart||i.value.length;h();const a=document.getElementById("input-filter-lifts");a&&(a.focus(),a.setSelectionRange(n,n))}),document.getElementById("btn-sample-fit")?.addEventListener("click",async()=>{try{const n=await M.generateSampleFIT();g(`Decoded binary .FIT: ${n.activity.splits.length} mile splits • VDOT ${n.activity.vdot_open.toFixed(1)}`),await z(l.selectedDate)}catch(n){g(`.FIT decode error: ${n.message}`)}}),document.getElementById("input-fit-upload")?.addEventListener("change",async n=>{const a=n.target.files?.[0];if(a)try{const d=await M.importFITFile(a);g(`Imported ${a.name} • VDOT ${d.activity.vdot_open.toFixed(1)}`),await z(l.selectedDate)}catch(d){g(`.FIT upload failed: ${d.message}`)}}),document.getElementById("btn-load-sample-shlink")?.addEventListener("click",async()=>{try{const n=await M.getSampleSHLink(),a=document.getElementById("input-shlink-uri");a&&(a.value=n.shlink),g("Generated A256GCM encrypted shlink:/ — click Decrypt & Import!")}catch(n){g(`Sample shlink error: ${n.message}`)}}),document.getElementById("form-shlink-import")?.addEventListener("submit",async n=>{n.preventDefault();const a=document.getElementById("input-shlink-uri")?.value.trim();if(a)try{const d=await M.importMedical({shlink:a});g(`Decrypted JWE & imported ${d.observations_imported} FHIR R4 LOINC biomarkers!`),await z(l.selectedDate)}catch(d){g(`shlink:/ decrypt error: ${d.message}`)}}),document.getElementById("input-fhir-file")?.addEventListener("change",async n=>{const a=n.target.files?.[0];if(a)try{const d=await a.text(),s=await M.importMedical({fhir_json:JSON.parse(d)});g(`Imported ${s.observations_imported} FHIR R4 observations!`),await z(l.selectedDate)}catch(d){g(`FHIR JSON error: ${d.message}`)}}),document.getElementById("form-manual-lab")?.addEventListener("submit",async n=>{n.preventDefault();const a=document.getElementById("select-manual-biomarker")?.value,d=parseFloat(document.getElementById("input-manual-lab-val")?.value||"");if(!(!a||!d||d<=0))try{await M.importMedical({biomarker:a,value:d,local_date:l.selectedDate}),g(`Saved ${a}: ${d}`),await z(l.selectedDate)}catch(s){g(`Lab save error: ${s.message}`)}}),Xe(e,t)}function Xe(e,t){if(l.activeTab!=="lift")return;e.querySelectorAll("[data-split-idx]").forEach(s=>{s.addEventListener("click",()=>{l.lift.selectedSplitIdx=parseInt(s.getAttribute("data-split-idx")||"0",10),l.lift.customItems=[],l.lift.calcTargetSlug=null,h()})}),e.querySelectorAll("[data-rest-sec]").forEach(s=>{s.addEventListener("click",()=>{const p=parseInt(s.getAttribute("data-rest-sec")||"90",10);we(p)})}),document.getElementById("btn-toggle-offline-sim")?.addEventListener("click",()=>{l.lift.simulateOffline=!l.lift.simulateOffline,g(l.lift.simulateOffline?"Offline Gym Simulation ON: sets queue locally in IndexedDB!":"Back Online: flushing IndexedDB workout queue…"),l.lift.simulateOffline||ue().then(async s=>{l.lift.queuedOfflineCount=s.remaining,s.flushed>0?(g(`Synced ${s.flushed} queued offline workout(s) to SQLite!`),await z(l.selectedDate)):h()})}),document.getElementById("btn-flush-offline")?.addEventListener("click",async()=>{l.lift.simulateOffline=!1;const s=await ue();l.lift.queuedOfflineCount=s.remaining,g(`Flushed ${s.flushed} offline workout(s) to SQLite!`),await z(l.selectedDate)}),document.getElementById("select-calc-target")?.addEventListener("change",s=>{l.lift.calcTargetSlug=s.target.value,h()}),e.querySelectorAll("[data-calc-equip]").forEach(s=>{s.addEventListener("click",()=>{const p=s.getAttribute("data-calc-equip")||"olympic_45";l.lift.calcEquipKey=p,p==="dumbbell_2x"&&(l.lift.calcPlatesPerSide=[45]),h()})}),e.querySelectorAll("[data-add-plate]").forEach(s=>{s.addEventListener("click",()=>{const p=parseFloat(s.getAttribute("data-add-plate")||"0");p>0&&(l.lift.calcPlatesPerSide=[...l.lift.calcPlatesPerSide,p],h())})}),document.getElementById("btn-clear-plates")?.addEventListener("click",()=>{l.lift.calcPlatesPerSide=[],h()});const i=t.splits||[],n=i[l.lift.selectedSplitIdx]||i[0],a=[...n?.items||[],...l.lift.customItems];document.getElementById("btn-apply-calc")?.addEventListener("click",()=>{const s=a.find(u=>u.slug===l.lift.calcTargetSlug)||a[0];if(!s)return;const p=ee[l.lift.calcEquipKey]||ee.olympic_45,o=ke(l.lift.calcEquipKey,l.lift.calcPlatesPerSide);l.lift.weightOverrides[s.slug]=o.displayLb,l.lift.equipOverrides[s.slug]={equipment:p.equipment,tare:p.tare,mode:p.mode},g(`Applied ${o.formula} (${o.totalLb.toFixed(1)} lb) to ${s.name}`)}),e.querySelectorAll("[data-expand-slug]").forEach(s=>{s.addEventListener("click",()=>{const p=s.getAttribute("data-expand-slug");l.lift.expandedSlug=l.lift.expandedSlug===p?null:p,h()})}),e.querySelectorAll("[data-step-weight]").forEach(s=>{s.addEventListener("click",()=>{const[p,o]=(s.getAttribute("data-step-weight")||"").split(":"),u=a.find(w=>w.slug===p);if(!u)return;const r=l.lift.weightOverrides[p]??u.last_display_lb;l.lift.weightOverrides[p]=Math.max(0,r+parseFloat(o||"0")),h()})}),e.querySelectorAll("[data-input-weight]").forEach(s=>{s.addEventListener("change",()=>{const p=s.getAttribute("data-input-weight")||"",o=parseFloat(s.value);p&&!Number.isNaN(o)&&o>=0&&(l.lift.weightOverrides[p]=o,h())})}),e.querySelectorAll("[data-input-reps]").forEach(s=>{s.addEventListener("change",()=>{const p=s.getAttribute("data-input-reps")||"",o=parseInt(s.value,10);p&&o>0&&(l.lift.repsOverrides[p]=o,h())})});const d=(s,p)=>{const o=l.lift.weightOverrides[s.slug]??s.last_display_lb,u=l.lift.repsOverrides[s.slug]??s.target_reps,r=l.lift.equipOverrides[s.slug],w=r?.equipment||s.equipment,m=r?.tare??s.tare_lb,y=r?.mode||s.load_mode,$=y==="per_hand"||w==="dumbbell_pair",f=$?o*2:o,x=$?o:m>0&&f>=m?(f-m)/2:f,b=[];for(let _=0;_<s.target_sets;_++)b.push({exercise_id:s.exercise_id,exercise_slug:s.slug,exercise_name:s.name,set_index:p+_,equipment:w,tare_lb:m,load_mode:y,per_side_or_hand_lb:x,total_weight_lb:f,reps:u});return b};e.querySelectorAll("[data-log-lift]").forEach(s=>{s.addEventListener("click",async()=>{const p=s.getAttribute("data-log-lift")||"",o=a.find(w=>w.slug===p);if(!o)return;const u=d(o,1),r=await be({id:he(),local_date:l.selectedDate||t.anchor_date,split_id:n?.id,title:`${n?.title||"Gym"} — ${o.name}`,sets:u},l.lift.simulateOffline);l.lift.loggedSlugs[p]=!0,l.lift.queuedOfflineCount=r.queuedCount,we(90),r.synced?(g(`Logged ${o.target_sets}× sets of ${o.name} to SQLite!`),await z(l.selectedDate)):g(`Queued ${o.name} offline in IndexedDB (${r.queuedCount} pending)!`)})}),document.getElementById("btn-add-custom-exercise")?.addEventListener("click",()=>{const p=document.getElementById("select-add-exercise")?.value||"";if(!p)return;const o=(t.exercises||[]).find(u=>u.slug===p);if(o){if(a.some(u=>u.slug===p)){g(`${o.name} is already in this session.`);return}l.lift.customItems.push({exercise_id:o.id,slug:o.slug,name:o.name,primary_muscle:o.primary_muscle,equipment:o.default_equipment,tare_lb:o.default_tare_lb,load_mode:o.load_mode,target_sets:o.default_sets||4,target_reps:o.default_reps||10,scheme:`${o.default_sets||4} × ${o.default_reps||10}`,last_display_lb:o.default_equipment==="olympic_bar"?135:35,last_total_lb:o.default_equipment==="olympic_bar"?135:70,subtitle:`Added from catalog • ${o.default_equipment}`,sparkline:[]}),h()}}),document.getElementById("btn-log-entire-split")?.addEventListener("click",async()=>{if(!a.length)return;const s=[];a.forEach(o=>{s.push(...d(o,s.length+1)),l.lift.loggedSlugs[o.slug]=!0});const p=await be({id:he(),local_date:l.selectedDate||t.anchor_date,split_id:n?.id,title:n?.title||"Full Split Session",sets:s},l.lift.simulateOffline);l.lift.queuedOfflineCount=p.queuedCount,p.synced?(g(`Saved ${s.length} sets (${n?.title}) to SQLite!`),await z(l.selectedDate)):g(`Saved ${s.length} sets to IndexedDB offline queue!`)})}function Ze(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{})});window.addEventListener("online",()=>{l.lift.simulateOffline||ue().then(async e=>{l.lift.queuedOfflineCount=e.remaining,e.flushed>0&&(g(`Synced ${e.flushed} offline workout(s) to SQLite!`),await z(l.selectedDate))})});let ce=null;window.addEventListener("resize",()=>{ce&&window.clearTimeout(ce),ce=window.setTimeout(()=>{l.bootstrap&&$e(l.bootstrap)},120)});z();
