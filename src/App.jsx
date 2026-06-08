import { useState, useEffect, useRef, useMemo } from 'react';
import * as d3 from 'd3';
import { Play, Pause, RotateCcw, Plus, X, UserPlus, ChevronDown, SlidersHorizontal } from 'lucide-react';

// ─── Design tokens ──────────────────────────────────────────────────────────
const PALETTE = {
  bg: '#f4f4f3',
  surface: '#ffffff',
  border: '#e6e6e3',
  borderDashed: '#d3d3cf',
  ink: '#1a1a1c',
  muted: '#71716e',
  mutedLight: '#9c9c98',
  accent: '#4f46e5',
};

const PERSON_COLORS = [
  '#4f46e5', '#e11d48', '#059669', '#d97706',
  '#0284c7', '#7c3aed', '#0d9488', '#64748b',
];

// ─── Helpers ────────────────────────────────────────────────────────────────
const yearsBetween = (d1, d2) =>
  (new Date(d2) - new Date(d1)) / (365.25 * 86400 * 1000);

const addYears = (dateStr, years) => {
  const d = new Date(dateStr);
  return new Date(d.getTime() + years * 365.25 * 86400 * 1000);
};

const toISODate = (d) =>
  (d instanceof Date ? d : new Date(d)).toISOString().split('T')[0];

// ─── Sample data: a family ──────────────────────────────────────────────────
const SAMPLE_DATA = [
  {
    id: 'p1', name: 'Hélène', birthDate: '1985-03-12', color: '#4f46e5',
    measurements: [
      { date: '1986-03-12', height: 74 },
      { date: '1988-06-15', height: 95 },
      { date: '1991-09-01', height: 118 },
      { date: '1994-09-01', height: 135 },
      { date: '1997-09-01', height: 152 },
      { date: '2000-06-15', height: 163 },
      { date: '2003-09-01', height: 167 },
      { date: '2025-01-01', height: 168 },
    ],
  },
  {
    id: 'p2', name: 'Julien', birthDate: '1983-08-22', color: '#e11d48',
    measurements: [
      { date: '1984-08-22', height: 77 },
      { date: '1987-08-22', height: 102 },
      { date: '1990-09-01', height: 124 },
      { date: '1993-09-01', height: 142 },
      { date: '1996-09-01', height: 162 },
      { date: '1999-09-01', height: 178 },
      { date: '2002-09-01', height: 183 },
      { date: '2025-01-01', height: 184 },
    ],
  },
  {
    id: 'p3', name: 'Léa', birthDate: '2012-06-04', color: '#059669',
    measurements: [
      { date: '2013-06-04', height: 75 },
      { date: '2015-06-04', height: 98 },
      { date: '2018-09-01', height: 124 },
      { date: '2021-09-01', height: 144 },
      { date: '2024-09-01', height: 158 },
      { date: '2026-04-01', height: 162 },
    ],
  },
  {
    id: 'p4', name: 'Sacha', birthDate: '2015-11-18', color: '#d97706',
    measurements: [
      { date: '2016-11-18', height: 76 },
      { date: '2018-11-18', height: 92 },
      { date: '2020-09-01', height: 110 },
      { date: '2023-09-01', height: 128 },
      { date: '2026-04-01', height: 142 },
    ],
  },
];

// ─── Chart ──────────────────────────────────────────────────────────────────
function GrowthChart({ people, mode, progress, title, subtitle, ageRange }) {
  const svgRef = useRef(null);
  const containerRef = useRef(null);
  const [width, setWidth] = useState(640);

  useEffect(() => {
    if (!containerRef.current) return;
    const update = () => {
      if (containerRef.current) {
        setWidth(Math.max(280, containerRef.current.clientWidth));
      }
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const height = 360;
  const margin = { top: 32, right: 78, bottom: 40, left: 44 };
  const iw = Math.max(80, width - margin.left - margin.right);
  const ih = height - margin.top - margin.bottom;

  const personData = useMemo(() => {
    return people.map((p) => ({
      ...p,
      points: p.measurements
        .map((m) => ({
          xRaw: new Date(m.date),
          xAge: yearsBetween(p.birthDate, m.date),
          y: m.height,
        }))
        .filter((pt) => pt.xAge >= ageRange.min && pt.xAge <= ageRange.max)
        .sort((a, b) => a.xRaw - b.xRaw),
    }));
  }, [people, ageRange]);

  const [xDomain, yDomain] = useMemo(() => {
    const hasPoints = personData.some((p) => p.points.length > 0);
    if (!hasPoints) {
      return mode === 'age'
        ? [[ageRange.min, ageRange.max], [40, 200]]
        : [[new Date('2000-01-01'), new Date()], [40, 200]];
    }

    let xMin, xMax;
    if (mode === 'age') {
      xMin = ageRange.min;
      xMax = ageRange.max;
    } else {
      const allDates = personData.flatMap((p) => p.points.map((pt) => pt.xRaw));
      xMin = d3.min(allDates);
      xMax = d3.max(allDates);
      const range = xMax - xMin;
      xMin = new Date(xMin.getTime() - range * 0.02);
      xMax = new Date(xMax.getTime() + range * 0.02);
    }

    const allH = personData.flatMap((p) => p.points.map((pt) => pt.y));
    const yMin = Math.max(0, Math.floor(d3.min(allH) / 10) * 10 - 5);
    const yMax = Math.ceil(d3.max(allH) / 10) * 10 + 5;

    return [[xMin, xMax], [yMin, yMax]];
  }, [personData, mode, ageRange]);

  const xScale = useMemo(() => {
    if (mode === 'age') return d3.scaleLinear().domain(xDomain).range([0, iw]);
    return d3.scaleTime().domain(xDomain).range([0, iw]);
  }, [xDomain, mode, iw]);

  const yScale = useMemo(
    () => d3.scaleLinear().domain(yDomain).range([ih, 0]),
    [yDomain, ih]
  );

  const cutoff = useMemo(() => {
    if (mode === 'age') {
      return xDomain[0] + (xDomain[1] - xDomain[0]) * progress;
    }
    const t0 = xDomain[0].getTime();
    const t1 = xDomain[1].getTime();
    return new Date(t0 + (t1 - t0) * progress);
  }, [xDomain, progress, mode]);

  const visibleByPerson = useMemo(() => {
    return personData.map((person) => {
      const xKey = mode === 'age' ? 'xAge' : 'xRaw';
      const xValOf = mode === 'age' ? (v) => v : (v) => v.getTime();
      const cutoffVal = mode === 'age' ? cutoff : cutoff.getTime();

      const visible = [];
      for (let i = 0; i < person.points.length; i++) {
        const pt = person.points[i];
        const ptX = xValOf(pt[xKey]);
        if (ptX <= cutoffVal) {
          visible.push({ x: pt[xKey], y: pt.y, isReal: true });
        } else {
          if (i > 0) {
            const prev = person.points[i - 1];
            const prevX = xValOf(prev[xKey]);
            if (cutoffVal > prevX && ptX > prevX) {
              const t = (cutoffVal - prevX) / (ptX - prevX);
              const interpY = prev.y + (pt.y - prev.y) * t;
              const interpX = mode === 'age' ? cutoffVal : new Date(cutoffVal);
              visible.push({ x: interpX, y: interpY, isReal: false });
            }
          }
          break;
        }
      }
      return { ...person, visible };
    });
  }, [personData, cutoff, mode]);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    // Horizontal grid
    g.append('g')
      .selectAll('line')
      .data(yScale.ticks(6))
      .enter()
      .append('line')
      .attr('x1', 0).attr('x2', iw)
      .attr('y1', (d) => yScale(d)).attr('y2', (d) => yScale(d))
      .attr('stroke', PALETTE.border)
      .attr('stroke-width', 1)
      .attr('stroke-dasharray', '2,4');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(6).tickSize(0).tickPadding(8))
      .call((g) => g.select('.domain').remove())
      .selectAll('text')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '10px')
      .attr('fill', PALETTE.muted);

    g.append('text')
      .attr('x', -margin.left + 6).attr('y', -14)
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '9px').attr('font-weight', 700)
      .attr('letter-spacing', '0.12em')
      .attr('fill', PALETTE.muted)
      .text('CM');

    // X axis
    const xAxis = mode === 'age'
      ? d3.axisBottom(xScale)
          .ticks(Math.min(10, Math.max(4, Math.floor(iw / 70))))
          .tickFormat((d) => `${d} an${d !== 1 ? 's' : ''}`)
          .tickSize(4)
      : d3.axisBottom(xScale)
          .ticks(Math.min(8, Math.max(3, Math.floor(iw / 80))))
          .tickFormat(d3.timeFormat('%Y'))
          .tickSize(4);

    g.append('g')
      .attr('transform', `translate(0, ${ih})`)
      .call(xAxis)
      .call((g) => g.select('.domain').attr('stroke', PALETTE.borderDashed))
      .selectAll('text')
      .attr('font-family', 'Inter, sans-serif')
      .attr('font-size', '10px')
      .attr('fill', PALETTE.muted);

    g.selectAll('.tick line').attr('stroke', PALETTE.borderDashed);

    // Lines
    const line = d3.line()
      .x((d) => xScale(d.x))
      .y((d) => yScale(d.y))
      .curve(d3.curveMonotoneX);

    // Sort by final visible Y so labels stack predictably
    const sortedForLabels = [...visibleByPerson]
      .filter((p) => p.visible.length > 0)
      .sort((a, b) => b.visible[b.visible.length - 1].y - a.visible[a.visible.length - 1].y);

    visibleByPerson.forEach((person) => {
      if (person.visible.length === 0) return;

      if (person.visible.length >= 2) {
        g.append('path')
          .datum(person.visible)
          .attr('fill', 'none')
          .attr('stroke', person.color)
          .attr('stroke-width', 2.25)
          .attr('stroke-linecap', 'round')
          .attr('stroke-linejoin', 'round')
          .attr('d', line);
      }

      person.visible
        .filter((p) => p.isReal)
        .forEach((pt) => {
          g.append('circle')
            .attr('cx', xScale(pt.x))
            .attr('cy', yScale(pt.y))
            .attr('r', 3.5)
            .attr('fill', PALETTE.surface)
            .attr('stroke', person.color)
            .attr('stroke-width', 1.8);
        });
    });

    // Labels with simple anti-overlap
    let lastLabelY = -Infinity;
    sortedForLabels.forEach((person) => {
      const last = person.visible[person.visible.length - 1];
      const labelX = Math.min(xScale(last.x) + 6, iw + 4);
      let labelY = yScale(last.y);
      if (labelY - lastLabelY < 26) labelY = lastLabelY + 26;
      lastLabelY = labelY;

      g.append('text')
        .attr('x', labelX).attr('y', labelY + 4)
        .attr('font-family', 'Space Grotesk, sans-serif')
        .attr('font-size', '13px')
        .attr('font-weight', 500)
        .attr('fill', person.color)
        .text(person.name);
      g.append('text')
        .attr('x', labelX).attr('y', labelY + 18)
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', '10px')
        .attr('fill', person.color)
        .attr('opacity', 0.65)
        .text(`${Math.round(last.y)} cm`);
    });

    // Animation cursor
    if (progress > 0.001 && progress < 0.999) {
      const cursorX = xScale(cutoff);
      g.append('line')
        .attr('x1', cursorX).attr('x2', cursorX)
        .attr('y1', 0).attr('y2', ih)
        .attr('stroke', PALETTE.ink)
        .attr('stroke-width', 1)
        .attr('stroke-dasharray', '3,3')
        .attr('opacity', 0.25);

      const cursorLabel = mode === 'age'
        ? `${cutoff.toFixed(1)} ans`
        : d3.timeFormat('%b %Y')(cutoff);
      const pillW = Math.max(48, cursorLabel.length * 6.5 + 14);
      const pillX = Math.max(0, Math.min(iw - pillW, cursorX - pillW / 2));

      g.append('rect')
        .attr('x', pillX).attr('y', -24)
        .attr('width', pillW).attr('height', 18)
        .attr('rx', 9).attr('fill', PALETTE.ink);
      g.append('text')
        .attr('x', pillX + pillW / 2).attr('y', -11)
        .attr('text-anchor', 'middle')
        .attr('font-family', 'Inter, sans-serif')
        .attr('font-size', '10px').attr('font-weight', 600)
        .attr('fill', PALETTE.bg)
        .text(cursorLabel);
    }
  }, [visibleByPerson, xScale, yScale, iw, ih, mode, progress, cutoff, margin.left, margin.top]);

  return (
    <div ref={containerRef} className="chart-container">
      <div className="chart-header">
        <h3 className="chart-title">{title}</h3>
        <p className="chart-subtitle">{subtitle}</p>
      </div>
      <svg ref={svgRef} width={width} height={height} style={{ display: 'block' }} />
    </div>
  );
}

// ─── Person card ────────────────────────────────────────────────────────────
function PersonCard({ person, onAddMeasurement, onRemovePerson, onRemoveMeasurement }) {
  const [expanded, setExpanded] = useState(false);
  const [inputMode, setInputMode] = useState('age');
  const [ageInput, setAgeInput] = useState('');
  const [dateInput, setDateInput] = useState('');
  const [heightInput, setHeightInput] = useState('');

  const sortedMeasurements = useMemo(
    () => [...person.measurements].sort((a, b) => new Date(a.date) - new Date(b.date)),
    [person.measurements]
  );

  const latestHeight = sortedMeasurements.length > 0
    ? sortedMeasurements[sortedMeasurements.length - 1].height
    : null;
  const currentAge = yearsBetween(person.birthDate, new Date());

  const handleAdd = () => {
    const h = parseFloat(heightInput);
    if (!h || h < 20 || h > 250) return;

    let date;
    if (inputMode === 'age') {
      const age = parseFloat(ageInput);
      if (isNaN(age) || age < 0 || age > 130) return;
      date = toISODate(addYears(person.birthDate, age));
    } else {
      if (!dateInput) return;
      date = dateInput;
    }

    onAddMeasurement(person.id, { date, height: h });
    setAgeInput('');
    setDateInput('');
    setHeightInput('');
  };

  return (
    <div className="person-card">
      <div className="person-row" onClick={() => setExpanded(!expanded)}>
        <span className="person-dot" style={{ background: person.color }} />
        <div className="person-info">
          <div className="person-name">{person.name}</div>
          <div className="person-meta">
            {sortedMeasurements.length} mesure{sortedMeasurements.length !== 1 ? 's' : ''}
            {latestHeight && ` · ${latestHeight} cm`}
            <span style={{ opacity: 0.7 }}> · {currentAge.toFixed(0)} ans</span>
          </div>
        </div>
        <ChevronDown size={16} className={`chevron ${expanded ? 'open' : ''}`} color={PALETTE.muted} />
        <button
          className="icon-btn ghost"
          onClick={(e) => { e.stopPropagation(); onRemovePerson(person.id); }}
          aria-label="Supprimer"
        >
          <X size={14} />
        </button>
      </div>

      {expanded && (
        <div className="person-body">
          {sortedMeasurements.length > 0 && (
            <div className="measurements-list">
              {sortedMeasurements.map((m, i) => {
                const age = yearsBetween(person.birthDate, m.date);
                const dateStr = new Date(m.date).toLocaleDateString('fr-FR', {
                  year: 'numeric', month: 'short', day: 'numeric',
                });
                const origIndex = person.measurements.findIndex(
                  (x) => x.date === m.date && x.height === m.height
                );
                return (
                  <div key={`${m.date}-${i}`} className="measurement-row">
                    <span className="m-date">{dateStr}</span>
                    <span className="m-age">{age.toFixed(1)} ans</span>
                    <span className="m-height">{m.height} cm</span>
                    <button
                      className="icon-btn ghost xs"
                      onClick={() => onRemoveMeasurement(person.id, origIndex)}
                      aria-label="Retirer la mesure"
                    >
                      <X size={11} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="add-measurement">
            <div className="mode-toggle">
              <button
                className={inputMode === 'age' ? 'mode-btn active' : 'mode-btn'}
                onClick={() => setInputMode('age')}
              >
                Par âge
              </button>
              <button
                className={inputMode === 'date' ? 'mode-btn active' : 'mode-btn'}
                onClick={() => setInputMode('date')}
              >
                Par date
              </button>
            </div>
            <div className="add-inputs">
              {inputMode === 'age' ? (
                <input
                  type="number" step="0.5" placeholder="Âge"
                  value={ageInput}
                  onChange={(e) => setAgeInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                  className="input-pill"
                />
              ) : (
                <input
                  type="date" value={dateInput}
                  onChange={(e) => setDateInput(e.target.value)}
                  className="input-pill"
                />
              )}
              <input
                type="number" step="0.5" placeholder="Taille (cm)"
                value={heightInput}
                onChange={(e) => setHeightInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                className="input-pill"
              />
              <button className="add-btn" onClick={handleAdd}>
                <Plus size={14} /> Ajouter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Add person ─────────────────────────────────────────────────────────────
function AddPersonCard({ onAdd, usedColors }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [birthDate, setBirthDate] = useState('');

  const handleSubmit = () => {
    if (!name.trim() || !birthDate) return;
    const color =
      PERSON_COLORS.find((c) => !usedColors.includes(c)) ||
      PERSON_COLORS[Math.floor(Math.random() * PERSON_COLORS.length)];
    onAdd({
      id: `p${Date.now()}`,
      name: name.trim(),
      birthDate,
      color,
      measurements: [],
    });
    setName('');
    setBirthDate('');
    setOpen(false);
  };

  if (!open) {
    return (
      <button className="add-person-collapsed" onClick={() => setOpen(true)}>
        <UserPlus size={16} />
        <span>Ajouter quelqu'un</span>
      </button>
    );
  }

  return (
    <div className="add-person-expanded">
      <div className="add-person-inputs">
        <input
          autoFocus placeholder="Prénom"
          value={name} onChange={(e) => setName(e.target.value)}
          className="input-pill"
        />
        <input
          type="date" value={birthDate}
          onChange={(e) => setBirthDate(e.target.value)}
          className="input-pill"
        />
      </div>
      <div className="add-person-actions">
        <button
          className="btn-secondary"
          onClick={() => { setOpen(false); setName(''); setBirthDate(''); }}
        >
          Annuler
        </button>
        <button className="btn-primary" onClick={handleSubmit}>
          Ajouter
        </button>
      </div>
    </div>
  );
}

// ─── Main app ───────────────────────────────────────────────────────────────
export default function App() {
  const [people, setPeople] = useState(SAMPLE_DATA);
  const [progress, setProgress] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!isPlaying) return;
    const duration = 6500;
    let startTime = null;
    const startProgress = progress >= 0.999 ? 0 : progress;

    let rafId;
    const tick = (now) => {
      if (startTime === null) startTime = now;
      const elapsed = now - startTime;
      const newProgress = Math.min(1, startProgress + (elapsed / duration) * (1 - startProgress));
      setProgress(newProgress);
      if (newProgress >= 1) {
        setIsPlaying(false);
      } else {
        rafId = requestAnimationFrame(tick);
      }
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
    // `progress` is intentionally read once at play time, not tracked — adding it
    // would restart the animation on every frame.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  const handlePlayPause = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (progress >= 0.999) setProgress(0);
      setIsPlaying(true);
    }
  };

  const handleAddPerson = (p) => setPeople([...people, p]);
  const handleRemovePerson = (id) => setPeople(people.filter((p) => p.id !== id));
  const handleAddMeasurement = (id, m) =>
    setPeople(people.map((p) => (p.id === id ? { ...p, measurements: [...p.measurements, m] } : p)));
  const handleRemoveMeasurement = (id, idx) =>
    setPeople(
      people.map((p) =>
        p.id === id ? { ...p, measurements: p.measurements.filter((_, i) => i !== idx) } : p
      )
    );

  const usedColors = people.map((p) => p.color);

  const yearRange = useMemo(() => {
    if (people.length === 0) return null;
    const allDates = people.flatMap((p) =>
      [new Date(p.birthDate), ...p.measurements.map((m) => new Date(m.date))]
    );
    if (allDates.length === 0) return null;
    return {
      min: Math.min(...allDates.map((d) => d.getFullYear())),
      max: Math.max(...allDates.map((d) => d.getFullYear())),
    };
  }, [people]);

  // Bornes d'âge couvertes par les données (pour le filtre d'intervalle d'âges).
  const ageBounds = useMemo(() => {
    let max = 0;
    people.forEach((p) =>
      p.measurements.forEach((m) => {
        max = Math.max(max, yearsBetween(p.birthDate, m.date));
      })
    );
    return { min: 0, max: Math.max(1, Math.ceil(max)) };
  }, [people]);

  // `null` = aucun filtre actif → on suit les bornes des données.
  const [ageRange, setAgeRange] = useState(null);
  const effectiveAgeRange = ageRange ?? ageBounds;
  const ageFilterActive =
    ageRange !== null &&
    (ageRange.min > ageBounds.min || ageRange.max < ageBounds.max);

  const handleAgeMinChange = (value) => {
    const v = parseFloat(value);
    const min = isNaN(v) ? ageBounds.min : Math.max(0, Math.min(v, effectiveAgeRange.max));
    setAgeRange({ min, max: effectiveAgeRange.max });
  };
  const handleAgeMaxChange = (value) => {
    const v = parseFloat(value);
    const max = isNaN(v) ? ageBounds.max : Math.max(effectiveAgeRange.min, v);
    setAgeRange({ min: effectiveAgeRange.min, max });
  };

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;600;700&display=swap');

    * { box-sizing: border-box; }

    .app {
      min-height: 100vh;
      background: ${PALETTE.bg};
      background-image:
        radial-gradient(at 15% 0%, rgba(194, 65, 12, 0.05) 0px, transparent 50%),
        radial-gradient(at 85% 100%, rgba(21, 128, 61, 0.04) 0px, transparent 50%);
      font-family: 'Inter', system-ui, sans-serif;
      color: ${PALETTE.ink};
      padding: 28px 16px 60px;
    }

    .container { max-width: 980px; margin: 0 auto; }

    .header { margin-bottom: 28px; text-align: center; }

    .eyebrow {
      font-size: 11px; font-weight: 700;
      letter-spacing: 0.22em; color: ${PALETTE.muted};
      text-transform: uppercase; margin-bottom: 10px;
    }

    .main-title {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600;
      font-size: clamp(34px, 6vw, 56px);
      line-height: 1.02;
      letter-spacing: -0.02em;
      color: ${PALETTE.ink};
      margin: 0 0 10px;
    }

    .main-title em { font-style: normal; color: ${PALETTE.accent}; font-weight: 700; }

    .main-subtitle {
      font-size: 13px; color: ${PALETTE.muted};
      max-width: 520px; margin: 0 auto;
      line-height: 1.55;
    }

    .controls {
      display: flex; align-items: center; gap: 12px;
      padding: 12px 14px;
      background: ${PALETTE.surface};
      border: 1px solid ${PALETTE.border};
      border-radius: 14px;
      margin: 24px 0;
      box-shadow: 0 1px 0 rgba(28,22,17,0.02);
    }

    .play-btn {
      width: 40px; height: 40px; border-radius: 50%;
      border: none; background: ${PALETTE.ink}; color: ${PALETTE.bg};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: transform 0.15s ease;
      flex-shrink: 0;
    }
    .play-btn:hover { transform: scale(1.06); }
    .play-btn:active { transform: scale(0.94); }

    .progress-slider {
      flex: 1;
      -webkit-appearance: none; appearance: none;
      height: 4px; background: ${PALETTE.border};
      border-radius: 2px; outline: none; cursor: pointer;
    }
    .progress-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 16px; height: 16px; border-radius: 50%;
      background: ${PALETTE.ink}; cursor: pointer;
      border: 2px solid ${PALETTE.surface};
      box-shadow: 0 0 0 1px ${PALETTE.ink};
    }
    .progress-slider::-moz-range-thumb {
      width: 16px; height: 16px; border-radius: 50%;
      background: ${PALETTE.ink}; cursor: pointer;
      border: 2px solid ${PALETTE.surface};
      box-shadow: 0 0 0 1px ${PALETTE.ink};
    }

    .progress-label {
      font-size: 11px; font-weight: 600;
      color: ${PALETTE.muted}; min-width: 36px;
      text-align: right; font-variant-numeric: tabular-nums;
    }

    .reset-btn {
      width: 32px; height: 32px; border-radius: 50%;
      border: 1px solid ${PALETTE.border}; background: transparent;
      color: ${PALETTE.muted};
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; transition: all 0.15s ease; flex-shrink: 0;
    }
    .reset-btn:hover { color: ${PALETTE.ink}; border-color: ${PALETTE.borderDashed}; }

    .age-filter {
      display: flex; align-items: center; gap: 10px;
      flex-wrap: wrap;
      padding: 10px 14px;
      background: ${PALETTE.surface};
      border: 1px solid ${PALETTE.border};
      border-radius: 14px;
      margin: 0 0 24px;
      box-shadow: 0 1px 0 rgba(28,22,17,0.02);
    }

    .age-filter-icon { color: ${PALETTE.muted}; flex-shrink: 0; }

    .age-filter-label {
      font-size: 12px; font-weight: 600; color: ${PALETTE.ink};
      margin-right: auto;
    }

    .age-filter-inputs {
      display: flex; align-items: center; gap: 6px;
    }

    .age-filter-prefix, .age-filter-suffix {
      font-size: 12px; color: ${PALETTE.muted};
    }

    .age-input {
      width: 58px; padding: 7px 8px;
      border: 1px solid ${PALETTE.border};
      border-radius: 8px; background: ${PALETTE.surface};
      font-family: 'Inter', sans-serif;
      font-size: 12px; color: ${PALETTE.ink};
      outline: none; transition: border-color 0.15s ease;
      font-variant-numeric: tabular-nums;
    }
    .age-input:focus { border-color: ${PALETTE.ink}; }

    .age-filter-reset {
      padding: 6px 12px;
      border: 1px solid ${PALETTE.border};
      background: transparent; color: ${PALETTE.muted};
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 11px; font-weight: 600; cursor: pointer;
      transition: all 0.15s ease;
    }
    .age-filter-reset:hover { color: ${PALETTE.ink}; border-color: ${PALETTE.borderDashed}; }

    .charts-grid {
      display: grid; gap: 16px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 880px) { .charts-grid { grid-template-columns: 1fr 1fr; } }

    .chart-container {
      background: ${PALETTE.surface};
      border: 1px solid ${PALETTE.border};
      border-radius: 18px;
      padding: 22px 14px 14px;
      overflow: hidden;
    }

    .chart-header { margin-bottom: 10px; padding: 0 8px; }
    .chart-title {
      font-family: 'Space Grotesk', sans-serif;
      font-weight: 600; font-size: 20px;
      letter-spacing: -0.02em;
      color: ${PALETTE.ink}; margin: 0 0 3px;
    }
    .chart-title em { font-style: normal; font-weight: 700; }
    .chart-subtitle {
      font-size: 11px; color: ${PALETTE.muted}; margin: 0;
      letter-spacing: 0.01em;
    }

    .section-divider {
      display: flex; align-items: center; gap: 14px;
      margin: 40px 0 16px;
    }
    .section-divider::before, .section-divider::after {
      content: ''; flex: 1; height: 1px;
      background: ${PALETTE.borderDashed};
    }
    .section-title {
      font-family: 'Space Grotesk', sans-serif;
      font-style: normal; font-weight: 600;
      letter-spacing: -0.01em;
      font-size: 19px; color: ${PALETTE.ink}; margin: 0;
    }

    .people-grid {
      display: grid; gap: 10px;
      grid-template-columns: 1fr;
    }
    @media (min-width: 560px) { .people-grid { grid-template-columns: 1fr 1fr; } }

    .person-card {
      background: ${PALETTE.surface};
      border: 1px solid ${PALETTE.border};
      border-radius: 14px; overflow: hidden;
      transition: border-color 0.15s ease;
    }
    .person-card:hover { border-color: ${PALETTE.borderDashed}; }

    .person-row {
      display: flex; align-items: center; gap: 10px;
      padding: 13px 14px;
      cursor: pointer; user-select: none;
    }

    .person-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }

    .person-info { flex: 1; min-width: 0; }

    .person-name {
      font-family: 'Space Grotesk', sans-serif;
      font-size: 17px; font-weight: 500;
      color: ${PALETTE.ink}; line-height: 1.2;
    }
    .person-meta {
      font-size: 11px; color: ${PALETTE.muted}; margin-top: 2px;
    }

    .chevron { transition: transform 0.2s ease; }
    .chevron.open { transform: rotate(180deg); }

    .icon-btn {
      background: transparent; border: none;
      color: ${PALETTE.muted}; cursor: pointer;
      padding: 6px; border-radius: 6px;
      display: flex; align-items: center;
      transition: all 0.15s ease;
    }
    .icon-btn.ghost:hover {
      background: rgba(28, 22, 17, 0.05);
      color: ${PALETTE.ink};
    }
    .icon-btn.xs { padding: 3px; }

    .person-body {
      padding: 12px 14px 14px;
      border-top: 1px dashed ${PALETTE.border};
    }

    .measurements-list {
      max-height: 200px; overflow-y: auto;
      margin-bottom: 12px; padding-right: 4px;
    }

    .measurement-row {
      display: flex; align-items: center; gap: 10px;
      padding: 6px 0; font-size: 12px;
      border-bottom: 1px dashed rgba(212, 197, 176, 0.4);
    }
    .measurement-row:last-child { border-bottom: none; }

    .m-date { flex: 1; color: #56565a; }
    .m-age { color: ${PALETTE.mutedLight}; font-size: 11px; }
    .m-height {
      font-weight: 600; color: ${PALETTE.ink};
      font-variant-numeric: tabular-nums;
    }

    .add-measurement {
      background: ${PALETTE.bg};
      border-radius: 10px; padding: 10px;
    }

    .mode-toggle {
      display: flex; gap: 2px;
      background: ${PALETTE.border};
      padding: 2px; border-radius: 8px;
      margin-bottom: 8px;
    }
    .mode-btn {
      flex: 1; padding: 5px 10px;
      border: none; background: transparent;
      border-radius: 6px;
      font-family: 'Inter', sans-serif;
      font-size: 11px; font-weight: 600;
      color: ${PALETTE.muted}; cursor: pointer;
      transition: all 0.15s ease;
    }
    .mode-btn.active {
      background: ${PALETTE.surface};
      color: ${PALETTE.ink};
      box-shadow: 0 1px 2px rgba(0,0,0,0.04);
    }

    .add-inputs { display: flex; gap: 6px; flex-wrap: wrap; }

    .input-pill {
      flex: 1; min-width: 80px;
      padding: 8px 10px;
      border: 1px solid ${PALETTE.border};
      border-radius: 8px; background: ${PALETTE.surface};
      font-family: 'Inter', sans-serif;
      font-size: 12px; color: ${PALETTE.ink};
      outline: none; transition: border-color 0.15s ease;
    }
    .input-pill:focus { border-color: ${PALETTE.ink}; }

    .add-btn {
      padding: 8px 12px; border: none;
      background: ${PALETTE.ink}; color: ${PALETTE.bg};
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 12px; font-weight: 600;
      cursor: pointer;
      display: flex; align-items: center; gap: 4px;
      transition: opacity 0.15s ease;
    }
    .add-btn:hover { opacity: 0.88; }

    .add-person-collapsed {
      width: 100%; padding: 14px;
      border: 1px dashed ${PALETTE.borderDashed};
      background: transparent; border-radius: 14px;
      font-family: 'Inter', sans-serif;
      font-size: 13px; font-weight: 600;
      color: ${PALETTE.muted}; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      gap: 8px; transition: all 0.15s ease;
    }
    .add-person-collapsed:hover {
      border-color: ${PALETTE.ink}; color: ${PALETTE.ink};
      background: ${PALETTE.surface};
    }

    .add-person-expanded {
      grid-column: 1 / -1; padding: 16px;
      border: 1px solid ${PALETTE.borderDashed};
      border-radius: 14px; background: ${PALETTE.surface};
    }

    .add-person-inputs {
      display: flex; gap: 8px;
      margin-bottom: 10px; flex-wrap: wrap;
    }

    .add-person-actions {
      display: flex; gap: 8px; justify-content: flex-end;
    }

    .btn-primary {
      padding: 8px 16px; border: none;
      background: ${PALETTE.ink}; color: ${PALETTE.bg};
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 12px; font-weight: 600; cursor: pointer;
    }
    .btn-secondary {
      padding: 8px 16px;
      border: 1px solid ${PALETTE.border};
      background: transparent; color: ${PALETTE.muted};
      border-radius: 8px;
      font-family: 'Inter', sans-serif;
      font-size: 12px; font-weight: 600; cursor: pointer;
    }

    .empty-state {
      text-align: center; padding: 40px 20px;
      color: ${PALETTE.muted};
      font-family: 'Space Grotesk', sans-serif; font-style: normal;
    }

    .measurements-list::-webkit-scrollbar { width: 4px; }
    .measurements-list::-webkit-scrollbar-track { background: transparent; }
    .measurements-list::-webkit-scrollbar-thumb {
      background: ${PALETTE.border}; border-radius: 2px;
    }
  `;

  return (
    <>
      <style>{css}</style>
      <div className="app">
        <div className="container">
          <header className="header">
            <div className="eyebrow">Courbes de croissance</div>
            <h1 className="main-title">
              On a tous <em>grandi</em>.
            </h1>
            <p className="main-subtitle">
              Saisis quelques tailles à différents âges, et regarde vos courbes se dessiner ensemble.
              {yearRange && ` De ${yearRange.min} à ${yearRange.max}.`}
            </p>
          </header>

          <div className="controls">
            <button
              className="play-btn"
              onClick={handlePlayPause}
              aria-label={isPlaying ? 'Pause' : 'Lecture'}
            >
              {isPlaying
                ? <Pause size={16} fill="currentColor" />
                : <Play size={16} fill="currentColor" style={{ marginLeft: 2 }} />}
            </button>
            <input
              type="range"
              min={0} max={1} step={0.001}
              value={progress}
              onChange={(e) => {
                setIsPlaying(false);
                setProgress(parseFloat(e.target.value));
              }}
              className="progress-slider"
            />
            <span className="progress-label">{Math.round(progress * 100)}%</span>
            <button
              className="reset-btn"
              onClick={() => { setProgress(0); setIsPlaying(false); }}
              aria-label="Recommencer"
            >
              <RotateCcw size={14} />
            </button>
          </div>

          <div className="age-filter">
            <SlidersHorizontal size={15} className="age-filter-icon" />
            <span className="age-filter-label">Intervalle d'âges</span>
            <div className="age-filter-inputs">
              <span className="age-filter-prefix">De</span>
              <input
                type="number" min={0} step={1}
                value={effectiveAgeRange.min}
                onChange={(e) => handleAgeMinChange(e.target.value)}
                className="age-input"
                aria-label="Âge minimum"
              />
              <span className="age-filter-prefix">à</span>
              <input
                type="number" min={0} step={1}
                value={effectiveAgeRange.max}
                onChange={(e) => handleAgeMaxChange(e.target.value)}
                className="age-input"
                aria-label="Âge maximum"
              />
              <span className="age-filter-suffix">ans</span>
            </div>
            {ageFilterActive && (
              <button
                className="age-filter-reset"
                onClick={() => setAgeRange(null)}
              >
                Tout afficher
              </button>
            )}
          </div>

          <div className="charts-grid">
            <GrowthChart
              people={people}
              mode="time"
              progress={progress}
              ageRange={effectiveAgeRange}
              title={<><em>Au fil</em> des années</>}
              subtitle="Tout le monde sur la même frise du temps"
            />
            <GrowthChart
              people={people}
              mode="age"
              progress={progress}
              ageRange={effectiveAgeRange}
              title={<><em>Au même</em> âge</>}
              subtitle="Et si vous aviez tous le même âge ?"
            />
          </div>

          <div className="section-divider">
            <h2 className="section-title">Tout le monde</h2>
          </div>

          {people.length === 0 && (
            <div className="empty-state">
              Ajoute quelqu'un pour commencer.
            </div>
          )}

          <div className="people-grid">
            {people.map((person) => (
              <PersonCard
                key={person.id}
                person={person}
                onAddMeasurement={handleAddMeasurement}
                onRemovePerson={handleRemovePerson}
                onRemoveMeasurement={handleRemoveMeasurement}
              />
            ))}
            <AddPersonCard onAdd={handleAddPerson} usedColors={usedColors} />
          </div>
        </div>
      </div>
    </>
  );
}
