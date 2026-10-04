/* Formula coach data: every CSEC formula the workbook teaches, with each rearrangement written out.
   Each formula: id, sec, name, eq (as written in the workbook), vars {sym: [name, unit, hint]},
   forms {target: [rearranged text, how to rearrange, substitution template, function]}.
   Templates use {sym} for "the value the student typed". */
(function () {
  'use strict';
  function P(id, sec, name, A, B, C, vars, notes) {   // A = B × C
    var f = {}; f[A] = [A + ' = ' + B + ' × ' + C, 'it is already the subject', A + ' = {' + B + '} × {' + C + '}', function (v) { return v[B] * v[C]; }];
    f[B] = [B + ' = ' + A + ' ÷ ' + C, B + ' is multiplied by ' + C + ', so divide both sides by ' + C, B + ' = {' + A + '} ÷ {' + C + '}', function (v) { return v[A] / v[C]; }];
    f[C] = [C + ' = ' + A + ' ÷ ' + B, C + ' is multiplied by ' + B + ', so divide both sides by ' + B, C + ' = {' + A + '} ÷ {' + B + '}', function (v) { return v[A] / v[B]; }];
    return { id: id, sec: sec, name: name, eq: A + ' = ' + B + C.replace(/^/, B.length > 1 || C.length > 1 ? ' × ' : ''), vars: vars, forms: f, notes: notes || '', tri: [A, B, C] };
  }
  function Q(id, sec, name, A, B, C, vars, notes) {   // A = B ÷ C
    var f = {}; f[A] = [A + ' = ' + B + ' ÷ ' + C, 'it is already the subject', A + ' = {' + B + '} ÷ {' + C + '}', function (v) { return v[B] / v[C]; }];
    f[B] = [B + ' = ' + A + ' × ' + C, B + ' is divided by ' + C + ', so multiply both sides by ' + C, B + ' = {' + A + '} × {' + C + '}', function (v) { return v[A] * v[C]; }];
    f[C] = [C + ' = ' + B + ' ÷ ' + A, 'multiply both sides by ' + C + ', then divide both sides by ' + A, C + ' = {' + B + '} ÷ {' + A + '}', function (v) { return v[B] / v[A]; }];
    return { id: id, sec: sec, name: name, eq: A + ' = ' + B + ' ÷ ' + C, vars: vars, forms: f, notes: notes || '', tri: [B, A, C] };
  }
  var L = [
    // ---------- A Mechanics ----------
    Q('speed', 'A', 'Speed', 'v', 'd', 't', { v: ['speed', 'm/s'], d: ['distance', 'm'], t: ['time', 's'] }, 'Distance in metres and time in seconds gives m/s.'),
    { id: 'accel', sec: 'A', name: 'Acceleration', eq: 'a = (v − u) ÷ t', vars: { a: ['acceleration', 'm/s²'], v: ['final velocity', 'm/s'], u: ['initial velocity', 'm/s'], t: ['time', 's'] }, forms: {
      a: ['a = (v − u) ÷ t', 'it is already the subject', 'a = ({v} − {u}) ÷ {t}', function (x) { return (x.v - x.u) / x.t; }],
      v: ['v = u + a t', 'multiply both sides by t, then add u to both sides', 'v = {u} + {a} × {t}', function (x) { return x.u + x.a * x.t; }],
      u: ['u = v − a t', 'multiply both sides by t, then rearrange to get u alone', 'u = {v} − {a} × {t}', function (x) { return x.v - x.a * x.t; }],
      t: ['t = (v − u) ÷ a', 'multiply both sides by t, then divide both sides by a', 't = ({v} − {u}) ÷ {a}', function (x) { return (x.v - x.u) / x.a; }] }, notes: 'A negative acceleration means slowing down (deceleration).' },
    { id: 'suvat2', sec: 'A', name: 'Equation of motion: v² = u² + 2as', eq: 'v² = u² + 2 a s', vars: { v: ['final velocity', 'm/s'], u: ['initial velocity', 'm/s'], a: ['acceleration', 'm/s²'], s: ['displacement', 'm'] }, forms: {
      v: ['v = √(u² + 2 a s)', 'take the square root of both sides', 'v = √({u}² + 2 × {a} × {s})', function (x) { return Math.sqrt(x.u * x.u + 2 * x.a * x.s); }],
      s: ['s = (v² − u²) ÷ (2 a)', 'subtract u² from both sides, then divide by 2a', 's = ({v}² − {u}²) ÷ (2 × {a})', function (x) { return (x.v * x.v - x.u * x.u) / (2 * x.a); }],
      a: ['a = (v² − u²) ÷ (2 s)', 'subtract u² from both sides, then divide by 2s', 'a = ({v}² − {u}²) ÷ (2 × {s})', function (x) { return (x.v * x.v - x.u * x.u) / (2 * x.s); }] } },
    { id: 'suvat1', sec: 'A', name: 'Equation of motion: s = ut + ½at²', eq: 's = u t + ½ a t²', vars: { s: ['displacement', 'm'], u: ['initial velocity', 'm/s'], t: ['time', 's'], a: ['acceleration', 'm/s²'] }, forms: {
      s: ['s = u t + ½ a t²', 'it is already the subject', 's = {u} × {t} + ½ × {a} × {t}²', function (x) { return x.u * x.t + 0.5 * x.a * x.t * x.t; }],
      a: ['a = 2(s − u t) ÷ t²', 'subtract ut from both sides, multiply by 2, divide by t²', 'a = 2 × ({s} − {u} × {t}) ÷ {t}²', function (x) { return 2 * (x.s - x.u * x.t) / (x.t * x.t); }] } },
    { id: 'suvatavg', sec: 'A', name: 'Distance from average velocity', eq: 's = ½ (u + v) t', vars: { s: ['displacement', 'm'], u: ['initial velocity', 'm/s'], v: ['final velocity', 'm/s'], t: ['time', 's'] }, forms: {
      s: ['s = ½ (u + v) t', 'it is already the subject', 's = ½ × ({u} + {v}) × {t}', function (x) { return 0.5 * (x.u + x.v) * x.t; }],
      t: ['t = 2 s ÷ (u + v)', 'multiply both sides by 2, then divide by (u + v)', 't = 2 × {s} ÷ ({u} + {v})', function (x) { return 2 * x.s / (x.u + x.v); }] } },
    P('fma', 'A', 'Newton\'s second law', 'F', 'm', 'a', { F: ['resultant force', 'N'], m: ['mass', 'kg'], a: ['acceleration', 'm/s²'] }, 'F is the RESULTANT force. Mass must be in kg.'),
    P('weight', 'A', 'Weight', 'W', 'm', 'g', { W: ['weight', 'N'], m: ['mass', 'kg'], g: ['gravitational field strength', 'N/kg', 10] }, 'g = 10 N/kg on Earth (1.6 N/kg on the Moon).'),
    Q('density', 'A', 'Density', 'ρ', 'm', 'V', { ρ: ['density', 'kg/m³'], m: ['mass', 'kg'], V: ['volume', 'm³'] }, 'Use g and cm³ together (gives g/cm³) or kg and m³ together (gives kg/m³).'),
    P('moment', 'A', 'Moment of a force', 'M', 'F', 'd', { M: ['moment', 'N m'], F: ['force', 'N'], d: ['perpendicular distance from the pivot', 'm'] }, 'Distance must be measured from the pivot, at right angles to the force.'),
    P('hooke', 'A', 'Hooke\'s law', 'F', 'k', 'x', { F: ['force (load)', 'N'], k: ['spring constant', 'N/m'], x: ['extension', 'm'] }, 'x is the EXTENSION (new length − original length), not the length.'),
    P('momentum', 'A', 'Momentum', 'p', 'm', 'v', { p: ['momentum', 'kg m/s'], m: ['mass', 'kg'], v: ['velocity', 'm/s'] }),
    { id: 'impulse', sec: 'A', name: 'Force and change of momentum', eq: 'F = (m v − m u) ÷ t', vars: { F: ['force', 'N'], m: ['mass', 'kg'], v: ['final velocity', 'm/s'], u: ['initial velocity', 'm/s'], t: ['time', 's'] }, forms: {
      F: ['F = (m v − m u) ÷ t', 'it is already the subject', 'F = ({m} × {v} − {m} × {u}) ÷ {t}', function (x) { return (x.m * x.v - x.m * x.u) / x.t; }],
      t: ['t = (m v − m u) ÷ F', 'multiply both sides by t, then divide by F', 't = ({m} × {v} − {m} × {u}) ÷ {F}', function (x) { return (x.m * x.v - x.m * x.u) / x.F; }] } },
    P('work', 'A', 'Work done', 'W', 'F', 'd', { W: ['work done (energy transferred)', 'J'], F: ['force', 'N'], d: ['distance moved in the direction of the force', 'm'] }),
    { id: 'ke', sec: 'A', name: 'Kinetic energy', eq: 'KE = ½ m v²', vars: { KE: ['kinetic energy', 'J'], m: ['mass', 'kg'], v: ['speed', 'm/s'] }, forms: {
      KE: ['KE = ½ m v²', 'it is already the subject (square v FIRST)', 'KE = ½ × {m} × {v}²', function (x) { return 0.5 * x.m * x.v * x.v; }],
      m: ['m = 2 KE ÷ v²', 'multiply both sides by 2, then divide by v²', 'm = 2 × {KE} ÷ {v}²', function (x) { return 2 * x.KE / (x.v * x.v); }],
      v: ['v = √(2 KE ÷ m)', 'multiply by 2, divide by m, then square-root both sides', 'v = √(2 × {KE} ÷ {m})', function (x) { return Math.sqrt(2 * x.KE / x.m); }] } },
    { id: 'gpe', sec: 'A', name: 'Gravitational potential energy', eq: 'GPE = m g h', vars: { GPE: ['gravitational potential energy', 'J'], m: ['mass', 'kg'], g: ['gravitational field strength', 'N/kg', 10], h: ['height', 'm'] }, forms: {
      GPE: ['GPE = m g h', 'it is already the subject', 'GPE = {m} × {g} × {h}', function (x) { return x.m * x.g * x.h; }],
      m: ['m = GPE ÷ (g h)', 'divide both sides by g × h', 'm = {GPE} ÷ ({g} × {h})', function (x) { return x.GPE / (x.g * x.h); }],
      h: ['h = GPE ÷ (m g)', 'divide both sides by m × g', 'h = {GPE} ÷ ({m} × {g})', function (x) { return x.GPE / (x.m * x.g); }] } },
    { id: 'fall', sec: 'A', name: 'Speed after falling (GPE → KE)', eq: 'v = √(2 g h)', vars: { v: ['speed', 'm/s'], g: ['gravitational field strength', 'N/kg', 10], h: ['height fallen', 'm'] }, forms: {
      v: ['v = √(2 g h)', 'from mgh = ½mv²: the m cancels', 'v = √(2 × {g} × {h})', function (x) { return Math.sqrt(2 * x.g * x.h); }],
      h: ['h = v² ÷ (2 g)', 'square both sides, then divide by 2g', 'h = {v}² ÷ (2 × {g})', function (x) { return x.v * x.v / (2 * x.g); }] } },
    Q('power', 'A', 'Power', 'P', 'E', 't', { P: ['power', 'W'], E: ['energy transferred (or work done)', 'J'], t: ['time', 's'] }, 'Time must be in seconds.'),
    { id: 'efficiency', sec: 'A', name: 'Efficiency', eq: 'efficiency = useful output ÷ total input × 100%', vars: { eff: ['efficiency', '%'], out: ['useful energy (or power) out', 'J'], inp: ['total energy (or power) in', 'J'] }, forms: {
      eff: ['efficiency = out ÷ in × 100', 'it is already the subject', 'efficiency = {out} ÷ {inp} × 100', function (x) { return x.out / x.inp * 100; }],
      out: ['out = efficiency × in ÷ 100', 'multiply both sides by in, then divide by 100', 'out = {eff} × {inp} ÷ 100', function (x) { return x.eff * x.inp / 100; }],
      inp: ['in = out × 100 ÷ efficiency', 'rearrange to get "in" on its own', 'in = {out} × 100 ÷ {eff}', function (x) { return x.out * 100 / x.eff; }] }, notes: 'Efficiency can never be more than 100%.' },
    Q('pressure', 'A', 'Pressure', 'P', 'F', 'A', { P: ['pressure', 'Pa'], F: ['force', 'N'], A: ['area', 'm²'] }, 'Area must be in m² (1 cm² = 0.0001 m²).'),
    { id: 'liquidp', sec: 'A', name: 'Pressure in a liquid', eq: 'P = ρ g h', vars: { P: ['pressure', 'Pa'], ρ: ['density of the liquid', 'kg/m³'], g: ['gravitational field strength', 'N/kg', 10], h: ['depth', 'm'] }, forms: {
      P: ['P = ρ g h', 'it is already the subject', 'P = {ρ} × {g} × {h}', function (x) { return x.ρ * x.g * x.h; }],
      h: ['h = P ÷ (ρ g)', 'divide both sides by ρ × g', 'h = {P} ÷ ({ρ} × {g})', function (x) { return x.P / (x.ρ * x.g); }],
      ρ: ['ρ = P ÷ (g h)', 'divide both sides by g × h', 'ρ = {P} ÷ ({g} × {h})', function (x) { return x.P / (x.g * x.h); }] } },
    // ---------- B Thermal ----------
    { id: 'shc', sec: 'B', name: 'Specific heat capacity', eq: 'E = m c Δθ', vars: { E: ['heat energy', 'J'], m: ['mass', 'kg'], c: ['specific heat capacity', 'J/kg °C'], Δθ: ['temperature change', '°C'] }, forms: {
      E: ['E = m c Δθ', 'it is already the subject', 'E = {m} × {c} × {Δθ}', function (x) { return x.m * x.c * x.Δθ; }],
      c: ['c = E ÷ (m Δθ)', 'divide both sides by m × Δθ', 'c = {E} ÷ ({m} × {Δθ})', function (x) { return x.E / (x.m * x.Δθ); }],
      m: ['m = E ÷ (c Δθ)', 'divide both sides by c × Δθ', 'm = {E} ÷ ({c} × {Δθ})', function (x) { return x.E / (x.c * x.Δθ); }],
      Δθ: ['Δθ = E ÷ (m c)', 'divide both sides by m × c', 'Δθ = {E} ÷ ({m} × {c})', function (x) { return x.E / (x.m * x.c); }] }, notes: 'Δθ is the CHANGE in temperature. Water: c = 4200 J/kg °C.' },
    P('latent', 'B', 'Specific latent heat', 'E', 'm', 'L', { E: ['heat energy', 'J'], m: ['mass that changes state', 'kg'], L: ['specific latent heat', 'J/kg'] }, 'Ice: L = 3.34 × 10⁵ J/kg (fusion). Water: L = 2.26 × 10⁶ J/kg (vaporisation).'),
    { id: 'kelvin', sec: 'B', name: 'Celsius to kelvin', eq: 'T = θ + 273', vars: { T: ['temperature in kelvin', 'K'], θ: ['temperature in Celsius', '°C'] }, forms: {
      T: ['T = θ + 273', 'it is already the subject', 'T = {θ} + 273', function (x) { return x.θ + 273; }],
      θ: ['θ = T − 273', 'subtract 273 from both sides', 'θ = {T} − 273', function (x) { return x.T - 273; }] } },
    { id: 'boyle', sec: 'B', name: 'Boyle\'s law', eq: 'p₁ V₁ = p₂ V₂', vars: { p1: ['first pressure', 'kPa'], V1: ['first volume', 'cm³'], p2: ['second pressure', 'kPa'], V2: ['second volume', 'cm³'] }, forms: {
      V2: ['V₂ = p₁ V₁ ÷ p₂', 'divide both sides by p₂', 'V₂ = {p1} × {V1} ÷ {p2}', function (x) { return x.p1 * x.V1 / x.p2; }],
      p2: ['p₂ = p₁ V₁ ÷ V₂', 'divide both sides by V₂', 'p₂ = {p1} × {V1} ÷ {V2}', function (x) { return x.p1 * x.V1 / x.V2; }] }, notes: 'Use the same units for both pressures and both volumes.' },
    { id: 'charles', sec: 'B', name: 'Charles\' law', eq: 'V₁ ÷ T₁ = V₂ ÷ T₂', vars: { V1: ['first volume', 'cm³'], T1: ['first temperature', 'K'], V2: ['second volume', 'cm³'], T2: ['second temperature', 'K'] }, forms: {
      V2: ['V₂ = V₁ × T₂ ÷ T₁', 'multiply both sides by T₂', 'V₂ = {V1} × {T2} ÷ {T1}', function (x) { return x.V1 * x.T2 / x.T1; }],
      T2: ['T₂ = T₁ × V₂ ÷ V₁', 'cross-multiply, then divide by V₁', 'T₂ = {T1} × {V2} ÷ {V1}', function (x) { return x.T1 * x.V2 / x.V1; }] }, notes: 'Temperatures MUST be in kelvin (°C + 273).' },
    { id: 'pressurelaw', sec: 'B', name: 'Pressure law', eq: 'p₁ ÷ T₁ = p₂ ÷ T₂', vars: { p1: ['first pressure', 'kPa'], T1: ['first temperature', 'K'], p2: ['second pressure', 'kPa'], T2: ['second temperature', 'K'] }, forms: {
      p2: ['p₂ = p₁ × T₂ ÷ T₁', 'multiply both sides by T₂', 'p₂ = {p1} × {T2} ÷ {T1}', function (x) { return x.p1 * x.T2 / x.T1; }],
      T2: ['T₂ = T₁ × p₂ ÷ p₁', 'cross-multiply, then divide by p₁', 'T₂ = {T1} × {p2} ÷ {p1}', function (x) { return x.T1 * x.p2 / x.p1; }] }, notes: 'Temperatures MUST be in kelvin (°C + 273).' },
    { id: 'gaslaw', sec: 'B', name: 'General gas law', eq: 'p₁V₁ ÷ T₁ = p₂V₂ ÷ T₂', vars: { p1: ['first pressure', 'kPa'], V1: ['first volume', 'cm³'], T1: ['first temperature', 'K'], p2: ['second pressure', 'kPa'], V2: ['second volume', 'cm³'], T2: ['second temperature', 'K'] }, forms: {
      V2: ['V₂ = p₁ V₁ T₂ ÷ (T₁ p₂)', 'multiply both sides by T₂, divide by p₂', 'V₂ = {p1} × {V1} × {T2} ÷ ({T1} × {p2})', function (x) { return x.p1 * x.V1 * x.T2 / (x.T1 * x.p2); }],
      p2: ['p₂ = p₁ V₁ T₂ ÷ (T₁ V₂)', 'multiply both sides by T₂, divide by V₂', 'p₂ = {p1} × {V1} × {T2} ÷ ({T1} × {V2})', function (x) { return x.p1 * x.V1 * x.T2 / (x.T1 * x.V2); }],
      T2: ['T₂ = T₁ p₂ V₂ ÷ (p₁ V₁)', 'cross-multiply, then divide by p₁V₁', 'T₂ = {T1} × {p2} × {V2} ÷ ({p1} × {V1})', function (x) { return x.T1 * x.p2 * x.V2 / (x.p1 * x.V1); }] }, notes: 'Temperatures MUST be in kelvin.' },
    // ---------- C Waves & Optics ----------
    P('wave', 'C', 'Wave equation', 'v', 'f', 'λ', { v: ['wave speed', 'm/s'], f: ['frequency', 'Hz'], λ: ['wavelength', 'm'] }, 'For light and all EM waves in a vacuum, v = c = 3 × 10⁸ m/s.'),
    { id: 'period', sec: 'C', name: 'Period and frequency', eq: 'T = 1 ÷ f', vars: { T: ['period', 's'], f: ['frequency', 'Hz'] }, forms: {
      T: ['T = 1 ÷ f', 'it is already the subject', 'T = 1 ÷ {f}', function (x) { return 1 / x.f; }],
      f: ['f = 1 ÷ T', 'multiply both sides by f, then divide by T', 'f = 1 ÷ {T}', function (x) { return 1 / x.T; }] } },
    { id: 'echo', sec: 'C', name: 'Echo', eq: 'v = 2 d ÷ t', vars: { v: ['speed of sound', 'm/s'], d: ['distance to the reflector', 'm'], t: ['time for the echo (there and back)', 's'] }, forms: {
      v: ['v = 2 d ÷ t', 'it is already the subject', 'v = 2 × {d} ÷ {t}', function (x) { return 2 * x.d / x.t; }],
      d: ['d = v t ÷ 2', 'multiply both sides by t, then divide by 2', 'd = {v} × {t} ÷ 2', function (x) { return x.v * x.t / 2; }],
      t: ['t = 2 d ÷ v', 'multiply both sides by t, then divide by v', 't = 2 × {d} ÷ {v}', function (x) { return 2 * x.d / x.v; }] }, notes: 'The sound travels there AND back: 2d.' },
    { id: 'snell', sec: 'C', name: 'Refractive index (Snell\'s law)', eq: 'n = sin i ÷ sin r', vars: { n: ['refractive index', ''], i: ['angle of incidence (in air)', '°'], r: ['angle of refraction (in the material)', '°'] }, forms: {
      n: ['n = sin i ÷ sin r', 'it is already the subject', 'n = sin {i}° ÷ sin {r}°', function (x) { return Math.sin(x.i * Math.PI / 180) / Math.sin(x.r * Math.PI / 180); }],
      r: ['r = sin⁻¹(sin i ÷ n)', 'sin r = sin i ÷ n, then use sin⁻¹', 'r = sin⁻¹(sin {i}° ÷ {n})', function (x) { return Math.asin(Math.sin(x.i * Math.PI / 180) / x.n) * 180 / Math.PI; }],
      i: ['i = sin⁻¹(n × sin r)', 'sin i = n × sin r, then use sin⁻¹', 'i = sin⁻¹({n} × sin {r}°)', function (x) { return Math.asin(x.n * Math.sin(x.r * Math.PI / 180)) * 180 / Math.PI; }] }, notes: 'Calculator in DEGREES. Angles are measured from the normal.' },
    Q('speedlight', 'C', 'Refractive index from speeds', 'n', 'c', 'v', { n: ['refractive index', ''], c: ['speed of light in a vacuum', 'm/s', 3e8], v: ['speed of light in the material', 'm/s'] }),
    { id: 'critical', sec: 'C', name: 'Critical angle', eq: 'sin c = 1 ÷ n', vars: { c: ['critical angle', '°'], n: ['refractive index', ''] }, forms: {
      c: ['c = sin⁻¹(1 ÷ n)', 'work out 1 ÷ n, then use sin⁻¹', 'c = sin⁻¹(1 ÷ {n})', function (x) { return Math.asin(1 / x.n) * 180 / Math.PI; }],
      n: ['n = 1 ÷ sin c', 'multiply by n, divide by sin c', 'n = 1 ÷ sin {c}°', function (x) { return 1 / Math.sin(x.c * Math.PI / 180); }] } },
    { id: 'lens', sec: 'C', name: 'Lens formula', eq: '1/f = 1/u + 1/v', vars: { f: ['focal length', 'cm'], u: ['object distance', 'cm'], v: ['image distance', 'cm'] }, forms: {
      v: ['1/v = 1/f − 1/u', 'subtract 1/u from both sides, then take the reciprocal', '1/v = 1/{f} − 1/{u}', function (x) { return 1 / (1 / x.f - 1 / x.u); }],
      f: ['1/f = 1/u + 1/v', 'add the reciprocals, then take the reciprocal', '1/f = 1/{u} + 1/{v}', function (x) { return 1 / (1 / x.u + 1 / x.v); }],
      u: ['1/u = 1/f − 1/v', 'subtract 1/v from both sides, then take the reciprocal', '1/u = 1/{f} − 1/{v}', function (x) { return 1 / (1 / x.f - 1 / x.v); }] }, notes: 'Don\'t forget the last step: 1 ÷ your answer. A negative v means a virtual image.' },
    Q('magnif', 'C', 'Magnification', 'm', 'v', 'u', { m: ['magnification', ''], v: ['image distance (or height)', 'cm'], u: ['object distance (or height)', 'cm'] }),
    // ---------- D Electricity & Magnetism ----------
    P('charge', 'D', 'Charge and current', 'Q', 'I', 't', { Q: ['charge', 'C'], I: ['current', 'A'], t: ['time', 's'] }, 'Time in seconds.'),
    P('ohm', 'D', 'Ohm\'s law', 'V', 'I', 'R', { V: ['potential difference', 'V'], I: ['current', 'A'], R: ['resistance', 'Ω'] }, 'Current in amps (mA ÷ 1000).'),
    P('epower', 'D', 'Electrical power', 'P', 'I', 'V', { P: ['power', 'W'], I: ['current', 'A'], V: ['voltage', 'V'] }),
    Q('pdenergy', 'D', 'Potential difference and energy', 'V', 'E', 'Q', { V: ['potential difference', 'V'], E: ['energy transferred', 'J'], Q: ['charge', 'C'] }),
    { id: 'i2r', sec: 'D', name: 'Power lost as heat', eq: 'P = I² R', vars: { P: ['power', 'W'], I: ['current', 'A'], R: ['resistance', 'Ω'] }, forms: {
      P: ['P = I² R', 'it is already the subject (square I first)', 'P = {I}² × {R}', function (x) { return x.I * x.I * x.R; }],
      I: ['I = √(P ÷ R)', 'divide by R, then square-root', 'I = √({P} ÷ {R})', function (x) { return Math.sqrt(x.P / x.R); }],
      R: ['R = P ÷ I²', 'divide both sides by I²', 'R = {P} ÷ {I}²', function (x) { return x.P / (x.I * x.I); }] } },
    { id: 'eenergy', sec: 'D', name: 'Electrical energy', eq: 'E = I V t', vars: { E: ['energy', 'J'], I: ['current', 'A'], V: ['voltage', 'V'], t: ['time', 's'] }, forms: {
      E: ['E = I V t', 'it is already the subject', 'E = {I} × {V} × {t}', function (x) { return x.I * x.V * x.t; }],
      t: ['t = E ÷ (I V)', 'divide both sides by I × V', 't = {E} ÷ ({I} × {V})', function (x) { return x.E / (x.I * x.V); }] } },
    P('kwh', 'D', 'Energy in kWh', 'E', 'P', 't', { E: ['energy', 'kWh'], P: ['power', 'kW'], t: ['time', 'h'] }, 'Power in kW (W ÷ 1000) and time in hours. Then cost = kWh × price per kWh.'),
    { id: 'series', sec: 'D', name: 'Resistors in series', eq: 'R = R₁ + R₂', vars: { R: ['total resistance', 'Ω'], R1: ['first resistor', 'Ω'], R2: ['second resistor', 'Ω'] }, forms: {
      R: ['R = R₁ + R₂', 'it is already the subject', 'R = {R1} + {R2}', function (x) { return x.R1 + x.R2; }] } },
    { id: 'parallel', sec: 'D', name: 'Resistors in parallel', eq: '1/R = 1/R₁ + 1/R₂', vars: { R: ['total resistance', 'Ω'], R1: ['first resistor', 'Ω'], R2: ['second resistor', 'Ω'] }, forms: {
      R: ['1/R = 1/R₁ + 1/R₂', 'add the reciprocals, then take the reciprocal', '1/R = 1/{R1} + 1/{R2}', function (x) { return 1 / (1 / x.R1 + 1 / x.R2); }] }, notes: 'The answer is always SMALLER than the smallest resistor.' },
    { id: 'transformer', sec: 'D', name: 'Transformer turns rule', eq: 'Vs ÷ Vp = Ns ÷ Np', vars: { Vs: ['secondary voltage', 'V'], Vp: ['primary voltage', 'V'], Ns: ['secondary turns', ''], Np: ['primary turns', ''] }, forms: {
      Vs: ['Vs = Vp × Ns ÷ Np', 'multiply both sides by Vp', 'Vs = {Vp} × {Ns} ÷ {Np}', function (x) { return x.Vp * x.Ns / x.Np; }],
      Ns: ['Ns = Np × Vs ÷ Vp', 'multiply both sides by Np', 'Ns = {Np} × {Vs} ÷ {Vp}', function (x) { return x.Np * x.Vs / x.Vp; }],
      Vp: ['Vp = Vs × Np ÷ Ns', 'flip both sides, then multiply by Vs', 'Vp = {Vs} × {Np} ÷ {Ns}', function (x) { return x.Vs * x.Np / x.Ns; }],
      Np: ['Np = Ns × Vp ÷ Vs', 'flip both sides, then multiply by Ns', 'Np = {Ns} × {Vp} ÷ {Vs}', function (x) { return x.Ns * x.Vp / x.Vs; }] } },
    { id: 'tpower', sec: 'D', name: 'Ideal transformer power', eq: 'Vp Ip = Vs Is', vars: { Vp: ['primary voltage', 'V'], Ip: ['primary current', 'A'], Vs: ['secondary voltage', 'V'], Is: ['secondary current', 'A'] }, forms: {
      Is: ['Is = Vp Ip ÷ Vs', 'divide both sides by Vs', 'Is = {Vp} × {Ip} ÷ {Vs}', function (x) { return x.Vp * x.Ip / x.Vs; }],
      Ip: ['Ip = Vs Is ÷ Vp', 'divide both sides by Vp', 'Ip = {Vs} × {Is} ÷ {Vp}', function (x) { return x.Vs * x.Is / x.Vp; }] } },
    { id: 'bil', sec: 'D', name: 'Force on a current-carrying wire', eq: 'F = B I L', vars: { F: ['force', 'N'], B: ['magnetic field strength', 'T'], I: ['current', 'A'], L: ['length of wire in the field', 'm'] }, forms: {
      F: ['F = B I L', 'it is already the subject', 'F = {B} × {I} × {L}', function (x) { return x.B * x.I * x.L; }],
      I: ['I = F ÷ (B L)', 'divide both sides by B × L', 'I = {F} ÷ ({B} × {L})', function (x) { return x.F / (x.B * x.L); }],
      B: ['B = F ÷ (I L)', 'divide both sides by I × L', 'B = {F} ÷ ({I} × {L})', function (x) { return x.F / (x.I * x.L); }] } },
    // ---------- E Atom ----------
    { id: 'massno', sec: 'E', name: 'Mass number', eq: 'A = Z + N', vars: { A: ['mass number (nucleons)', ''], Z: ['atomic number (protons)', ''], N: ['number of neutrons', ''] }, forms: {
      A: ['A = Z + N', 'it is already the subject', 'A = {Z} + {N}', function (x) { return x.Z + x.N; }],
      N: ['N = A − Z', 'subtract Z from both sides', 'N = {A} − {Z}', function (x) { return x.A - x.Z; }],
      Z: ['Z = A − N', 'subtract N from both sides', 'Z = {A} − {N}', function (x) { return x.A - x.N; }] } },
    { id: 'halflife', sec: 'E', name: 'Half-life', eq: 'amount left = start × (½)ⁿ, n = time ÷ half-life', vars: { left: ['amount left', ''], N0: ['starting amount', ''], t: ['time passed', 'days'], h: ['half-life', 'days'] }, forms: {
      left: ['left = N0 × (½)^n^ with n = t ÷ h', 'find the number of half-lives n = t ÷ h, then halve n times', 'left = {N0} × (½)^n^ with n = {t} ÷ {h}', function (x) { return x.N0 * Math.pow(0.5, x.t / x.h); }],
      h: ['h = t ÷ n, with n = log₂(N0 ÷ left)', 'count how many halvings take N0 down to "left", then divide the time by that number', 'h = {t} ÷ log₂({N0} ÷ {left})', function (x) { return x.t / (Math.log(x.N0 / x.left) / Math.log(2)); }] }, notes: 'Use the same unit for the time and the half-life.' },
    { id: 'emc2', sec: 'E', name: 'Mass–energy equation', eq: 'E = m c²', vars: { E: ['energy', 'J'], m: ['mass converted', 'kg'], c: ['speed of light', 'm/s', 3e8] }, forms: {
      E: ['E = m c²', 'it is already the subject', 'E = {m} × ({c})²', function (x) { return x.m * x.c * x.c; }],
      m: ['m = E ÷ c²', 'divide both sides by c²', 'm = {E} ÷ ({c})²', function (x) { return x.E / (x.c * x.c); }] } },
  ];
  window.WB_FORMULAS = L;
})();
