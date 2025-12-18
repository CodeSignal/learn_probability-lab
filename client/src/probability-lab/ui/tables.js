// Table HTML builders
import { formatCount, formatProbability, formatSignedProbability } from '../../shared/format.js';

export function buildFrequencyTableHtml(def, counts, trials, selectedIndices) {
  const header = `
    <thead>
      <tr>
        <th>Outcome</th>
        <th class="pl-num">P(theory)</th>
        <th class="pl-num">Count</th>
        <th class="pl-num">Rel. freq</th>
        <th class="pl-num">Δ</th>
      </tr>
    </thead>
  `;

  const rows = def.labels
    .map((label, i) => {
      const count = counts[i] ?? 0;
      const est = trials > 0 ? count / trials : null;
      const p = def.probabilities[i] ?? 0;
      const diff = est === null ? null : est - p;
      const selectedClass = selectedIndices.has(i) ? 'pl-selected-row' : '';
      return `
        <tr class="${selectedClass}">
          <td>${label}</td>
          <td class="pl-num">${formatProbability(p, 1)}</td>
          <td class="pl-num">${formatCount(count)}</td>
          <td class="pl-num">${est === null ? '—' : formatProbability(est, 1)}</td>
          <td class="pl-num">${diff === null ? '—' : formatSignedProbability(diff, 1)}</td>
        </tr>
      `;
    })
    .join('');

  const body = `<tbody>${rows}</tbody>`;
  return `${header}${body}`;
}

export function buildTwoWayTableHtml(defA, defB, joint, countsA, countsB, trials, selectedCell) {
  const cols = defB.labels.length;
  const headerCols = defB.labels.map((l) => `<th class="pl-num">${l}</th>`).join('');
  const head = `
    <thead>
      <tr>
        <th>Event A \\ Event B</th>
        ${headerCols}
        <th class="pl-num">Total</th>
      </tr>
    </thead>
  `;

  const bodyRows = defA.labels
    .map((rowLabel, r) => {
      const rowCounts = joint[r] ?? [];
      const cells = Array.from({ length: cols }, (_, c) => {
        const count = rowCounts[c] ?? 0;
        const selected = selectedCell && selectedCell.r === r && selectedCell.c === c ? 'pl-selected-row' : '';
        return `<td class="pl-num ${selected}" data-row="${r}" data-col="${c}">${formatCount(count)}</td>`;
      }).join('');
      const rowTotal = countsA[r] ?? 0;
      return `
        <tr>
          <td>${rowLabel}</td>
          ${cells}
          <td class="pl-num"><strong>${formatCount(rowTotal)}</strong></td>
        </tr>
      `;
    })
    .join('');

  const footerCells = Array.from({ length: cols }, (_, c) => `<td class="pl-num"><strong>${formatCount(countsB[c] ?? 0)}</strong></td>`).join('');

  const footer = `
    <tfoot>
      <tr>
        <td><strong>Total</strong></td>
        ${footerCells}
        <td class="pl-num"><strong>${formatCount(trials)}</strong></td>
      </tr>
    </tfoot>
  `;

  return `${head}<tbody>${bodyRows}</tbody>${footer}`;
}

