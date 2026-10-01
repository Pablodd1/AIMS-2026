function hexToRgb(hex) {
  hex = hex.replace('#', '');
  return [
    parseInt(hex.slice(0, 2), 16),
    parseInt(hex.slice(2, 4), 16),
    parseInt(hex.slice(4, 6), 16)
  ];
}

function luminance([r, g, b]) {
  const a = [r, g, b].map(v => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}

function contrast(hex1, hex2) {
  const l1 = luminance(hexToRgb(hex1));
  const l2 = luminance(hexToRgb(hex2));
  return ((Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05)).toFixed(2);
}

const tests = [
  // Light mode
  { name: "Light Mode: Text Primary on White Surface", fg: "#0f172a", bg: "#ffffff" },
  { name: "Light Mode: Text Primary on Slate-50 App BG", fg: "#0f172a", bg: "#f8fafc" },
  { name: "Light Mode: Text Secondary on White Surface", fg: "#475569", bg: "#ffffff" },
  { name: "Light Mode: Text Secondary on Slate-50 App BG", fg: "#475569", bg: "#f8fafc" },
  { name: "Light Mode: Text Muted on White Surface", fg: "#94a3b8", bg: "#ffffff" },
  { name: "Light Mode: Danger Text on Danger BG", fg: "#991b1b", bg: "#fef2f2" },
  { name: "Light Mode: Warning Text on Warning BG", fg: "#92400e", bg: "#fffbeb" },
  { name: "Light Mode: Success Text on Success BG", fg: "#166534", bg: "#f0fdf4" },
  { name: "Light Mode: Info Text on Info BG", fg: "#075985", bg: "#f0f9ff" },
  { name: "Light Mode: White on Primary-500", fg: "#ffffff", bg: "#0284c7" },
  { name: "Light Mode: White on Primary-600", fg: "#ffffff", bg: "#0369a1" },
  { name: "Light Mode: White on Primary-700", fg: "#ffffff", bg: "#075985" },
  
  // Dark mode
  { name: "Dark Mode: Text Primary on Midnight App BG", fg: "#f8fafc", bg: "#0b0f19" },
  { name: "Dark Mode: Text Primary on Card Surface", fg: "#f8fafc", bg: "#131b2e" },
  { name: "Dark Mode: Text Secondary on Midnight App BG", fg: "#cbd5e1", bg: "#0b0f19" },
  { name: "Dark Mode: Text Secondary on Card Surface", fg: "#cbd5e1", bg: "#131b2e" },
  { name: "Dark Mode: Text Muted on Card Surface", fg: "#64748b", bg: "#131b2e" },
  { name: "Dark Mode: Danger Text on Danger BG", fg: "#fca5a5", bg: "#450a0a" },
  { name: "Dark Mode: Warning Text on Warning BG", fg: "#fde68a", bg: "#451a03" },
  { name: "Dark Mode: Success Text on Success BG", fg: "#86efac", bg: "#052e16" },
  { name: "Dark Mode: Info Text on Info BG", fg: "#7dd3fc", bg: "#082f49" },
];

console.log("=== WCAG 2.1 AA CONTRAST RATIO VERIFICATION ===");
tests.forEach(t => {
  const cr = parseFloat(contrast(t.fg, t.bg));
  let status;
  if (cr >= 4.5) {
    status = "PASS AA (Normal Text >= 4.5:1)";
  } else if (cr >= 3.0) {
    status = "PASS AA Large/UI (>= 3.0:1, Fails Normal Text)";
  } else {
    status = "FAIL AA (< 3.0:1)";
  }
  console.log(`${t.name.padEnd(50)} | ${cr.toFixed(2)}:1 | ${status}`);
});
