(function(){const t=document.createElement("link").relList;if(t&&t.supports&&t.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))s(a);new MutationObserver(a=>{for(const d of a)if(d.type==="childList")for(const n of d.addedNodes)n.tagName==="LINK"&&n.rel==="modulepreload"&&s(n)}).observe(document,{childList:!0,subtree:!0});function i(a){const d={};return a.integrity&&(d.integrity=a.integrity),a.referrerPolicy&&(d.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?d.credentials="include":a.crossOrigin==="anonymous"?d.credentials="omit":d.credentials="same-origin",d}function s(a){if(a.ep)return;a.ep=!0;const d=i(a);fetch(a.href,d)}})();async function M(e,t){const i=await fetch(e,{...t,headers:{...t?.body instanceof FormData?{}:{"Content-Type":"application/json"},...t?.headers||{}}});if(!i.ok){let s=`HTTP ${i.status}`;try{const a=await i.json();a?.error&&(s=a.error)}catch{}throw new Error(s)}return i.json()}const L={getBootstrap(e){const t=e?`?date=${encodeURIComponent(e)}`:"";return M(`/api/v1/bootstrap${t}`)},getTrend(e,t){const i=`?metric=${encodeURIComponent(e)}&horizon=${encodeURIComponent(t)}`;return M(`/api/v1/trends${i}`)},logWorkout(e){return M("/api/v1/workouts",{method:"POST",body:JSON.stringify(e)})},syncWorkoutsBatch(e){return M("/api/v1/workouts/sync",{method:"POST",body:JSON.stringify({workouts:e})})},logBody(e,t,i){return M("/api/v1/body",{method:"POST",body:JSON.stringify({weight_lb:e,body_fat_pct:t||0,local_date:i||""})})},saveCalibration(e,t,i,s){return M("/api/v1/calibrations",{method:"POST",body:JSON.stringify({local_date:s||"",gh_readiness:e,gh_sleep_score:t,gh_cardio_load:i})})},importXLSXFile(e){const t=new FormData;return t.append("file",e),M("/api/v1/import/xlsx",{method:"POST",body:t})},importXLSXUrl(e){return M("/api/v1/import/xlsx",{method:"POST",body:JSON.stringify({sheet_url:e})})},importFITFile(e,t){const i=new FormData;return i.append("file",e),t&&i.append("title",t),M("/api/v1/import/fit",{method:"POST",body:i})},generateSampleFIT(){return M("/api/v1/import/fit",{method:"POST",body:JSON.stringify({generate_sample:!0,title:"Garmin Threshold Progression (.FIT)"})})},getSampleSHLink(){return M("/api/v1/import/medical/sample-shlink")},importMedical(e){return M("/api/v1/import/medical",{method:"POST",body:JSON.stringify(e)})},seedDemo(){return M("/api/v1/demo/seed",{method:"POST",body:"{}"})},triggerSync(){return M("/api/v1/integrations/sync",{method:"POST",body:"{}"})}};function se(e,t="var(--m3-teal)",i=72,s=24){const a=e.filter(g=>g!=null&&!Number.isNaN(g));if(a.length<2)return`<svg width="${i}" height="${s}" viewBox="0 0 ${i} ${s}"></svg>`;const d=Math.min(...a),n=Math.max(...a),p=Math.max(1,n-d),l=3,u=4,o=(i-l*2)/Math.max(1,e.length-1);let w="",m=!1,x=0,y=0;return e.forEach((g,S)=>{if(g==null||Number.isNaN(g)){m=!1;return}const h=l+S*o,E=s-u-(g-d)/p*(s-u*2);w+=`${m?"L":"M"}${h.toFixed(1)},${E.toFixed(1)} `,m=!0,x=h,y=E}),`
    <svg width="${i}" height="${s}" viewBox="0 0 ${i} ${s}" style="overflow: visible; flex-shrink: 0;" aria-hidden="true">
      <path d="${w.trim()}" fill="none" stroke="${t}" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="2.6" fill="${t}" />
    </svg>
  `}function re(e,t,i,s="--m3-teal",a){if(!e||!t.length)return;const d=e.getBoundingClientRect(),n=Math.max(220,d.width||320),p=Math.max(90,d.height||120),l=window.devicePixelRatio||1;e.width=Math.round(n*l),e.height=Math.round(p*l);const u=e.getContext("2d");if(!u)return;u.scale(l,l),u.clearRect(0,0,n,p);const o=getComputedStyle(document.getElementById("m3-app")||document.documentElement),w=o.getPropertyValue(s).trim()||"#0b7f6b",m=o.getPropertyValue("--m3-surface-dim").trim()||"#e2ebe8",x=o.getPropertyValue("--m3-ink-2").trim()||"#556b67",y=o.getPropertyValue("--m3-hairline").trim()||"rgba(0,0,0,0.1)",g=10,h=p-g-20,E=Math.max(a||1,...t,1)*1.1;if(a&&a>0){const T=g+h-a/E*h;u.save(),u.setLineDash([4,4]),u.strokeStyle=y,u.lineWidth=1.2,u.beginPath(),u.moveTo(4,T),u.lineTo(n-4,T),u.stroke(),u.restore()}const H=t.length,W=(n-8)/H,A=Math.max(5,Math.min(18,W*.58));t.forEach((T,I)=>{const $=4+W*I+W/2,ee=$-A/2;ve(u,ee,g,A,h,A/2,m);const V=Math.max(T>0?5:0,Math.max(0,T)/E*h);V>0&&ve(u,ee,g+h-V,A,V,A/2,w),(H<=7||I===0||I===Math.floor(H/2)||I===H-1||H===24&&I%6===0)&&i[I]&&(u.fillStyle=x,u.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif",u.textAlign="center",u.fillText(i[I],$,p-5))})}function ze(e,t,i="--m3-coral"){if(!e||t.length<2)return;const s=e.getBoundingClientRect(),a=Math.max(90,s.width||130),d=Math.max(30,s.height||38),n=window.devicePixelRatio||1;e.width=Math.round(a*n),e.height=Math.round(d*n);const p=e.getContext("2d");if(!p)return;p.scale(n,n),p.clearRect(0,0,a,d);const u=getComputedStyle(document.getElementById("m3-app")||document.documentElement).getPropertyValue(i).trim()||"#df3c2a",o=Math.min(...t),w=Math.max(...t),m=Math.max(1,w-o),x=(a-8)/(t.length-1);p.strokeStyle=u,p.lineWidth=2.2,p.lineCap="round",p.lineJoin="round",p.beginPath(),t.forEach((y,g)=>{const S=4+g*x,h=d-5-(y-o)/m*(d-10);g===0?p.moveTo(S,h):p.lineTo(S,h)}),p.stroke()}function ve(e,t,i,s,a,d,n){const p=Math.min(d,s/2,a/2);e.fillStyle=n,e.beginPath(),e.moveTo(t+p,i),e.arcTo(t+s,i,t+s,i+a,p),e.arcTo(t+s,i+a,t,i+a,p),e.arcTo(t,i+a,t,i,p),e.arcTo(t,i,t+s,i,p),e.closePath(),e.fill()}function Le(e,t){const n=Math.max(8,Math.min(262,262*Math.min(1,Math.max(0,e)))),p=Math.max(8,Math.min(190,190*Math.min(1,Math.max(0,t))));return`
    <svg width="132" height="132" viewBox="0 0 136 136" aria-hidden="true">
      <g transform="rotate(140 68 68)">
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal-track)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="262 ${364.4}" />
        <circle cx="68" cy="68" r="58" fill="none" stroke="var(--m3-teal)" stroke-width="11"
          stroke-linecap="round" stroke-dasharray="${n.toFixed(1)} ${364.4}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber-track)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="190 ${263.9}" />
        <circle cx="68" cy="68" r="42" fill="none" stroke="var(--m3-amber)" stroke-width="10"
          stroke-linecap="round" stroke-dasharray="${p.toFixed(1)} ${263.9}" />
      </g>
    </svg>
  `}function Me(e,t,i){const a=2*Math.PI*13,d=a*.82,n=Math.max(3,Math.min(d,d*Math.min(1,Math.max(0,e))));return`
    <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
      <svg width="32" height="32" viewBox="0 0 32 32" aria-hidden="true">
        <g transform="rotate(122 16 16)">
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--m3-teal-track)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${d.toFixed(1)} ${a.toFixed(1)}" />
          <circle cx="16" cy="16" r="13" fill="none" stroke="var(--m3-teal)" stroke-width="3.2"
            stroke-linecap="round" stroke-dasharray="${n.toFixed(1)} ${a.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 11px; font-weight: ${i?800:600};">${t}</span>
    </div>
  `}function xe(e,t,i,s=64){const d=2*Math.PI*24,n=d*.74,p=Math.max(.05,Math.min(1,e/100)),l=n*p;return`
    <div style="position: relative; width: ${s}px; height: ${s}px; display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0;">
      <svg width="${s}" height="${s}" viewBox="0 0 60 60" aria-hidden="true">
        <g transform="rotate(136 30 30)">
          <circle cx="30" cy="30" r="24" fill="none" stroke="${i}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${n.toFixed(1)} ${d.toFixed(1)}" />
          <circle cx="30" cy="30" r="24" fill="none" stroke="${t}" stroke-width="6.2"
            stroke-linecap="round" stroke-dasharray="${l.toFixed(1)} ${d.toFixed(1)}" />
        </g>
      </svg>
      <span class="tabular" style="position: absolute; font-size: 16px; font-weight: 800; letter-spacing: -0.02em;">${Math.round(e)}</span>
    </div>
  `}function Ee(e,t,i,s,a){const d=Math.max(1,e+t+i+s),n=46,p=2*Math.PI*n,l=8,u=[{val:e,color:"var(--m3-blue)"},{val:t,color:"var(--m3-teal)"},{val:i,color:"var(--m3-amber)"},{val:Math.max(8,s),color:"var(--m3-coral)"}];let o=0;return`
    <div style="position: relative; width: 120px; height: 120px; flex-shrink: 0; display: inline-flex; align-items: center; justify-content: center;">
      <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
        <g transform="rotate(-90 60 60)">${u.map(m=>{const x=m.val/d*p,y=Math.max(4,x-l),g=`<circle cx="60" cy="60" r="${n}" fill="none" stroke="${m.color}" stroke-width="11"
        stroke-linecap="round" stroke-dasharray="${y.toFixed(1)} ${p.toFixed(1)}"
        stroke-dashoffset="${(-o).toFixed(1)}" />`;return o+=x,g}).join("")}</g>
      </svg>
      <div style="position: absolute; text-align: center;">
        <div class="tabular" style="font-size: 20px; font-weight: 800; line-height: 1.05;">${Math.round(a)}%</div>
        <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Efficiency</div>
      </div>
    </div>
  `}const Te=[{key:"7d",label:"7D"},{key:"1m",label:"1M"},{key:"3m",label:"3M"},{key:"6m",label:"6M"},{key:"1y",label:"1Y"},{key:"all",label:"All ('22–'26)"}];function Ie(e,t,i){const s=e?.title||"Bench Press (Working Weight)",a=e?.current||"--",d=e?.delta||"Loading trajectory…",n=e?.summary||"2022–2026 longitudinal density",p=e?.insight||"Tap or drag across any regime to inspect exact dates, gaps, plateaus, and equipment shifts.",l=e?.key||"lift:bench-press",u=t.slice(0,22).map(y=>`
      <button
        type="button"
        class="m3-chip m3-carousel-item"
        id="chip-metric-${y.key.replace(/[^a-z0-9-]/gi,"-")}"
        data-metric-chip="${y.key}"
        data-sel="${y.key===l?"true":"false"}"
      >${D(y.label)}</button>
    `).join(""),o=Te.map(y=>`
      <button
        type="button"
        id="btn-hz-${y.key}"
        data-hz-btn="${y.key}"
        data-on="${i===y.key?"true":"false"}"
      >${y.label}</button>
    `).join(""),w=e?.monthly_density?.length?e.monthly_density:e?.density||[],m=e?.monthly_labels?.length?e.monthly_labels:e?.labels||[],x=w.slice(-56).map((y,g)=>{const S=m[g]||"";let h="var(--m3-surface-dim)";return y>=5?h="var(--m3-teal)":y>=3?h="hsla(170, 74%, 38%, 0.68)":y>=1&&(h="hsla(170, 64%, 44%, 0.36)"),`<div class="density-cell" title="${D(S)}: ${y} entries" style="background: ${h};"></div>`}).join("");return`
    <section id="trend-explorer-card" class="m3-seam" aria-label="Longitudinal Trajectory and Regime Explorer">
      <div class="m3-seam-top" style="padding: 15px 16px 12px 16px; display: flex; flex-direction: column; gap: 10px;">
        <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
          <div>
            <div style="font-size: 11px; font-weight: 800; color: var(--m3-teal); letter-spacing: 0.04em;">
              LONG-TERM PROGRESS • GAPS, PLATEAUS &amp; EQUIPMENT REGIMES
            </div>
            <div id="trend-metric-title" style="font-size: 17px; font-weight: 800; margin-top: 1px;">
              ${D(s)}
            </div>
          </div>

          <div class="m3-seg" role="group" aria-label="Time Horizon">
            ${o}
          </div>
        </div>

        <div id="trend-metric-chips" class="m3-carousel" style="gap: 6px;">
          ${u}
        </div>
      </div>

      <div class="m3-seam-mid" style="padding: 14px 16px;">
        <div style="display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 10px;">
          <div style="display: flex; align-items: baseline; gap: 8px; flex-wrap: wrap;">
            <span id="trend-current-val" class="tabular" style="font-size: 26px; font-weight: 800; letter-spacing: -0.02em;">
              ${D(a)}
            </span>
            <span id="trend-delta-badge" class="badge-trend tabular" style="background: var(--m3-teal-tint); color: var(--m3-on-teal);">
              ${D(d)}
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
            <span style="width: 12px; height: 3px; border-radius: 2px; background: var(--m3-teal);"></span>Primary Trajectory
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; border: 1px dashed var(--m3-gap-stroke); background: var(--m3-gap-fill); border-radius: 2px;"></span>No-Data Gap
          </span>
          <span style="display: inline-flex; align-items: center; gap: 5px;">
            <span style="width: 10px; height: 8px; background: var(--m3-plateau-fill); border-radius: 2px;"></span>Plateau Zone
          </span>
          ${e?.alt_series?.points?.length?`<span style="display: inline-flex; align-items: center; gap: 5px;">
                   <span style="width: 8px; height: 8px; border-radius: 999px; border: 2px solid var(--m3-amber);"></span>${D(e.alt_series.label)}
                 </span>`:""}
        </div>
      </div>

      <div class="m3-seam-bot" style="padding: 12px 16px 14px 16px; display: flex; flex-direction: column; gap: 8px;">
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 12px;">
          <span style="font-weight: 700;">Consistency Density ('22 → '26)</span>
          <span class="tabular" style="color: var(--m3-ink-2);">${D(n)}</span>
        </div>
        <div class="density-strip">
          ${x}
        </div>
        <div id="trend-insight-banner" style="background: var(--m3-surface-dim); border-radius: 14px; padding: 9px 12px; font-size: 12px; color: var(--m3-ink); display: flex; align-items: flex-start; gap: 8px;">
          <span style="color: var(--m3-teal); font-weight: 800;">◈</span>
          <span>${D(p)}</span>
        </div>
      </div>
    </section>
  `}function Oe(e,t,i){if(!e||!i||!i.series?.length)return;let s=null;const a=()=>{const n=e.getBoundingClientRect(),p=Math.max(260,n.width||360),l=Math.max(170,n.height||204),u=window.devicePixelRatio||1;e.width=Math.round(p*u),e.height=Math.round(l*u);const o=e.getContext("2d");if(!o)return;o.scale(u,u),o.clearRect(0,0,p,l);const w=document.getElementById("m3-app")||document.documentElement,m=getComputedStyle(w),x=m.getPropertyValue(i.color_token||"--m3-teal").trim()||"#0b7f6b",y=m.getPropertyValue("--m3-ink").trim()||"#11221f",g=m.getPropertyValue("--m3-ink-2").trim()||"#556b67",S=m.getPropertyValue("--m3-hairline").trim()||"rgba(0,0,0,0.1)",h=m.getPropertyValue("--m3-gap-fill").trim()||"rgba(40,60,55,0.07)",E=m.getPropertyValue("--m3-gap-stroke").trim()||"rgba(40,60,55,0.25)",H=m.getPropertyValue("--m3-plateau-fill").trim()||"rgba(215,100,20,0.11)",W=m.getPropertyValue("--m3-amber").trim()||"#d76214",A=m.getPropertyValue("--m3-surface").trim()||"#ffffff",T=36,I=14,$=18,ee=24,V=p-T-I,O=l-$-ee,G=[];if(i.series.forEach(c=>{c!=null&&!Number.isNaN(c)&&G.push(c)}),i.alt_series?.points?.forEach(c=>G.push(c.val)),i.optimal_high&&i.optimal_high>0&&G.push(i.optimal_high),!G.length)return;let j=Math.min(...G),Q=Math.max(...G);const fe=Math.max(1,Q-j);j=Math.max(0,j-fe*.14),Q=Q+fe*.16;const ge=Math.max(1,Q-j),B=i.series.length,F=c=>T+(B<=1?V/2:c/(B-1)*V),N=c=>$+O-(c-j)/ge*O;o.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="right";for(let c=0;c<=3;c++){const v=j+ge*c/3,z=N(v);o.strokeStyle=S,o.lineWidth=1,o.beginPath(),o.moveTo(T,z),o.lineTo(p-I,z),o.stroke(),o.fillStyle=g,o.fillText(v>=100?Math.round(v).toString():v.toFixed(v%1===0?0:1),T-5,z+3)}if(i.optimal_high&&i.optimal_high>j&&i.optimal_high<Q){const c=N(i.optimal_high);o.save(),o.setLineDash([4,4]),o.strokeStyle=x,o.lineWidth=1.3,o.beginPath(),o.moveTo(T,c),o.lineTo(p-I,c),o.stroke(),o.fillStyle=x,o.textAlign="left",o.fillText(`Optimal ≤ ${i.optimal_high}`,T+4,c-4),o.restore()}(i.no_data_gaps||[]).forEach(c=>{const v=F(Math.max(0,c.start_bucket-.35)),z=F(Math.min(B-1,c.end_bucket+.35)),P=Math.max(10,z-v);o.fillStyle=h,o.fillRect(v,$,P,O),o.save(),o.setLineDash([3,3]),o.strokeStyle=E,o.strokeRect(v,$,P,O),o.restore(),P>=34&&(o.fillStyle=g,o.font="700 9.5px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="center",o.fillText("No Data",v+P/2,$+O/2+3))}),(i.plateaus||[]).forEach(c=>{const v=F(Math.max(0,c.start_bucket)),z=F(Math.min(B-1,c.end_bucket)),P=Math.max(14,z-v),_e=N(c.level_value),oe=Math.max($,_e-16),Se=Math.min(32,$+O-oe);o.fillStyle=H,o.fillRect(v,oe,P,Se),P>=40&&(o.fillStyle=W,o.font="700 9.5px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="center",o.fillText("Plateau",v+P/2,Math.max($+10,oe-3)))});let le=-1,X=i.invert_good?1/0:-1/0,C=[];const ye=()=>{if(C.length){if(C.length>=2&&!i.sparse){const c=o.createLinearGradient(0,$,0,$+O);c.addColorStop(0,x.startsWith("hsl")?x.replace("hsl(","hsla(").replace(")",", 0.20)"):"rgba(11,127,107,0.18)"),c.addColorStop(1,"rgba(11,127,107,0.0)"),o.fillStyle=c,o.beginPath(),o.moveTo(C[0].x,$+O),C.forEach(v=>o.lineTo(v.x,v.y)),o.lineTo(C[C.length-1].x,$+O),o.closePath(),o.fill()}o.strokeStyle=x,o.lineWidth=2.6,o.lineCap="round",o.lineJoin="round",i.sparse&&o.setLineDash([4,3]),o.beginPath(),C.forEach((c,v)=>{v===0?o.moveTo(c.x,c.y):o.lineTo(c.x,c.y)}),o.stroke(),o.setLineDash([]),(i.sparse||C.length===1||B<=16)&&C.forEach(c=>{o.fillStyle=A,o.strokeStyle=x,o.lineWidth=2.2,o.beginPath(),o.arc(c.x,c.y,3.6,0,Math.PI*2),o.fill(),o.stroke()}),C=[]}};if(i.series.forEach((c,v)=>{if(c==null||Number.isNaN(c)){ye();return}const z=F(v),P=N(c);C.push({x:z,y:P}),(i.invert_good?c<X:c>X)&&(X=c,le=v)}),ye(),(i.alt_series?.points||[]).forEach(c=>{if(c.idx<0||c.idx>=B)return;const v=F(c.idx),z=N(c.val);o.fillStyle=A,o.strokeStyle=W,o.lineWidth=2.2,o.beginPath(),o.arc(v,z,4.3,0,Math.PI*2),o.fill(),o.stroke()}),le>=0&&Number.isFinite(X)){const c=F(le),v=N(X);o.fillStyle=x,o.beginPath(),o.arc(c,v,4.2,0,Math.PI*2),o.fill(),o.font="800 11px -apple-system, BlinkMacSystemFont, sans-serif",o.textAlign="center",o.fillText("★",c,Math.max(11,v-7))}o.fillStyle=g,o.font="600 10px -apple-system, BlinkMacSystemFont, sans-serif";const te=Math.min(6,B);for(let c=0;c<te;c++){const v=te===1?0:Math.round(c*(B-1)/(te-1)),z=i.labels[v]||"";o.textAlign=c===0?"left":c===te-1?"right":"center",o.fillText(z,F(v),l-6)}if(s!==null&&s>=0&&s<B){const c=F(s);o.save(),o.strokeStyle=y,o.lineWidth=1.2,o.setLineDash([3,3]),o.beginPath(),o.moveTo(c,$),o.lineTo(c,$+O),o.stroke(),o.restore();const v=i.series[s];if(v!=null){const z=N(v);o.fillStyle=x,o.strokeStyle=A,o.lineWidth=2.5,o.beginPath(),o.arc(c,z,5.2,0,Math.PI*2),o.fill(),o.stroke()}}},d=n=>{const p=e.getBoundingClientRect(),l=36,o=Math.max(1,p.width-l-14),w=Math.max(0,Math.min(1,(n-p.left-l)/o)),m=Math.round(w*Math.max(0,i.series.length-1));if(s=m,a(),t){const x=i.labels[m]||i.bucket_dates?.[m]||"",y=i.series[m],g=i.alt_series?.points?.find(h=>h.idx===m),S=i.density?.[m]??0;if(y==null)g?t.textContent=`${x} • ${g.val} ${i.unit} (${i.alt_series?.label||"Alt Equipment"})`:t.textContent=`${x} • Explicit No-Data Hiatus (0 sessions)`;else{const h=g?` + ${g.val} ${i.unit} Smith`:"";t.textContent=`${x} • ${y.toFixed(y%1===0?0:1)} ${i.unit}${h} (${S} entries)`}}};e.onmousemove=n=>d(n.clientX),e.onmouseleave=()=>{s=null,a(),t&&(t.textContent="Tap/drag chart to inspect plateaus, gaps & rebounds")},e.ontouchstart=n=>{n.touches[0]&&d(n.touches[0].clientX)},e.ontouchmove=n=>{n.touches[0]&&d(n.touches[0].clientX)},requestAnimationFrame(a)}function D(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Ce="autofit_offline_db",Pe=1,q="pending_workouts";function me(){return new Promise((e,t)=>{const i=indexedDB.open(Ce,Pe);i.onupgradeneeded=()=>{const s=i.result;s.objectStoreNames.contains(q)||s.createObjectStore(q,{keyPath:"id"})},i.onsuccess=()=>e(i.result),i.onerror=()=>t(i.error)})}function he(){return typeof crypto<"u"&&typeof crypto.randomUUID=="function"?crypto.randomUUID():`wk-${Date.now()}-${Math.random().toString(36).slice(2,9)}`}async function Ae(e){const t=await me();return new Promise((i,s)=>{const a=t.transaction(q,"readwrite"),d=a.objectStore(q),n={...e,queued_at:new Date().toISOString()};d.put(n),a.oncomplete=()=>{t.close(),i()},a.onerror=()=>{t.close(),s(a.error)}})}async function K(){try{const e=await me();return await new Promise((t,i)=>{const a=e.transaction(q,"readonly").objectStore(q).getAll();a.onsuccess=()=>{e.close(),t(a.result||[])},a.onerror=()=>{e.close(),i(a.error)}})}catch{return[]}}async function Be(e){if(!e.length)return;const t=await me();return new Promise((i,s)=>{const a=t.transaction(q,"readwrite"),d=a.objectStore(q);for(const n of e)d.delete(n);a.oncomplete=()=>{t.close(),i()},a.onerror=()=>{t.close(),s(a.error)}})}async function be(e,t=!1){if(!t&&navigator.onLine)try{return await L.logWorkout(e),{synced:!0,queuedCount:(await K()).length}}catch{}return await Ae(e),{synced:!1,queuedCount:(await K()).length}}async function ue(){const e=await K();if(!e.length||!navigator.onLine)return{flushed:0,remaining:e.length};try{const t=await L.syncWorkoutsBatch(e);t.workout_ids?.length&&await Be(t.workout_ids);const i=await K();return{flushed:t.synced,remaining:i.length}}catch{return{flushed:0,remaining:e.length}}}function Fe(e,t){if(!t)return"";const i=e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1],s=e.calibration?.readiness?.r2??.97;return`
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
          Update OLS Calibration Curve (R² = ${s.toFixed(2)}, n = ${e.calibration?.readiness?.samples||0})
        </button>
      </form>
    </section>
  `}function Re(e,t){if(!t)return"";const i=e.integrations?.google_health,s=e.integrations?.parity_scorecard,a=i?.status==="healthy"?"var(--m3-teal-tint)":i?.status==="expiring_soon"?"var(--m3-amber-tint)":"var(--m3-surface-dim)",d=i?.status==="healthy"?"var(--m3-on-teal)":i?.status==="expiring_soon"?"var(--m3-on-amber)":"var(--m3-ink-2)";return`
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
          ${i?.reconsent_auth_url?`<a href="${De(i.reconsent_auth_url)}" class="m3-btn-tonal" style="text-decoration: none; margin-top: 4px;">1-Click Weekly Re-Consent</a>`:'<button type="button" id="btn-trigger-sync" class="m3-pill" style="align-self: flex-start; margin-top: 2px;">Run Connector Poll</button>'}
        </div>

        <!-- 30-Day Shadow Parity Scorecard -->
        <div style="background: var(--m3-surface-dim); border-radius: 18px; padding: 12px 14px; display: flex; flex-direction: column; gap: 6px;">
          <div style="display: flex; align-items: center; justify-content: space-between;">
            <strong style="font-size: 13px;">Shadow Parity &amp; Provenance</strong>
            <span class="tabular" style="font-size: 11px; color: var(--m3-teal); font-weight: 800;">
              ${s?.sleep_agreement_pct??99.7}% Sleep Match
            </span>
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Steps Δ: ${s?.steps_delta_pct??.28}% • RHR Δ: ${s?.rhr_delta_bpm??0} bpm
          </div>
          <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
            Soft-superseded rows: <strong>${s?.superseded_records??0}</strong> • Outbound ledger: <strong>${s?.outbound_ledger_cnt??0}</strong>
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
  `}function De(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function qe(e,t){const i=t.trim().toLowerCase(),s=(e.key_lifts||[]).filter(l=>!i||l.name.toLowerCase().includes(i)||l.primary_muscle.toLowerCase().includes(i)||l.equipment.toLowerCase().includes(i)),a=e.recent_runs?.[0],d=a?.zone2_pace_sec_per_mi?`${Math.floor(a.zone2_pace_sec_per_mi/60)}:${String(Math.round(a.zone2_pace_sec_per_mi%60)).padStart(2,"0")}/mi`:"8:14/mi",n=a?.hr_zones_minutes||{z1:3,z2:14,z3:9,z4:5,z5:1},p=Math.max(1,(n.z1||0)+(n.z2||0)+(n.z3||0)+(n.z4||0)+(n.z5||0));return`
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
          ${s.slice(0,24).map(l=>`
              <div
                class="clickable-tile"
                data-open-metric="${R(l.metric_key)}"
                style="background: var(--m3-surface-dim); border-radius: 18px; padding: 11px 14px; display: flex; align-items: center; justify-content: space-between; gap: 10px;"
              >
                <div style="min-width: 0; flex: 1;">
                  <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                    <strong style="font-size: 14px;">${R(l.name)}</strong>
                    <span style="font-size: 11px; padding: 1px 7px; border-radius: 999px; background: var(--m3-surface); color: var(--m3-ink-2); font-weight: 600;">
                      ${R(l.primary_muscle)} • ${R(He(l.equipment))}
                    </span>
                  </div>
                  <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${R(l.narrative)} (${l.sessions} sessions)
                  </div>
                </div>

                <div style="display: flex; align-items: center; gap: 12px; flex-shrink: 0;">
                  ${se(l.sparkline||[],"var(--m3-teal)",74,24)}
                  <div style="text-align: right; min-width: 78px;">
                    <div class="tabular" style="font-size: 15px; font-weight: 800;">
                      ${l.current_val.toFixed(l.current_val%1===0?0:1)} ${R(l.unit)}
                    </div>
                    <div class="tabular" style="font-size: 11px; font-weight: 700; color: ${l.pct_gain>=0?"var(--m3-teal)":"var(--m3-coral)"};">
                      ${l.pct_gain>=0?"+":""}${l.pct_gain}% vs '22
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
            ${(a?.splits||[]).map(l=>`
                <div class="m3-carousel-item" style="background: var(--m3-surface-dim); border-radius: 16px; padding: 10px 13px; min-width: 116px;">
                  <div style="font-size: 11px; color: var(--m3-ink-2); font-weight: 700;">Mile ${l.mile}</div>
                  <div class="tabular" style="font-size: 17px; font-weight: 800; margin-top: 2px;">${R(l.pace_formatted)}</div>
                  <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); margin-top: 2px;">
                    ${l.avg_hr} bpm • ${l.avg_cadence||180} spm
                  </div>
                </div>
              `).join("")||'<div style="font-size: 12px; color: var(--m3-ink-2);">Click "Decode Sample .FIT" or upload a Garmin .FIT file to inspect mile splits.</div>'}
          </div>

          <!-- 5-Zone HR Distribution -->
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">
              <span>Heart Rate Zones (1Hz .FIT Record Stream)</span>
              <span class="tabular">Z2: ${n.z2||0}m • Z3: ${n.z3||0}m • Z4: ${n.z4||0}m</span>
            </div>
            <div style="display: flex; gap: 3px; height: 10px; border-radius: 999px; overflow: hidden;">
              <div style="flex: ${Math.max(1,(n.z1||0)/p*100)}; background: var(--m3-surface-hi);" title="Z1"></div>
              <div style="flex: ${Math.max(2,(n.z2||0)/p*100)}; background: var(--m3-teal);" title="Z2 Aerobic"></div>
              <div style="flex: ${Math.max(1,(n.z3||0)/p*100)}; background: var(--m3-blue);" title="Z3 Tempo"></div>
              <div style="flex: ${Math.max(1,(n.z4||0)/p*100)}; background: var(--m3-amber);" title="Z4 Threshold"></div>
              <div style="flex: ${Math.max(.5,(n.z5||0)/p*100)}; background: var(--m3-coral);" title="Z5 Anaerobic"></div>
            </div>
          </div>
        </div>
      </section>
    </div>
  `}function He(e){switch(e){case"olympic_bar":return"45 lb Barbell";case"smith":return"Smith Machine";case"dumbbell_pair":return"2× Dumbbells";case"sled":return"Leg Press Sled";case"cable":return"Cable Stack";case"machine":return"Machine";default:return e||"Standard"}}function R(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function je(e){const t=e.labs||[],i=e.body;return`
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
        ${t.map(s=>{const a=s.status.toLowerCase().includes("optimal"),d=a?"var(--m3-teal-tint)":"var(--m3-amber-tint)",n=a?"var(--m3-on-teal)":"var(--m3-on-amber)",p=(s.draws||[]).map(l=>l.value);return`
              <div
                class="m3-card clickable-tile"
                data-open-metric="${U(s.metric_key)}"
                style="padding: 14px 15px; display: flex; flex-direction: column; justify-content: space-between; gap: 8px;"
              >
                <div style="display: flex; align-items: flex-start; justify-content: space-between; gap: 6px;">
                  <div>
                    <div style="font-size: 14px; font-weight: 800;">${U(s.name)}</div>
                    <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">LOINC ${U(s.loinc_code)}</div>
                  </div>
                  <span style="font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 999px; background: ${d}; color: ${n};">
                    ${U(s.status)}
                  </span>
                </div>

                <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                  <div>
                    <span class="tabular" style="font-size: 24px; font-weight: 800;">
                      ${s.latest_value.toFixed(s.latest_value%1===0?0:1)}
                    </span>
                    <span style="font-size: 12px; color: var(--m3-ink-2); font-weight: 600;">${U(s.unit)}</span>
                  </div>
                  ${p.length>=2?se(p,"var(--m3-teal)",64,24):""}
                </div>

                <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                  Trail: ${U(s.history_text)} • Optimal ≤ ${s.optimal_high||s.ref_high}
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
  `}function U(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const Y={olympic_45:{label:"45 lb Barbell",equipment:"olympic_bar",tare:45,mode:"plates_per_side"},smith_20:{label:"20 lb Smith",equipment:"smith",tare:20,mode:"plates_per_side"},smith_15:{label:"15 lb Smith",equipment:"smith",tare:15,mode:"plates_per_side"},sled_125:{label:"125 lb Sled",equipment:"sled",tare:125,mode:"plates_per_side"},sled_118:{label:"118 lb Sled",equipment:"sled",tare:118,mode:"plates_per_side"},dumbbell_2x:{label:"2× Per-Hand DB",equipment:"dumbbell_pair",tare:0,mode:"per_hand"}};function ke(e,t){const i=Y[e]||Y.olympic_45,s=t.reduce((d,n)=>d+n,0);if(i.mode==="per_hand"){const d=s||40;return{displayLb:d,totalLb:d*2,formula:`=2*${d}`}}const a=i.tare+2*s;return{displayLb:a,totalLb:a,formula:`=${i.tare}+2*(${t.length?t.join("+"):"0"})`}}function Ne(e,t){const i=e.splits||[],s=i[t.selectedSplitIdx]||i[0],a=[...s?.items||[],...t.customItems],d=a.find(l=>l.slug===t.calcTargetSlug)||a[0],n=ke(t.calcEquipKey,t.calcPlatesPerSide),p=t.restSecondsLeft>0?`${Math.floor(t.restSecondsLeft/60)}:${String(t.restSecondsLeft%60).padStart(2,"0")}`:"Rest Timer";return`
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
                ${k(s?.title||"Push / Chest & Triceps")}
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
            ${i.map((l,u)=>`
                <button
                  type="button"
                  id="btn-split-${k(l.slug)}"
                  class="m3-chip m3-carousel-item"
                  data-split-idx="${u}"
                  data-sel="${u===t.selectedSplitIdx?"true":"false"}"
                >${k(l.title)}</button>
              `).join("")}
          </div>
        </div>

        <!-- Built-in 1-Tap Plate & Tare Calculator (Replaces =45+2*45 / =20+... / =125+... / =2*47.5!) -->
        <div class="m3-seam-bot" style="padding: 13px 16px; display: flex; flex-direction: column; gap: 9px;">
          <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 8px;">
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
              <strong style="font-size: 12px;">Plate &amp; Tare Calculator:</strong>
              <select id="select-calc-target" class="m3-input" style="width: auto; padding: 5px 10px; font-size: 12px;">
                ${a.map(l=>`<option value="${k(l.slug)}" ${l.slug===d?.slug?"selected":""}>${k(l.name)}</option>`).join("")}
              </select>
            </div>

            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tabular" style="font-size: 13px; font-weight: 800; color: var(--m3-teal);">
                ${n.formula} → ${n.totalLb.toFixed(1)} lb total
              </span>
              <button type="button" id="btn-apply-calc" class="m3-btn-tonal" style="padding: 5px 11px;">
                Apply to Card
              </button>
            </div>
          </div>

          <div class="m3-carousel" style="gap: 5px;">
            ${Object.entries(Y).map(([l,u])=>`
                <button
                  type="button"
                  class="m3-chip m3-carousel-item"
                  data-calc-equip="${l}"
                  data-sel="${t.calcEquipKey===l?"true":"false"}"
                >${k(u.label)}</button>
              `).join("")}
          </div>

          <div style="display: flex; flex-wrap: wrap; align-items: center; gap: 6px;">
            <span style="font-size: 11px; color: var(--m3-ink-2); font-weight: 600;">Add per side/hand:</span>
            ${[45,35,25,10,5,2.5].map(l=>`<button type="button" class="m3-pill tabular" data-add-plate="${l}" style="padding: 4px 10px;">+${l}</button>`).join("")}
            <button type="button" id="btn-clear-plates" class="m3-pill" style="padding: 4px 10px; color: var(--m3-coral);">
              Clear (${t.calcPlatesPerSide.length?t.calcPlatesPerSide.join("+"):"0"})
            </button>
          </div>
        </div>
      </section>

      <!-- Spacious Exercise Fast Cards -->
      <div style="display: flex; flex-direction: column; gap: 8px;">
        ${a.map(l=>{const u=t.weightOverrides[l.slug]??l.last_display_lb,o=t.repsOverrides[l.slug]??l.target_reps,w=t.equipOverrides[l.slug],m=w?.equipment||l.equipment,x=w?.tare??l.tare_lb,S=(w?.mode||l.load_mode)==="per_hand"||m==="dumbbell_pair"?"lb/hand":"lb",h=!!t.loggedSlugs[l.slug],E=t.expandedSlug===l.slug;return`
              <article
                class="m3-card"
                style="padding: 15px 16px; border: 1.5px solid ${h?"var(--m3-teal)":"transparent"}; display: flex; flex-direction: column; gap: 10px;"
              >
                <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap;">
                  <div style="min-width: 0; flex: 1;">
                    <div style="display: flex; align-items: center; gap: 7px; flex-wrap: wrap;">
                      <strong style="font-size: 15px;">${k(l.name)}</strong>
                      <span class="tabular" style="font-size: 11px; padding: 2px 8px; border-radius: 999px; background: var(--m3-surface-dim); font-weight: 700;">
                        ${l.target_sets} × ${o}
                      </span>
                      <button
                        type="button"
                        class="m3-pill"
                        data-open-metric="lift:${k(l.slug)}"
                        style="padding: 2px 8px; font-size: 11px; color: var(--m3-teal);"
                        title="Open 4-year trajectory for ${k(l.name)}"
                      >4y ›</button>
                    </div>
                    <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                      ${k(l.subtitle)}
                    </div>
                  </div>

                  <div style="display: flex; align-items: center; gap: 10px;">
                    ${se(l.sparkline||[],"var(--m3-teal)",64,22)}

                    <button
                      type="button"
                      class="m3-pill tabular"
                      data-expand-slug="${k(l.slug)}"
                      style="padding: 7px 11px; font-size: 13px; font-weight: 800;"
                      title="Adjust weight or reps"
                    >
                      ${u.toFixed(u%1===0?0:1)} ${S} ✎
                    </button>

                    <button
                      type="button"
                      id="btn-1tap-${k(l.slug)}"
                      data-log-lift="${k(l.slug)}"
                      class="${h?"m3-btn-tonal":"m3-btn-fill"}"
                      style="min-width: 98px;"
                    >
                      ${h?"✓ Logged":"1-Tap Log"}
                    </button>
                  </div>
                </div>

                ${E?`
                    <div style="padding-top: 10px; border-top: 1px solid var(--m3-hairline); display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: 10px;">
                      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                        <span style="font-size: 12px; font-weight: 700;">Working Weight (${S}):</span>
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(l.slug)}:-5">-5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(l.slug)}:-2.5">-2.5</button>
                        <input
                          type="number"
                          step="0.5"
                          value="${u}"
                          data-input-weight="${k(l.slug)}"
                          class="m3-input tabular"
                          style="width: 82px; text-align: center; padding: 6px;"
                        />
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(l.slug)}:2.5">+2.5</button>
                        <button type="button" class="m3-pill tabular" data-step-weight="${k(l.slug)}:5">+5</button>
                      </div>

                      <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="font-size: 12px; font-weight: 700;">Reps:</span>
                        <input
                          type="number"
                          step="1"
                          value="${o}"
                          data-input-reps="${k(l.slug)}"
                          class="m3-input tabular"
                          style="width: 64px; text-align: center; padding: 6px;"
                        />
                        <span class="tabular" style="font-size: 11px; color: var(--m3-ink-2);">
                          Equip: ${k(m)} ${x>0?`(${x} lb tare)`:""}
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
            ${(e.exercises||[]).map(l=>`<option value="${k(l.slug)}">${k(l.name)} (${k(l.primary_muscle)})</option>`).join("")}
          </select>
          <button type="button" id="btn-add-custom-exercise" class="m3-pill">Add Card</button>
        </div>

        <button type="button" id="btn-log-entire-split" class="m3-btn-fill" style="padding: 9px 18px;">
          Log Full Split Session (${a.length} Exercises)
        </button>
      </div>
    </div>
  `}function k(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function We(e){const t=e.sleep||{local_date:e.selected_date,efficiency_pct:92,deep_min:98,rem_min:108,light_min:248,awake_min:28,nadir_hr_bpm:47,nadir_time:"03:40 AM",bedtime_label:"11:08 PM – 6:52 AM",sleep_score_open:88},s=(e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1])?.sleep_score||t.sleep_score_open||88,a=(t.deep_min||96)+(t.rem_min||106)+(t.light_min||245),d=(t.deep_min||96)+(t.rem_min||106),n=Math.round(d/Math.max(1,a)*100),p=l=>`${Math.floor(l/60)}h ${String(l%60).padStart(2,"0")}m`;return`
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
              <span class="badge-trend tabular" style="background: var(--m3-blue-tint); color: var(--m3-on-blue);">Score ${Math.round(s)}</span>
            </div>
            <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2);">
              Restorative (Deep + REM): <strong>${p(d)} (${n}%)</strong> • Open Score: ${Math.round(t.sleep_score_open||87)}
            </div>
          </div>

          ${Ee(t.deep_min||96,t.rem_min||106,t.light_min||245,t.awake_min||26,t.efficiency_pct||92)}
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
  `}function de(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function Ve(e,t){const i=e.week_strip[e.selected_index]||e.week_strip[e.week_strip.length-1]||{date:e.selected_date,title:"Today",steps:0,distance_mi:0,total_kcal:0,azm:0,rhr:51,hrv:62,spo2:98,vo2:49,readiness:84,readiness_open:83,sleep_score:88,sleep_open:87,sleep_text:"7h 45m",cardio_load:412},s=1e4,a=45,d=e.recent_runs?.[0],n=e.recent_workouts?.[0],p=e.body,l=i.readiness>=80?"Optimal Recovery":i.readiness>=65?"Steady Baseline":"Prioritize Rest",u=i.sleep_score>=82?"Deep Restorative":"Solid Continuity";return`
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
                  of ${s.toLocaleString()} steps
                </div>
              </div>
              <div style="display: flex; align-items: baseline; gap: 6px;">
                <span class="tabular" style="font-size: 20px; font-weight: 800; color: var(--m3-amber);">${i.azm}</span>
                <span style="font-size: 12px; font-weight: 700; color: var(--m3-on-teal); opacity: 0.84;">Active Zone Min / ${a}</span>
              </div>
            </div>

            ${Le(i.steps/s,i.azm/a)}
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
                <div style="font-size: 12px; font-weight: 700;">${l}</div>
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
                <div class="tabular" style="font-size: 13px; font-weight: 800;">${Z(i.sleep_text)}</div>
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
                ${Z(d?.title||"Garmin Aerobic Run (.FIT)")}
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
                ${Z(n?.title||"Push / Chest & Triceps")}
              </div>
              <div class="tabular" style="font-size: 12px; color: var(--m3-ink-2); margin-top: 2px;">
                ${n?`${n.local_date} • ${n.sets?.length||0} working sets (${Z(n.source)})`:"Tap + Lift to log sets in 1 tap"}
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
  `}function Z(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}const r={theme:localStorage.getItem("autofit_theme")||"light",viewport:window.innerWidth<760?"mobile":"desktop",activeTab:"today",selectedDate:"",stepMode:"24h",liftQuery:"",calDrawerOpen:!1,syncDrawerOpen:!1,explorerOpen:!0,activeMetric:"lift:bench-press",activeHorizon:"all",bootstrap:null,trend:null,toastMessage:null,lift:{selectedSplitIdx:0,customItems:[],loggedSlugs:{},expandedSlug:null,weightOverrides:{},repsOverrides:{},equipOverrides:{},calcTargetSlug:null,calcEquipKey:"olympic_45",calcPlatesPerSide:[45,10,2.5],restSecondsLeft:0,simulateOffline:!1,queuedOfflineCount:0}};let pe=null,J=null;function f(e){r.toastMessage=e,b(),pe&&window.clearTimeout(pe),pe=window.setTimeout(()=>{r.toastMessage=null;const t=document.getElementById("m3-toast-banner");t&&t.remove()},3400)}function we(e){r.lift.restSecondsLeft=e,J&&window.clearInterval(J),b(),J=window.setInterval(()=>{if(r.lift.restSecondsLeft>0){if(r.lift.restSecondsLeft-=1,r.activeTab==="lift"){const t=document.getElementById("btn-rest-90");if(t){const i=r.lift.restSecondsLeft;t.textContent=i>0?`⏱ ${Math.floor(i/60)}:${String(i%60).padStart(2,"0")}`:"90s",t.setAttribute("data-on",i>0?"true":"false")}}r.lift.restSecondsLeft===0&&(J&&window.clearInterval(J),f("Rest complete — ready for next set!"))}},1e3)}async function _(e){try{const t=await L.getBootstrap(e||r.selectedDate||void 0);r.bootstrap=t,r.selectedDate=t.selected_date;const i=await K();r.lift.queuedOfflineCount=i.length,await ne(r.activeMetric,r.activeHorizon,!1),b()}catch(t){f(`Offline / cached mode: ${t.message}`),b()}}async function ne(e,t,i=!0){r.activeMetric=e,r.activeHorizon=t;try{r.trend=await L.getTrend(e,t)}catch{}i&&b()}function b(){const e=document.getElementById("m3-app");if(!e)return;e.setAttribute("data-mode",r.theme),e.setAttribute("data-viewport",r.viewport);const t=r.bootstrap;if(!t){e.innerHTML=`
      <div style="min-height: 100vh; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px;">
        <div style="width: 44px; height: 44px; border-radius: 14px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 20px;">✦</div>
        <strong style="font-size: 15px;">Loading Autofit SQLite Engine…</strong>
      </div>
    `;return}const i=t.week_strip[t.selected_index]||t.week_strip[t.week_strip.length-1],s=t.integrations?.google_health,a={today:i?.title||"Today",fitness:"Fitness & Lifts",sleep:"Sleep & Recovery",health:"Clinical Health",lift:"1-Tap Lift Logger"},d=(t.week_strip||[]).map((p,l)=>{const u=l===t.selected_index;return`
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
      `}).join("");let n="";switch(r.activeTab){case"today":n=Ve(t,r.stepMode);break;case"fitness":n=qe(t,r.liftQuery);break;case"sleep":n=We(t);break;case"health":n=je(t);break;case"lift":n=Ne(t,r.lift);break}e.innerHTML=`
    <!-- Top App & Viewport Bar -->
    <header class="preview-bar">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="background: var(--m3-teal-tint); color: var(--m3-on-teal); width: 24px; height: 24px; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; font-weight: 800;">✦</span>
        <strong style="font-size: 14px;">Autofit</strong>
        <span class="tabular" style="color: var(--m3-ink-2); font-weight: 600;">
          ${t.total_workouts} SQLite workouts
          ${r.lift.queuedOfflineCount>0?` • ${r.lift.queuedOfflineCount} offline queued`:""}
        </span>
      </div>

      <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
        <button type="button" id="btn-open-sync" class="m3-pill" style="padding: 5px 11px;">
          <span>⇄ Sync &amp; CSV</span>
          ${s?.status==="expiring_soon"?'<span style="color: var(--m3-amber);">●</span>':""}
        </button>

        <div class="m3-seg" role="group" aria-label="Viewport Mode">
          <button type="button" id="btn-vp-mobile" data-vp="mobile" data-on="${r.viewport==="mobile"?"true":"false"}">Mobile PWA</button>
          <button type="button" id="btn-vp-desktop" data-vp="desktop" data-on="${r.viewport==="desktop"?"true":"false"}">Desktop Web</button>
        </div>

        <button type="button" id="btn-theme-toggle" class="m3-pill" style="padding: 5px 11px;">
          <span>${r.theme==="light"?"☾ Dark":"☀ Light"}</span>
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
            style="width: 56px; height: 56px; border-radius: 18px; background: var(--m3-teal); color: var(--m3-canvas); display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; font-size: 12px; font-weight: 700;"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
            <span>Lift</span>
          </button>

          <nav style="display: flex; flex-direction: column; gap: 14px; width: 100%;">
            ${ie("today","Today",'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}
            ${ie("fitness","Fitness",'<path d="M3 17l5-5 4 4 8-9"/><path d="M16 7h4v4"/>')}
            ${ie("sleep","Sleep",'<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>')}
            ${ie("health","Health",'<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>')}
          </nav>
        </div>

        <div class="tabular" style="font-size: 11px; color: var(--m3-ink-2); text-align: center;">
          WAL Ready<br/>v0.1
        </div>
      </aside>

      <!-- Main Content Stage -->
      <main class="main-stage">
        <div class="stage-inner">
          <!-- Flush Google Health App Bar + 7-Day Ring Strip -->
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

              <h1 id="top-view-title" style="margin: 0; font-size: 16px; font-weight: 800; letter-spacing: -0.01em;">
                ${a[r.activeTab]}
              </h1>

              <div style="display: flex; align-items: center; gap: 6px;">
                <button
                  type="button"
                  id="btn-toggle-explorer"
                  class="m3-btn-tonal"
                  style="padding: 6px 11px;"
                >
                  ${r.explorerOpen?"Hide 4y Chart":"4y Trends"}
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

            <div id="week-strip" style="display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 3px;">
              ${d}
            </div>
          </div>

          ${Fe(t,r.calDrawerOpen)}
          ${Re(t,r.syncDrawerOpen)}

          ${r.explorerOpen?Ie(r.trend,t.metric_catalog||[],r.activeHorizon):""}

          ${n}
        </div>
      </main>

      <!-- Mobile Sticky Frosted Pill Dock + Squircle + Lift FAB -->
      <div id="m3-floating-dock" role="navigation" aria-label="Mobile Navigation">
        <div class="dock-pill">
          ${ae("today","Today")}
          ${ae("fitness","Fitness")}
          ${ae("sleep","Sleep")}
          ${ae("health","Health")}
        </div>
        <button type="button" id="dock-fab-lift" data-switch-tab="lift" class="dock-fab" aria-label="Log Lift">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>
          <span style="font-size: 10px;">Lift</span>
        </button>
      </div>
    </div>

    ${r.toastMessage?`<div id="m3-toast-banner" class="m3-toast" role="status">${Qe(r.toastMessage)}</div>`:""}
  `,$e(t),Ge(e,t)}function ie(e,t,i){return`
    <button type="button" id="rail-nav-${e}" data-switch-tab="${e}" data-active="${r.activeTab===e?"true":"false"}" class="rail-btn">
      <span class="rail-pill">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1">${i}</svg>
      </span>
      <span>${t}</span>
    </button>
  `}function ae(e,t){return`
    <button type="button" id="dock-nav-${e}" data-switch-tab="${e}" data-active="${r.activeTab===e?"true":"false"}" class="dock-tab">
      <span>${t}</span>
    </button>
  `}function $e(e){if(r.explorerOpen&&r.trend&&Oe(document.getElementById("longTermCanvas"),document.getElementById("trend-scrub-readout"),r.trend),r.activeTab==="today"){const t=document.getElementById("stepsCapsuleCanvas");if(r.stepMode==="24h"){const i=e.intraday?.hourly_steps||new Array(24).fill(0),s=i.map((a,d)=>d===0?"12a":d===6?"6a":d===12?"12p":d===18?"6p":d===23?"11p":"");re(t,i,s,"--m3-teal")}else{const i=(e.week_strip||[]).map(a=>a.steps),s=(e.week_strip||[]).map(a=>a.day_letter);re(t,i,s,"--m3-teal",1e4)}ze(document.getElementById("rhrMiniWaveCanvas"),e.intraday?.intraday_hr||[56,54,53,52,51,52,50],"--m3-coral")}if(r.activeTab==="sleep"){const t=e.intraday?.sleep_14d||[];re(document.getElementById("sleep14dCanvas"),t.map(i=>i.hours),t.map(i=>i.label),"--m3-blue",7.75)}}function Ge(e,t){document.getElementById("btn-theme-toggle")?.addEventListener("click",()=>{r.theme=r.theme==="light"?"dark":"light",localStorage.setItem("autofit_theme",r.theme),b()}),e.querySelectorAll("[data-vp]").forEach(s=>{s.addEventListener("click",()=>{const a=s.getAttribute("data-vp");a&&(r.viewport=a,b())})}),e.querySelectorAll("[data-switch-tab]").forEach(s=>{s.addEventListener("click",a=>{a.stopPropagation();const d=s.getAttribute("data-switch-tab");d&&(r.activeTab=d,b())})}),document.getElementById("btn-tune-scores")?.addEventListener("click",()=>{r.calDrawerOpen=!r.calDrawerOpen,b()}),document.getElementById("btn-close-cal")?.addEventListener("click",()=>{r.calDrawerOpen=!1,b()}),document.getElementById("btn-open-sync")?.addEventListener("click",()=>{r.syncDrawerOpen=!r.syncDrawerOpen,b()}),document.getElementById("btn-device-pill")?.addEventListener("click",()=>{r.syncDrawerOpen=!r.syncDrawerOpen,b()}),document.getElementById("btn-close-sync")?.addEventListener("click",()=>{r.syncDrawerOpen=!1,b()}),document.getElementById("btn-toggle-explorer")?.addEventListener("click",()=>{r.explorerOpen=!r.explorerOpen,b()}),e.querySelectorAll("[data-select-date]").forEach(s=>{s.addEventListener("click",()=>{const a=s.getAttribute("data-select-date");a&&_(a)})}),e.querySelectorAll("[data-open-metric]").forEach(s=>{s.addEventListener("click",a=>{const d=a.target;if(d!==s&&(d.tagName==="INPUT"||d.tagName==="BUTTON"||d.closest("form")))return;const n=s.getAttribute("data-open-metric");n&&(r.explorerOpen=!0,ne(n,r.activeHorizon,!0).then(()=>{document.getElementById("trend-explorer-card")?.scrollIntoView({behavior:"smooth",block:"nearest"})}))})}),e.querySelectorAll("[data-metric-chip]").forEach(s=>{s.addEventListener("click",()=>{const a=s.getAttribute("data-metric-chip");a&&ne(a,r.activeHorizon,!0)})}),e.querySelectorAll("[data-hz-btn]").forEach(s=>{s.addEventListener("click",()=>{const a=s.getAttribute("data-hz-btn");a&&ne(r.activeMetric,a,!0)})}),e.querySelectorAll("[data-step-mode]").forEach(s=>{s.addEventListener("click",()=>{r.stepMode=s.getAttribute("data-step-mode")||"24h",b()})}),document.getElementById("form-quick-weight")?.addEventListener("submit",async s=>{s.preventDefault();const a=document.getElementById("input-quick-weight"),d=parseFloat(a?.value||"");if(!d||d<60||d>500){f("Enter a valid body weight in lb");return}try{await L.logBody(d,t.body?.body_fat_pct,r.selectedDate),f(`Logged ${d.toFixed(1)} lb — EWMA & outbound ledger updated!`),await _(r.selectedDate)}catch(n){f(`Weight log failed: ${n.message}`)}}),document.getElementById("form-calibration")?.addEventListener("submit",async s=>{s.preventDefault();const a=parseFloat(document.getElementById("in-cal-r")?.value||"84"),d=parseFloat(document.getElementById("in-cal-s")?.value||"88"),n=parseFloat(document.getElementById("in-cal-c")?.value||"412");try{await L.saveCalibration(a,d,n,r.selectedDate),r.calDrawerOpen=!1,f("OLS Calibration curve updated!"),await _(r.selectedDate)}catch(p){f(`Calibration error: ${p.message}`)}}),document.getElementById("btn-trigger-sync")?.addEventListener("click",async()=>{try{await L.triggerSync(),f("Connector sync poll completed."),await _(r.selectedDate)}catch(s){f(`Sync note: ${s.message}`)}}),document.getElementById("form-xlsx-url")?.addEventListener("submit",async s=>{s.preventDefault();const a=document.getElementById("input-xlsx-url")?.value.trim();if(a)try{f("Importing 2022–2026 Google Sheet (.xlsx)…");const d=await L.importXLSXUrl(a);f(`Imported ${d.summary.workouts_imported||""} workouts cleanly!`),await _()}catch(d){f(`.xlsx import failed: ${d.message}`)}}),document.getElementById("input-xlsx-file")?.addEventListener("change",async s=>{const a=s.target.files?.[0];if(a)try{f(`Parsing ${a.name}…`);const d=await L.importXLSXFile(a);f(`Backfilled ${d.summary.workouts_imported||""} workouts!`),await _()}catch(d){f(`Upload error: ${d.message}`)}});const i=document.getElementById("input-filter-lifts");i&&i.addEventListener("input",()=>{r.liftQuery=i.value;const s=i.selectionStart||i.value.length;b();const a=document.getElementById("input-filter-lifts");a&&(a.focus(),a.setSelectionRange(s,s))}),document.getElementById("btn-sample-fit")?.addEventListener("click",async()=>{try{const s=await L.generateSampleFIT();f(`Decoded binary .FIT: ${s.activity.splits.length} mile splits • VDOT ${s.activity.vdot_open.toFixed(1)}`),await _(r.selectedDate)}catch(s){f(`.FIT decode error: ${s.message}`)}}),document.getElementById("input-fit-upload")?.addEventListener("change",async s=>{const a=s.target.files?.[0];if(a)try{const d=await L.importFITFile(a);f(`Imported ${a.name} • VDOT ${d.activity.vdot_open.toFixed(1)}`),await _(r.selectedDate)}catch(d){f(`.FIT upload failed: ${d.message}`)}}),document.getElementById("btn-load-sample-shlink")?.addEventListener("click",async()=>{try{const s=await L.getSampleSHLink(),a=document.getElementById("input-shlink-uri");a&&(a.value=s.shlink),f("Generated A256GCM encrypted shlink:/ — click Decrypt & Import!")}catch(s){f(`Sample shlink error: ${s.message}`)}}),document.getElementById("form-shlink-import")?.addEventListener("submit",async s=>{s.preventDefault();const a=document.getElementById("input-shlink-uri")?.value.trim();if(a)try{const d=await L.importMedical({shlink:a});f(`Decrypted JWE & imported ${d.observations_imported} FHIR R4 LOINC biomarkers!`),await _(r.selectedDate)}catch(d){f(`shlink:/ decrypt error: ${d.message}`)}}),document.getElementById("input-fhir-file")?.addEventListener("change",async s=>{const a=s.target.files?.[0];if(a)try{const d=await a.text(),n=await L.importMedical({fhir_json:JSON.parse(d)});f(`Imported ${n.observations_imported} FHIR R4 observations!`),await _(r.selectedDate)}catch(d){f(`FHIR JSON error: ${d.message}`)}}),document.getElementById("form-manual-lab")?.addEventListener("submit",async s=>{s.preventDefault();const a=document.getElementById("select-manual-biomarker")?.value,d=parseFloat(document.getElementById("input-manual-lab-val")?.value||"");if(!(!a||!d||d<=0))try{await L.importMedical({biomarker:a,value:d,local_date:r.selectedDate}),f(`Saved ${a}: ${d}`),await _(r.selectedDate)}catch(n){f(`Lab save error: ${n.message}`)}}),Ue(e,t)}function Ue(e,t){if(r.activeTab!=="lift")return;e.querySelectorAll("[data-split-idx]").forEach(n=>{n.addEventListener("click",()=>{r.lift.selectedSplitIdx=parseInt(n.getAttribute("data-split-idx")||"0",10),r.lift.customItems=[],r.lift.calcTargetSlug=null,b()})}),e.querySelectorAll("[data-rest-sec]").forEach(n=>{n.addEventListener("click",()=>{const p=parseInt(n.getAttribute("data-rest-sec")||"90",10);we(p)})}),document.getElementById("btn-toggle-offline-sim")?.addEventListener("click",()=>{r.lift.simulateOffline=!r.lift.simulateOffline,f(r.lift.simulateOffline?"Offline Gym Simulation ON: sets queue locally in IndexedDB!":"Back Online: flushing IndexedDB workout queue…"),r.lift.simulateOffline||ue().then(async n=>{r.lift.queuedOfflineCount=n.remaining,n.flushed>0?(f(`Synced ${n.flushed} queued offline workout(s) to SQLite!`),await _(r.selectedDate)):b()})}),document.getElementById("btn-flush-offline")?.addEventListener("click",async()=>{r.lift.simulateOffline=!1;const n=await ue();r.lift.queuedOfflineCount=n.remaining,f(`Flushed ${n.flushed} offline workout(s) to SQLite!`),await _(r.selectedDate)}),document.getElementById("select-calc-target")?.addEventListener("change",n=>{r.lift.calcTargetSlug=n.target.value,b()}),e.querySelectorAll("[data-calc-equip]").forEach(n=>{n.addEventListener("click",()=>{const p=n.getAttribute("data-calc-equip")||"olympic_45";r.lift.calcEquipKey=p,p==="dumbbell_2x"&&(r.lift.calcPlatesPerSide=[45]),b()})}),e.querySelectorAll("[data-add-plate]").forEach(n=>{n.addEventListener("click",()=>{const p=parseFloat(n.getAttribute("data-add-plate")||"0");p>0&&(r.lift.calcPlatesPerSide=[...r.lift.calcPlatesPerSide,p],b())})}),document.getElementById("btn-clear-plates")?.addEventListener("click",()=>{r.lift.calcPlatesPerSide=[],b()});const i=t.splits||[],s=i[r.lift.selectedSplitIdx]||i[0],a=[...s?.items||[],...r.lift.customItems];document.getElementById("btn-apply-calc")?.addEventListener("click",()=>{const n=a.find(u=>u.slug===r.lift.calcTargetSlug)||a[0];if(!n)return;const p=Y[r.lift.calcEquipKey]||Y.olympic_45,l=ke(r.lift.calcEquipKey,r.lift.calcPlatesPerSide);r.lift.weightOverrides[n.slug]=l.displayLb,r.lift.equipOverrides[n.slug]={equipment:p.equipment,tare:p.tare,mode:p.mode},f(`Applied ${l.formula} (${l.totalLb.toFixed(1)} lb) to ${n.name}`)}),e.querySelectorAll("[data-expand-slug]").forEach(n=>{n.addEventListener("click",()=>{const p=n.getAttribute("data-expand-slug");r.lift.expandedSlug=r.lift.expandedSlug===p?null:p,b()})}),e.querySelectorAll("[data-step-weight]").forEach(n=>{n.addEventListener("click",()=>{const[p,l]=(n.getAttribute("data-step-weight")||"").split(":"),u=a.find(w=>w.slug===p);if(!u)return;const o=r.lift.weightOverrides[p]??u.last_display_lb;r.lift.weightOverrides[p]=Math.max(0,o+parseFloat(l||"0")),b()})}),e.querySelectorAll("[data-input-weight]").forEach(n=>{n.addEventListener("change",()=>{const p=n.getAttribute("data-input-weight")||"",l=parseFloat(n.value);p&&!Number.isNaN(l)&&l>=0&&(r.lift.weightOverrides[p]=l,b())})}),e.querySelectorAll("[data-input-reps]").forEach(n=>{n.addEventListener("change",()=>{const p=n.getAttribute("data-input-reps")||"",l=parseInt(n.value,10);p&&l>0&&(r.lift.repsOverrides[p]=l,b())})});const d=(n,p)=>{const l=r.lift.weightOverrides[n.slug]??n.last_display_lb,u=r.lift.repsOverrides[n.slug]??n.target_reps,o=r.lift.equipOverrides[n.slug],w=o?.equipment||n.equipment,m=o?.tare??n.tare_lb,x=o?.mode||n.load_mode,y=x==="per_hand"||w==="dumbbell_pair",g=y?l*2:l,S=y?l:m>0&&g>=m?(g-m)/2:g,h=[];for(let E=0;E<n.target_sets;E++)h.push({exercise_id:n.exercise_id,exercise_slug:n.slug,exercise_name:n.name,set_index:p+E,equipment:w,tare_lb:m,load_mode:x,per_side_or_hand_lb:S,total_weight_lb:g,reps:u});return h};e.querySelectorAll("[data-log-lift]").forEach(n=>{n.addEventListener("click",async()=>{const p=n.getAttribute("data-log-lift")||"",l=a.find(w=>w.slug===p);if(!l)return;const u=d(l,1),o=await be({id:he(),local_date:r.selectedDate||t.anchor_date,split_id:s?.id,title:`${s?.title||"Gym"} — ${l.name}`,sets:u},r.lift.simulateOffline);r.lift.loggedSlugs[p]=!0,r.lift.queuedOfflineCount=o.queuedCount,we(90),o.synced?(f(`Logged ${l.target_sets}× sets of ${l.name} to SQLite!`),await _(r.selectedDate)):f(`Queued ${l.name} offline in IndexedDB (${o.queuedCount} pending)!`)})}),document.getElementById("btn-add-custom-exercise")?.addEventListener("click",()=>{const p=document.getElementById("select-add-exercise")?.value||"";if(!p)return;const l=(t.exercises||[]).find(u=>u.slug===p);if(l){if(a.some(u=>u.slug===p)){f(`${l.name} is already in this session.`);return}r.lift.customItems.push({exercise_id:l.id,slug:l.slug,name:l.name,primary_muscle:l.primary_muscle,equipment:l.default_equipment,tare_lb:l.default_tare_lb,load_mode:l.load_mode,target_sets:l.default_sets||4,target_reps:l.default_reps||10,scheme:`${l.default_sets||4} × ${l.default_reps||10}`,last_display_lb:l.default_equipment==="olympic_bar"?135:35,last_total_lb:l.default_equipment==="olympic_bar"?135:70,subtitle:`Added from catalog • ${l.default_equipment}`,sparkline:[]}),b()}}),document.getElementById("btn-log-entire-split")?.addEventListener("click",async()=>{if(!a.length)return;const n=[];a.forEach(l=>{n.push(...d(l,n.length+1)),r.lift.loggedSlugs[l.slug]=!0});const p=await be({id:he(),local_date:r.selectedDate||t.anchor_date,split_id:s?.id,title:s?.title||"Full Split Session",sets:n},r.lift.simulateOffline);r.lift.queuedOfflineCount=p.queuedCount,p.synced?(f(`Saved ${n.length} sets (${s?.title}) to SQLite!`),await _(r.selectedDate)):f(`Saved ${n.length} sets to IndexedDB offline queue!`)})}function Qe(e){return String(e||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}"serviceWorker"in navigator&&window.addEventListener("load",()=>{navigator.serviceWorker.register("/sw.js").catch(()=>{})});window.addEventListener("online",()=>{r.lift.simulateOffline||ue().then(async e=>{r.lift.queuedOfflineCount=e.remaining,e.flushed>0&&(f(`Synced ${e.flushed} offline workout(s) to SQLite!`),await _(r.selectedDate))})});let ce=null;window.addEventListener("resize",()=>{ce&&window.clearTimeout(ce),ce=window.setTimeout(()=>{r.bootstrap&&$e(r.bootstrap)},120)});_();
