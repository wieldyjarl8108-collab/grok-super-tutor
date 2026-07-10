/**
 * Paper sketch → real blueprint plan canvas + build partner panel
 */

export function drawBlueprint(canvas, plan) {
  if (!canvas || !plan) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width = canvas.clientWidth || 640;
  const H = canvas.height = canvas.clientHeight || 400;
  ctx.fillStyle = '#f4f1e8';
  ctx.fillRect(0, 0, W, H);

  // Grid like drafting paper
  ctx.strokeStyle = 'rgba(30, 64, 120, 0.12)';
  ctx.lineWidth = 1;
  const step = 20;
  for (let x = 0; x < W; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
  }
  for (let y = 0; y < H; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const rooms = plan.rooms || [];
  let maxX = 20;
  let maxY = 20;
  for (const r of rooms) {
    maxX = Math.max(maxX, (r.x || 0) + (r.w || 0));
    maxY = Math.max(maxY, (r.y || 0) + (r.h || 0));
  }
  for (const w of plan.walls || []) {
    maxX = Math.max(maxX, w.x1 || 0, w.x2 || 0);
    maxY = Math.max(maxY, w.y1 || 0, w.y2 || 0);
  }
  const pad = 48;
  const scale = Math.min((W - pad * 2) / Math.max(maxX, 1), (H - pad * 2) / Math.max(maxY, 1));
  const ox = pad;
  const oy = pad;

  const tx = (x) => ox + x * scale;
  const ty = (y) => oy + y * scale;

  // Title block
  ctx.fillStyle = '#0f172a';
  ctx.font = 'bold 14px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(plan.title || 'FLOOR PLAN — EDUCATIONAL', 16, 22);
  ctx.font = '11px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#334155';
  ctx.fillText(`Scale: ${plan.scale || 'approx from sketch'} · ${plan.north ? 'N ' + plan.north : 'N↑'}`, 16, 38);
  if (plan.overall_ft) {
    ctx.fillText(
      `Overall ≈ ${plan.overall_ft.length || '?'} × ${plan.overall_ft.width || '?'} ft`,
      16,
      52,
    );
  }

  // Rooms
  for (const r of rooms) {
    const x = tx(r.x || 0);
    const y = ty(r.y || 0);
    const w = (r.w || 1) * scale;
    const h = (r.h || 1) * scale;
    ctx.fillStyle = 'rgba(191, 219, 254, 0.35)';
    ctx.strokeStyle = '#1e3a5f';
    ctx.lineWidth = 2;
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
    const label = r.name || 'Room';
    ctx.fillText(label, x + 6, y + 16);
    ctx.font = '10px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`${(r.w || 0).toFixed(1)}×${(r.h || 0).toFixed(1)} ft`, x + 6, y + 30);
  }

  // Explicit walls (thicker exterior)
  for (const wall of plan.walls || []) {
    ctx.beginPath();
    ctx.moveTo(tx(wall.x1), ty(wall.y1));
    ctx.lineTo(tx(wall.x2), ty(wall.y2));
    ctx.strokeStyle = wall.exterior ? '#0f172a' : '#334155';
    ctx.lineWidth = wall.exterior ? 4 : 2;
    ctx.stroke();
  }

  // Doors / windows
  ctx.fillStyle = '#b45309';
  for (const d of plan.doors || []) {
    ctx.beginPath();
    ctx.arc(tx(d.x), ty(d.y), 5, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#0284c7';
  for (const w of plan.windows || []) {
    ctx.fillRect(tx(w.x) - 6, ty(w.y) - 2, 12, 4);
  }

  // Border stamp
  ctx.strokeStyle = '#1e3a5f';
  ctx.lineWidth = 2;
  ctx.strokeRect(8, 8, W - 16, H - 16);
  ctx.font = '10px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('EDUCATIONAL DRAFT — NOT A PERMIT SET / NOT PE STAMPED', 16, H - 14);
}

export function renderBuildPlan(el, blueprint) {
  if (!el) return;
  if (!blueprint) {
    el.innerHTML = '<p class="sub">Snap a paper house sketch to generate a blueprint and full build plan.</p>';
    return;
  }

  const plan = blueprint.buildPlan || {};
  const phases = plan.phases || [];
  const bom = blueprint.bom || [];
  const subs = blueprint.subcontract || [];
  const research = blueprint.research;
  const reading = blueprint.sketchReading;

  let html = '';
  if (reading?.what_i_see) {
    html += `<div class="bp-card"><h4>What Grok saw</h4><p>${esc(reading.what_i_see)}</p>
      <p class="sub">Rooms: ${(reading.rooms || []).map(esc).join(', ') || '—'} · Stories: ${reading.stories ?? '—'} · Confidence: ${esc(reading.confidence || '—')}</p></div>`;
  }

  html += `<div class="bp-card"><h4>Build plan · clay to roof</h4>`;
  if (plan.total_est_usd_low != null) {
    html += `<p class="bp-total">Ballpark total: <strong>$${fmt(plan.total_est_usd_low)} – $${fmt(plan.total_est_usd_high)}</strong>
      <span class="sub">${esc(plan.region_note || 'Educational range')}</span></p>`;
  }
  html += `<ol class="bp-phases">`;
  for (const p of phases.sort((a, b) => (a.order || 0) - (b.order || 0))) {
    html += `<li>
      <strong>${esc(p.name || p.id)}</strong>
      <span class="pill soft">${esc(p.diy_or_sub || 'TBD')}</span>
      <p class="sub">${esc(p.description || '')}</p>
      <p class="sub">Trades: ${(p.trades || []).map(esc).join(', ') || '—'} · ~${p.est_days ?? '?'} days · $${fmt(p.est_cost_usd_low)}–$${fmt(p.est_cost_usd_high)}</p>
      <p class="sub">Materials: ${(p.materials || []).map(esc).join('; ') || '—'}</p>
    </li>`;
  }
  html += `</ol></div>`;

  if (bom.length) {
    html += `<div class="bp-card"><h4>Bill of materials</h4>
      <div class="bp-table-wrap"><table class="bp-table"><thead><tr>
        <th>Item</th><th>Qty</th><th>Unit</th><th>$/u</th><th>Total</th><th>Phase</th>
      </tr></thead><tbody>`;
    for (const row of bom) {
      html += `<tr>
        <td>${esc(row.item || row.material)}</td>
        <td>${row.qty ?? ''}</td>
        <td>${esc(row.unit || '')}</td>
        <td>${row.unit_cost_usd != null ? '$' + fmt(row.unit_cost_usd) : '—'}</td>
        <td>${row.total_usd != null ? '$' + fmt(row.total_usd) : '—'}</td>
        <td>${esc(row.phase || '')}</td>
      </tr>`;
    }
    html += `</tbody></table></div></div>`;
  }

  if (subs.length) {
    html += `<div class="bp-card"><h4>Sub out / find contractors</h4><ul class="bp-subs">`;
    for (const s of subs) {
      html += `<li><strong>${esc(s.trade)}</strong> — ${esc(s.scope || '')}
        <p class="sub">${esc(s.why_sub || '')}</p>
        <p class="sub">Search: <code>${esc(s.search_query || s.trade + ' contractor near me')}</code></p>
      </li>`;
    }
    html += `</ul></div>`;
  }

  if (research) {
    html += `<div class="bp-card research"><h4>Live research</h4><p>${esc(research.message || '')}</p>`;
    if (research.price_checks?.length) {
      html += `<h5>Price checks</h5><ul>`;
      for (const p of research.price_checks) {
        html += `<li><strong>${esc(p.item)}</strong>: $${fmt(p.price_low_usd)}–$${fmt(p.price_high_usd)} / ${esc(p.unit || '')}
          <span class="sub"> — ${esc(p.source_note || '')} ${esc(p.url_or_vendor || '')}</span></li>`;
      }
      html += `</ul>`;
    }
    if (research.contractors?.length) {
      html += `<h5>Contractors</h5>`;
      for (const c of research.contractors) {
        html += `<div class="bp-contractor"><strong>${esc(c.trade)}</strong>
          <p class="sub">${esc(c.how_to_find || '')}</p>
          <p class="sub">Queries: ${(c.search_queries || []).map((q) => `<code>${esc(q)}</code>`).join(' ')}</p>
          <p class="sub">Ask: ${(c.questions_to_ask || []).map(esc).join(' · ')}</p>
          <p class="sub">Red flags: ${(c.red_flags || []).map(esc).join(' · ')}</p>
        </div>`;
      }
    }
    if (research.links?.length) {
      html += `<h5>Links</h5><ul>`;
      for (const l of research.links) {
        const url = l.url && /^https?:/i.test(l.url) ? l.url : null;
        html += `<li>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener">${esc(l.title || url)}</a>` : esc(l.title || '')}
          <span class="sub"> — ${esc(l.why || '')}</span></li>`;
      }
      html += `</ul>`;
    }
    if (research.next_steps?.length) {
      html += `<h5>Next steps</h5><ol>${research.next_steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>`;
    }
    html += `</div>`;
  }

  const discs = blueprint.disclaimers || [];
  if (discs.length) {
    html += `<div class="bp-disclaimers">${discs.map((d) => `<p class="sub">⚠️ ${esc(d)}</p>`).join('')}</div>`;
  }

  el.innerHTML = html;
}

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmt(n) {
  const x = Number(n);
  if (!Number.isFinite(x)) return '—';
  return x >= 1000 ? Math.round(x).toLocaleString() : (Math.round(x * 100) / 100).toString();
}

/**
 * Capture still from video element as JPEG data URL
 */
export function captureFrame(videoEl, maxSide = 1280) {
  if (!videoEl || videoEl.readyState < 2) return null;
  const vw = videoEl.videoWidth || 640;
  const vh = videoEl.videoHeight || 480;
  const scale = Math.min(1, maxSide / Math.max(vw, vh));
  const c = document.createElement('canvas');
  c.width = Math.round(vw * scale);
  c.height = Math.round(vh * scale);
  const ctx = c.getContext('2d');
  ctx.drawImage(videoEl, 0, 0, c.width, c.height);
  return c.toDataURL('image/jpeg', 0.85);
}

export async function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}
