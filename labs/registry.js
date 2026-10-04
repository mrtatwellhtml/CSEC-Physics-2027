/* Interactive labs and maths help: one registry shared by the workbook (lesson "Explore it" cards)
   and the lab pages (title, section, related lessons). `lessons` are workbook lesson ids. */
window.WB_LABS = [
  // ---------- Section A: Mechanics ----------
  { id: 'pendulum', section: 'A', title: 'Simple Pendulum Experiment', blurb: 'Time the swings yourself, change the length and find g from a graph.', lessons: ['week01.1.1', 'week01.1.3', 'week01.1.2'] },
  { id: 'instruments', section: 'A', title: 'Reading Instruments', blurb: 'Practise reading a metre rule, vernier caliper and micrometer screw gauge.', lessons: ['week01.1.4', 'week01.1.3'] },
  { id: 'density', section: 'A', title: 'Density Lab', blurb: 'Weigh objects, use a measuring cylinder and find out what floats.', lessons: ['week01.1.5', 'week04.4.6'] },
  { id: 'vectors', section: 'A', title: 'Vector Adder', blurb: 'Drag two forces and see the resultant, the equilibrant and the components.', lessons: ['week02.2.1', 'week02.2.2'] },
  { id: 'moments', section: 'A', title: 'Balancing Moments', blurb: 'Hang masses on a beam and make the clockwise and anticlockwise moments equal.', lessons: ['week02.2.3', 'week02.2.4'] },
  { id: 'stability', section: 'A', title: 'Stability and Toppling', blurb: 'Tilt an object and watch when its weight falls outside the base.', lessons: ['week02.2.4'] },
  { id: 'hookes-law', section: 'A', title: "Hooke's Law Spring Lab", blurb: 'Load a spring, record a results table and plot force against extension.', lessons: ['week02.2.5'] },
  { id: 'motion-graphs', section: 'A', title: 'Motion Graphs', blurb: 'Drive a car and watch the distance–time and velocity–time graphs being drawn.', lessons: ['week03.3.1', 'week03.3.2'] },
  { id: 'newton', section: 'A', title: "Newton's Laws Track", blurb: 'Push a cart, add friction and see F = ma. Includes a skydiver and terminal velocity.', lessons: ['week03.3.3', 'week03.3.4', 'week02.2.2'] },
  { id: 'momentum', section: 'A', title: 'Collisions and Momentum', blurb: 'Crash two trolleys and check that momentum is conserved.', lessons: ['week03.3.5'] },
  { id: 'energy', section: 'A', title: 'Energy Skate Ramp', blurb: 'Watch GPE turn into KE. Add friction and calculate power and efficiency.', lessons: ['week04.4.1', 'week04.4.3', 'week04.4.4'] },
  { id: 'pressure', section: 'A', title: 'Pressure Lab', blurb: 'Pressure under a block, pressure at depth in a liquid, and a hydraulic jack.', lessons: ['week04.4.5'] },
  { id: 'floating', section: 'A', title: "Archimedes' Principle", blurb: 'Lower an object into a liquid and measure the upthrust.', lessons: ['week04.4.6'] },
  // ---------- Section B: Thermal Physics ----------
  { id: 'particles', section: 'B', title: 'Particles and States of Matter', blurb: 'See how particles move in solids, liquids and gases as you heat them.', lessons: ['week05.5.1', 'week05.5.3', 'week05.5.4', 'week06.6.3'] },
  { id: 'thermometer', section: 'B', title: 'Thermometer and Temperature Scales', blurb: 'Calibrate a thermometer with fixed points and convert °C to kelvin.', lessons: ['week05.5.2', 'week06.6.1'] },
  { id: 'specific-heat', section: 'B', title: 'Specific Heat Capacity', blurb: 'Heat a block with an electric heater and work out c = E ÷ (mΔθ).', lessons: ['week05.5.5'] },
  { id: 'latent-heat', section: 'B', title: 'Heating Curve and Latent Heat', blurb: 'Heat ice until it boils. Find out why the temperature stops rising.', lessons: ['week05.5.6'] },
  { id: 'gas-laws', section: 'B', title: 'Gas Laws Chamber', blurb: "Squeeze or heat a gas and test Boyle's law, Charles' law and the pressure law.", lessons: ['week06.6.1', 'week06.6.2', 'week06.6.3'] },
  { id: 'heat-transfer', section: 'B', title: 'Heat Transfer', blurb: 'Conduction along rods, convection currents and radiation from a Leslie cube.', lessons: ['week06.6.4', 'week06.6.5', 'week06.6.6'] },
  // ---------- Section C: Waves & Optics ----------
  { id: 'waves', section: 'C', title: 'Wave Workshop', blurb: 'Transverse and longitudinal waves. Change f, λ and A and see v = fλ.', lessons: ['week07.7.1', 'week07.7.2', 'week07.7.3'] },
  { id: 'sound', section: 'C', title: 'Sound and Echoes', blurb: 'See pitch and loudness, then time an echo to measure the speed of sound.', lessons: ['week07.7.4', 'week07.7.5'] },
  { id: 'em-spectrum', section: 'C', title: 'Electromagnetic Spectrum Explorer', blurb: 'Slide from radio waves to gamma rays: wavelength, frequency, uses and dangers.', lessons: ['week07.7.6'] },
  { id: 'light-rays', section: 'C', title: 'Ray Box: Reflection and Refraction', blurb: "Mirrors, glass blocks, Snell's law and total internal reflection.", lessons: ['week08.8.3', 'week08.8.4', 'week08.8.5'] },
  { id: 'lenses', section: 'C', title: 'Lens Ray Diagrams', blurb: 'Move the object and watch the image form. Check 1/f = 1/u + 1/v.', lessons: ['week08.8.6'] },
  // ---------- Section D: Electricity & Magnetism ----------
  { id: 'static', section: 'D', title: 'Static Electricity', blurb: 'Rub rods to move electrons, then charge a sphere by induction.', lessons: ['es01.1.1', 'es01.1.2', 'es01.1.3', 'es01.1.4'] },
  { id: 'circuits', section: 'D', title: 'Circuit Builder', blurb: 'Series and parallel circuits with moving charge, ammeters and voltmeters.', lessons: ['week09.9.1', 'week09.9.4', 'week09.9.6'] },
  { id: 'iv-graphs', section: 'D', title: 'I–V Characteristics', blurb: 'Test a resistor, a filament lamp and a diode and plot their I–V graphs.', lessons: ['week09.9.5', 'week10.10.2'] },
  { id: 'home-electricity', section: 'D', title: 'Electricity in the Home', blurb: 'Cost of electricity, choosing a fuse and why the earth wire saves lives.', lessons: ['week09.9.3', 'week10.10.1'] },
  { id: 'logic-gates', section: 'D', title: 'Logic Gates', blurb: 'Switch the inputs and build truth tables for AND, OR, NOT, NAND and NOR.', lessons: ['week10.10.3'] },
  { id: 'magnetism', section: 'D', title: 'Magnetic Fields', blurb: 'Move a compass around a magnet, a wire and a solenoid.', lessons: ['week10.10.4', 'week10.10.5'] },
  { id: 'motor', section: 'D', title: 'Motor Effect and d.c. Motor', blurb: "Fleming's left-hand rule and a spinning motor with a split-ring commutator.", lessons: ['week10.10.6'] },
  { id: 'induction', section: 'D', title: 'Electromagnetic Induction', blurb: 'Push a magnet into a coil and spin a generator. Watch the meter.', lessons: ['week11.11.1', 'week11.11.2', 'week11.11.3'] },
  { id: 'transformer', section: 'D', title: 'Transformers and the Grid', blurb: 'Change the turns to step voltage up or down and see why power lines use high voltage.', lessons: ['week11.11.4', 'week11.11.5'] },
  // ---------- Section E: The Physics of the Atom ----------
  { id: 'atom', section: 'E', title: 'Atom Builder and Gold-Foil Experiment', blurb: 'Build atoms, isotopes and ions, then fire alpha particles at gold.', lessons: ['week12.12.1', 'week12.12.2'] },
  { id: 'radiation', section: 'E', title: 'Alpha, Beta and Gamma', blurb: 'Test what stops each radiation and write balanced decay equations.', lessons: ['week12.12.3', 'week12.12.4'] },
  { id: 'half-life', section: 'E', title: 'Half-Life Simulator', blurb: 'Watch random decay, plot the curve and read off the half-life.', lessons: ['week12.12.5'] },
  { id: 'fission', section: 'E', title: 'Fission Chain Reaction', blurb: 'Fire a neutron at uranium-235 and use control rods to keep the reaction steady.', lessons: ['week12.12.6'] },
];

/* Maths help topics (labs/maths.html#<id>). Lessons link to the skills they need (data/support.js). */
window.WB_MATHS = [
  { id: 'substitute', title: 'Putting numbers into a formula' },
  { id: 'rearrange', title: 'Rearranging a formula' },
  { id: 'units', title: 'Units and converting them' },
  { id: 'prefixes', title: 'Prefixes and powers of ten' },
  { id: 'standard-form', title: 'Standard form' },
  { id: 'sigfigs', title: 'Significant figures and rounding' },
  { id: 'graphs', title: 'Plotting a graph' },
  { id: 'gradient', title: 'Gradient and area under a graph' },
  { id: 'proportion', title: 'Proportion and ratio' },
  { id: 'fractions', title: 'Fractions, reciprocals and percentages' },
  { id: 'powers', title: 'Squares, square roots and powers' },
  { id: 'angles', title: 'Angles and sine' },
];

window.WB_LAB_SECTIONS = { A: ['Mechanics', 't1'], B: ['Thermal Physics', 't7'], C: ['Waves & Optics', 't6'], D: ['Electricity & Magnetism', 't2'], E: ['The Physics of the Atom', 't5'] };

/* Formula coach (labs/formula-coach.html#<id>): which coach formula matches a workbook formula box or card.
   Patterns are tested against the box's TeX (or plain text); first match wins. */
window.WB_COACH = [
  [/^\\rho =m\/V/, 'density'], [/^W=mg$/, 'weight'], [/moment \}=F/, 'moment'], [/^F=kx$/, 'hooke'], [/^a=\(v-u\)\/t/, 'accel'],
  [/^F=ma$/, 'fma'], [/^p=mv$/, 'momentum'], [/^F=\(mv-mu\)/, 'impulse'], [/^W=F\\times d$/, 'work'], [/E_\{p\}=mg/, 'gpe'],
  [/E_\{k\}=/, 'ke'], [/sqrt\{2\\,|sqrt\{2gh\}/, 'fall'], [/^P=E\\div t/, 'power'], [/^\\text\{efficiency \}=/, 'efficiency'],
  [/^P=F\\div A$/, 'pressure'], [/^P=\\rho gh$|atmospheric \}\+\\rho gh/, 'liquidp'], [/mc\\Delta \\theta|m\\Delta \\theta/, 'shc'],
  [/^E_\{H\}=ml$/, 'latent'], [/^l_\{[vf]\}=/, 'latent'], [/^T=\\theta \+273/, 'kelvin'], [/^p_\{1\}V_\{1\}\/T_\{1\}/, 'gaslaw'],
  [/^p_\{1\}V_\{1\}=p_\{2\}V_\{2\}/, 'boyle'], [/^V_\{1\}\/T_\{1\}/, 'charles'], [/^p_\{1\}\/T_\{1\}/, 'pressurelaw'], [/^T=1\/f/, 'period'],
  [/^[vc]=f\\lambda$/, 'wave'], [/^v=2d\/t/, 'echo'], [/^n=\\sin i/, 'snell'], [/^n=c\/v/, 'speedlight'], [/^\\sin c=1\/n$/, 'critical'],
  [/magnification \}m=/, 'magnif'], [/^1\/f=1\/u\+1\/v$/, 'lens'], [/^Q=I\\times t$/, 'charge'], [/^f=1(\\div |\/)T$/, 'period'],
  [/^V=E\\div Q$/, 'pdenergy'], [/^P=I\\times V$/, 'epower'], [/^E=P\\times t=I|^E=Pt=VIt$/, 'eenergy'], [/kWh/, 'kwh'],
  [/^V=I\\times R$/, 'ohm'], [/^R=R_\{1\}\+/, 'series'], [/^1\/R=1\/R_/, 'parallel'], [/^I=P\\div V$/, 'epower'],
  [/^V_\{p\}\/V_\{s\}/, 'transformer'], [/^V_\{p\}I_\{p\}=/, 'tpower'], [/I\^\{2\}R/, 'i2r'], [/^A=Z\+N$/, 'massno'],
  [/half-lives/, 'halflife'], [/^E=mc\^\{2\}$/, 'emc2'], [/^average speed = total distance|^velocity = displacement/, 'speed'],
];
window.WB_coachFor = function (tex) {
  if (!tex) return null;
  for (var i = 0; i < window.WB_COACH.length; i++) if (window.WB_COACH[i][0].test(tex)) return window.WB_COACH[i][1];
  return null;
};

