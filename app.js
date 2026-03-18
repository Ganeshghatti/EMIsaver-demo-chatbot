/* EMIsaver demo chatbot (WhatsApp-style) */

const BRAND = {
  b1: "#832FAD",
  b2: "#4C2AA2",
  b3: "#5B2CA5",
  b4: "#5530A6",
};

const $ = (sel) => document.querySelector(sel);
const messagesEl = $("#messages");
const composerEl = $("#composer");
const textInputEl = $("#textInput");
const restartTopEl = $("#restartTop");

/** @typedef {{ id: string, label: string, value?: string }} QuickReply */
/** @typedef {{ from:'bot'|'user', text?: string, html?: string, quickReplies?: QuickReply[], showRestart?: boolean }} ChatMsg */

const FAQ = [
  {
    q: "What documents are needed for a home loan?",
    a: "Typically: KYC (Aadhaar/PAN), income proof (salary slips / ITR), bank statements (6 months), property documents, and employment/business proof. Exact list varies by lender.",
  },
  {
    q: "What is an EMI?",
    a: "EMI is the Equated Monthly Instalment — a fixed monthly payment that covers interest + principal over the loan tenure.",
  },
  {
    q: "Can I prepay my home loan?",
    a: "Many lenders allow part-prepayment or full pre-closure. Charges depend on lender, loan type (fixed/floating), and your agreement.",
  },
  {
    q: "Fixed vs Floating interest rate — which is better?",
    a: "Fixed gives predictable EMIs; floating can reduce when market rates fall (and increase when rates rise). Choice depends on risk comfort and rate outlook.",
  },
  {
    q: "How much loan can I get?",
    a: "Eligibility depends on income, existing EMIs, tenure, interest rate, and credit profile. Use the Eligibility Check to get a quick estimate in this demo.",
  },
];

const money = (n) => {
  if (!Number.isFinite(n)) return "—";
  try {
    return n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  } catch {
    return String(Math.round(n));
  }
};

function scrollToBottom() {
  requestAnimationFrame(() => {
    messagesEl.scrollTo({
      top: messagesEl.scrollHeight,
      behavior: "smooth",
    });
  });
}

function makeEl(tag, className, html) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (html != null) el.innerHTML = html;
  return el;
}

function bubbleBaseClasses(from) {
  const isUser = from === "user";
  return [
    "max-w-[86%] sm:max-w-[74%]",
    "rounded-[1.35rem]",
    "px-3.5",
    "py-3",
    "text-sm",
    "leading-5",
    "border",
    "backdrop-blur-sm",
    "shadow-[0_14px_28px_rgba(0,0,0,.22)]",
    isUser
      ? "ml-auto bg-[var(--wa-bubble-user)] border-white/10 text-white"
      : "mr-auto bg-[var(--wa-bubble-bot)] border-white/10 text-[var(--wa-text)]",
  ].join(" ");
}

function renderQuickReplies(qrs, onPick) {
  const wrap = makeEl("div", "mt-3 flex flex-wrap gap-2");

  qrs.forEach((qr) => {
    const btn = makeEl(
      "button",
      [
        "text-xs",
        "px-3",
        "py-2.5",
        "rounded-full",
        "border",
        "border-white/10",
        "bg-white/[0.06]",
        "hover:bg-white/[0.12]",
        "active:bg-white/[0.16]",
        "transition",
        "text-[var(--wa-text)]",
        "backdrop-blur-sm",
      ].join(" "),
      escapeHtml(qr.label)
    );
    btn.type = "button";
    btn.addEventListener("click", () => onPick(qr));
    wrap.appendChild(btn);
  });

  return wrap;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function addMessage(msg) {
  /** @type {ChatMsg} */
  const safe = {
    from: msg.from,
    text: msg.text,
    html: msg.html,
    quickReplies: msg.quickReplies,
    showRestart: msg.showRestart ?? (msg.from === "bot"),
  };

  const row = makeEl("div", "w-full");
  const bubble = makeEl("div", bubbleBaseClasses(safe.from));

  if (safe.html) {
    bubble.innerHTML = safe.html;
  } else {
    bubble.innerHTML = `<div class="whitespace-pre-wrap">${escapeHtml(
      safe.text ?? ""
    )}</div>`;
  }

  row.appendChild(bubble);

  const quickReplies = [...(safe.quickReplies ?? [])];
  if (
    safe.from === "bot" &&
    safe.showRestart &&
    !quickReplies.some((qr) => qr.label.toLowerCase() === "restart")
  ) {
    quickReplies.push({ id: "restart", label: "Restart", value: "restart" });
  }

  if (quickReplies.length) {
    const qrs = renderQuickReplies(quickReplies, (qr) => {
      // mimic WhatsApp: clicking a button sends that text
      handleUserText(qr.value ?? qr.label);
    });
    bubble.appendChild(qrs);
  }

  messagesEl.appendChild(row);
  scrollToBottom();
}

// --- Chat flow state machine ---

const STATE = {
  route: "root", // root | eligibility | emi | faq
  step: "welcome", // route-specific step
  data: {},
};

function setRoute(route, step = "start") {
  STATE.route = route;
  STATE.step = step;
  STATE.data = {};
}

function restart() {
  messagesEl.innerHTML = "";
  STATE.route = "root";
  STATE.step = "welcome";
  STATE.data = {};
  welcome();
}

function welcome() {
  addMessage({
    from: "bot",
    html: `
      <div class="flex items-start gap-3">
        <div class="w-10 h-10 rounded-2xl overflow-hidden border border-white/20 bg-white grid place-items-center shrink-0 shadow-[0_8px_20px_rgba(255,255,255,.08)]">
          <img src="./logo.svg" alt="EMIsaver" class="w-6 h-auto" />
        </div>
        <div class="min-w-0">
          <div class="font-semibold">Welcome to EMIsaver</div>
          <div class="text-white/75 mt-1">
            I can help you with a quick home loan guidance demo.
          </div>
          <div class="text-white/60 text-[12px] mt-2">
            Choose one option to begin.
          </div>
        </div>
      </div>
    `,
    showRestart: false,
    quickReplies: [
      { id: "elig", label: "Loan Eligibility Check" },
      { id: "emi", label: "EMI Calculator" },
      { id: "faq", label: "Common queries" },
    ],
  });
}

function askEligibilityIncome() {
  STATE.route = "eligibility";
  STATE.step = "income";
  addMessage({
    from: "bot",
    text:
      "Loan Eligibility Check\n\nWhat is your monthly net income (₹)?\n(You can tap an option or type a number.)",
    quickReplies: [
      { id: "i1", label: "₹50,000", value: "50000" },
      { id: "i2", label: "₹75,000", value: "75000" },
      { id: "i3", label: "₹1,00,000", value: "100000" },
      { id: "i4", label: "₹1,50,000", value: "150000" },
      { id: "i5", label: "₹2,00,000+", value: "200000" },
    ],
  });
}

function askEligibilityObligations() {
  STATE.step = "obligations";
  addMessage({
    from: "bot",
    text:
      "How much do you pay monthly in existing EMIs / obligations (₹)?\n(Examples: car loan, credit card EMIs, personal loan.)",
    quickReplies: [
      { id: "o1", label: "₹0", value: "0" },
      { id: "o2", label: "₹10,000", value: "10000" },
      { id: "o3", label: "₹20,000", value: "20000" },
      { id: "o4", label: "₹30,000", value: "30000" },
      { id: "o5", label: "₹50,000", value: "50000" },
    ],
  });
}

function askEligibilityTenure() {
  STATE.step = "tenure";
  addMessage({
    from: "bot",
    text: "Preferred loan tenure (years)?",
    quickReplies: [
      { id: "t10", label: "10 years", value: "10" },
      { id: "t15", label: "15 years", value: "15" },
      { id: "t20", label: "20 years", value: "20" },
      { id: "t25", label: "25 years", value: "25" },
      { id: "t30", label: "30 years", value: "30" },
    ],
  });
}

function askEligibilityRate() {
  STATE.step = "rate";
  addMessage({
    from: "bot",
    text: "Expected interest rate (annual %)?",
    quickReplies: [
      { id: "r85", label: "8.5%", value: "8.5" },
      { id: "r9", label: "9.0%", value: "9.0" },
      { id: "r95", label: "9.5%", value: "9.5" },
      { id: "r10", label: "10.0%", value: "10.0" },
      { id: "rCustom", label: "Type my own", value: "" },
    ],
  });
}

function computeEligibilityAndRespond() {
  const income = Number(STATE.data.income);
  const obligations = Number(STATE.data.obligations);
  const years = Number(STATE.data.tenureYears);
  const annualRate = Number(STATE.data.annualRate);

  // Simple demo rule:
  // - Allow up to 40% of (income - obligations) as EMI capacity (DTI style).
  const disposable = Math.max(0, income - obligations);
  const maxEmi = Math.max(0, disposable * 0.4);

  // Convert EMI capacity -> loan principal using standard EMI formula.
  // EMI = P * r * (1+r)^n / ((1+r)^n - 1)
  // => P = EMI * ((1+r)^n - 1) / (r * (1+r)^n)
  const r = annualRate / 12 / 100;
  const n = years * 12;
  let eligible = 0;
  if (r > 0 && n > 0) {
    const pow = Math.pow(1 + r, n);
    eligible = maxEmi * (pow - 1) / (r * pow);
  }

  addMessage({
    from: "bot",
    html: `
      <div class="font-semibold">Eligibility estimate</div>
      <div class="mt-2 text-white/80">
        Based on a simple demo rule (max EMI ≈ <b>40%</b> of disposable income):
      </div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Monthly income</div>
          <div class="mt-1 font-semibold">₹${money(income)}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Existing obligations</div>
          <div class="mt-1 font-semibold">₹${money(obligations)}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Max affordable EMI</div>
          <div class="mt-1 font-semibold">₹${money(maxEmi)}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Estimated eligible loan</div>
          <div class="mt-1 font-semibold">₹${money(eligible)}</div>
        </div>
      </div>
      <div class="mt-3 text-[11px] text-white/55">
        Tenure: ${years}y · Rate: ${annualRate}% p.a. · For presentation/demo only.
      </div>
      <div class="mt-3 text-white/80">Want to do something else?</div>
    `,
    quickReplies: [
      { id: "doEmi", label: "EMI Calculator" },
      { id: "doFaq", label: "Common queries" },
      { id: "home", label: "Back to start" },
    ],
  });

  // After answer, keep at root so user can pick next.
  STATE.route = "root";
  STATE.step = "welcome";
  STATE.data = {};
}

function askEmiAmount() {
  STATE.route = "emi";
  STATE.step = "amount";
  addMessage({
    from: "bot",
    text:
      "EMI Calculator\n\nWhat loan amount do you want (₹)?\n(Tap an option or type a number.)",
    quickReplies: [
      { id: "a20", label: "₹20,00,000", value: "2000000" },
      { id: "a35", label: "₹35,00,000", value: "3500000" },
      { id: "a50", label: "₹50,00,000", value: "5000000" },
      { id: "a75", label: "₹75,00,000", value: "7500000" },
      { id: "a100", label: "₹1,00,00,000", value: "10000000" },
    ],
  });
}

function askEmiRate() {
  STATE.step = "rate";
  addMessage({
    from: "bot",
    text: "Interest rate (annual %)?",
    quickReplies: [
      { id: "r85", label: "8.5%", value: "8.5" },
      { id: "r9", label: "9.0%", value: "9.0" },
      { id: "r95", label: "9.5%", value: "9.5" },
      { id: "r10", label: "10.0%", value: "10.0" },
      { id: "rCustom", label: "Type my own", value: "" },
    ],
  });
}

function askEmiTenure() {
  STATE.step = "tenure";
  addMessage({
    from: "bot",
    text: "Tenure (years)?",
    quickReplies: [
      { id: "t10", label: "10 years", value: "10" },
      { id: "t15", label: "15 years", value: "15" },
      { id: "t20", label: "20 years", value: "20" },
      { id: "t25", label: "25 years", value: "25" },
      { id: "t30", label: "30 years", value: "30" },
    ],
  });
}

function computeEmiAndRespond() {
  const P = Number(STATE.data.amount);
  const annualRate = Number(STATE.data.annualRate);
  const years = Number(STATE.data.tenureYears);
  const r = annualRate / 12 / 100;
  const n = years * 12;
  let emi = 0;
  let total = 0;
  let interest = 0;

  if (r > 0 && n > 0) {
    const pow = Math.pow(1 + r, n);
    emi = (P * r * pow) / (pow - 1);
    total = emi * n;
    interest = total - P;
  }

  addMessage({
    from: "bot",
    html: `
      <div class="font-semibold">EMI result</div>
      <div class="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Monthly EMI</div>
          <div class="mt-1 font-semibold">₹${money(emi)}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Total interest</div>
          <div class="mt-1 font-semibold">₹${money(interest)}</div>
        </div>
        <div class="rounded-xl border border-white/10 bg-white/5 p-3">
          <div class="text-xs text-white/55">Total payment</div>
          <div class="mt-1 font-semibold">₹${money(total)}</div>
        </div>
      </div>
      <div class="mt-3 text-[11px] text-white/55">
        Principal: ₹${money(P)} · Tenure: ${years}y · Rate: ${annualRate}% p.a.
      </div>
      <div class="mt-3 text-white/80">What would you like to do next?</div>
    `,
    quickReplies: [
      { id: "doElig", label: "Loan Eligibility Check" },
      { id: "doFaq", label: "Common queries" },
      { id: "home", label: "Back to start" },
    ],
  });

  STATE.route = "root";
  STATE.step = "welcome";
  STATE.data = {};
}

function showFaqMenu() {
  STATE.route = "faq";
  STATE.step = "menu";
  addMessage({
    from: "bot",
    text: "Common queries\n\nPick a question:",
    quickReplies: [
      ...FAQ.slice(0, 5).map((x, idx) => ({
        id: `faq${idx}`,
        label: x.q,
      })),
      { id: "home", label: "Back to start" },
    ],
  });
}

function answerFaq(questionText) {
  const hit = FAQ.find((x) => x.q.toLowerCase() === questionText.toLowerCase());
  addMessage({
    from: "bot",
    text: hit ? hit.a : "I didn’t find that question in this demo list.",
    quickReplies: [
      { id: "moreFaq", label: "More common queries" },
      { id: "home", label: "Back to start" },
    ],
  });

  STATE.route = "faq";
  STATE.step = "menu";
}

// --- Input handling ---

function normalizeText(s) {
  return String(s || "").trim();
}

function parseNumberLoose(s) {
  const cleaned = String(s)
    .toLowerCase()
    .replaceAll(/[,₹\s]/g, "")
    .replaceAll(/lakhs?|lacs?/g, "00000")
    .replaceAll(/crores?|cr/g, "0000000");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

function addUser(text) {
  addMessage({ from: "user", text });
}

function handleRootSelection(text) {
  const t = text.toLowerCase();
  if (t.includes("elig")) return askEligibilityIncome();
  if (t.includes("emi")) return askEmiAmount();
  if (t.includes("common") || t.includes("query") || t.includes("faq"))
    return showFaqMenu();

  // Fallback: re-show options
  addMessage({
    from: "bot",
    text: "Please choose one of the options below.",
    quickReplies: [
      { id: "elig", label: "Loan Eligibility Check" },
      { id: "emi", label: "EMI Calculator" },
      { id: "faq", label: "Common queries" },
    ],
  });
}

function handleEligibility(text) {
  if (STATE.step === "income") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n <= 0) {
      addMessage({
        from: "bot",
        text: "Please enter a valid monthly income in ₹ (e.g., 75000).",
      });
      return;
    }
    STATE.data.income = n;
    return askEligibilityObligations();
  }

  if (STATE.step === "obligations") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n < 0) {
      addMessage({
        from: "bot",
        text: "Please enter a valid monthly obligation amount (₹).",
      });
      return;
    }
    STATE.data.obligations = n;
    return askEligibilityTenure();
  }

  if (STATE.step === "tenure") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n <= 0 || n > 40) {
      addMessage({
        from: "bot",
        text: "Please enter a valid tenure in years (e.g., 20).",
      });
      return;
    }
    STATE.data.tenureYears = n;
    return askEligibilityRate();
  }

  if (STATE.step === "rate") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n <= 0 || n > 25) {
      addMessage({
        from: "bot",
        text: "Please enter a valid interest rate (e.g., 9.0).",
      });
      return;
    }
    STATE.data.annualRate = n;
    return computeEligibilityAndRespond();
  }
}

function handleEmi(text) {
  if (STATE.step === "amount") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n <= 0) {
      addMessage({
        from: "bot",
        text: "Please enter a valid loan amount in ₹ (e.g., 3500000).",
      });
      return;
    }
    STATE.data.amount = n;
    return askEmiRate();
  }

  if (STATE.step === "rate") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n <= 0 || n > 25) {
      addMessage({
        from: "bot",
        text: "Please enter a valid interest rate (e.g., 8.5).",
      });
      return;
    }
    STATE.data.annualRate = n;
    return askEmiTenure();
  }

  if (STATE.step === "tenure") {
    const n = parseNumberLoose(text);
    if (!Number.isFinite(n) || n <= 0 || n > 40) {
      addMessage({
        from: "bot",
        text: "Please enter a valid tenure in years (e.g., 20).",
      });
      return;
    }
    STATE.data.tenureYears = n;
    return computeEmiAndRespond();
  }
}

function handleFaq(text) {
  const t = text.toLowerCase();
  if (t.includes("back") || t.includes("start") || t === "home") {
    return welcome();
  }
  if (t.includes("more")) return showFaqMenu();
  return answerFaq(text);
}

function handleUserText(text) {
  const raw = normalizeText(text);
  if (!raw) return;

  // User message bubble
  addUser(raw);

  const t = raw.toLowerCase();
  if (t === "restart" || t === "/restart") {
    restart();
    return;
  }

  // Global shortcuts after answers
  if (t.includes("back to start") || t === "start") {
    welcome();
    return;
  }

  if (t.includes("loan eligibility")) {
    askEligibilityIncome();
    return;
  }
  if (t.includes("emi calculator")) {
    askEmiAmount();
    return;
  }
  if (t.includes("common queries")) {
    showFaqMenu();
    return;
  }

  // Route handling
  if (STATE.route === "eligibility") return handleEligibility(raw);
  if (STATE.route === "emi") return handleEmi(raw);
  if (STATE.route === "faq") return handleFaq(raw);

  return handleRootSelection(raw);
}

function autoGrowTextarea() {
  textInputEl.style.height = "auto";
  const h = Math.min(textInputEl.scrollHeight, 112);
  textInputEl.style.height = `${h}px`;
}

// --- Wire up ---

composerEl.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = textInputEl.value;
  textInputEl.value = "";
  autoGrowTextarea();
  handleUserText(text);
});

textInputEl.addEventListener("input", () => autoGrowTextarea());
textInputEl.addEventListener("keydown", (e) => {
  // Enter to send, Shift+Enter for newline (WhatsApp-ish)
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    $("#sendBtn").click();
  }
});

restartTopEl.addEventListener("click", () => restart());

// Init
restart();

