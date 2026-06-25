const categories = [
  { id: "food", name: "Alimentacao", short: "AL", color: "#d97920", group: "needs" },
  { id: "transport", name: "Transporte", short: "TR", color: "#315f8f", group: "needs" },
  { id: "leisure", name: "Lazer", short: "LA", color: "#7b4ba0" },
  { id: "housing", name: "Casa", short: "CA", color: "#23806f", group: "needs" },
  { id: "health", name: "Saude", short: "SA", color: "#b0443f", group: "needs" },
  { id: "shopping", name: "Compras", short: "CO", color: "#be4d79" },
  { id: "other", name: "Outros", short: "OU", color: "#65706b" }
];

const budgetRule = [
  { id: "needs", name: "Necessidades", target: 0.5, color: "#315f8f" },
  { id: "wants", name: "Desejos", target: 0.3, color: "#a46a12" },
  { id: "savings", name: "Reserva", target: 0.2, color: "#195c47" }
];

const storageKey = "saldoCerto.web.v1";

const state = loadState();
const settingsForm = document.querySelector("#settingsForm");
const incomeForm = document.querySelector("#incomeForm");
const expenseForm = document.querySelector("#expenseForm");
const categorySelect = expenseForm.elements.category;
const clearMonthButton = document.querySelector("#clearMonthButton");
const clearIncomeButton = document.querySelector("#clearIncomeButton");

if (state.extraIncomeMigrated) {
  saveState();
}

function loadState() {
  const fallback = {
    settings: { salary: 0, fixedCosts: 0, savingsGoal: 0 },
    expenses: [],
    incomes: []
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    return normalizeState(saved || fallback);
  } catch {
    return fallback;
  }
}

function normalizeState(saved) {
  const incomes = Array.isArray(saved.incomes) ? saved.incomes : [];
  const migratedExtraIncome = saved.settings?.extraIncome || 0;

  if (migratedExtraIncome > 0 && !saved.extraIncomeMigrated) {
    incomes.unshift({
      id: createId(),
      title: "Renda extra",
      amount: migratedExtraIncome,
      date: localDateValue(),
      createdAt: Date.now()
    });
    saved.extraIncomeMigrated = true;
  }

  return {
    settings: {
      salary: saved.settings?.salary || 0,
      fixedCosts: saved.settings?.fixedCosts || 0,
      savingsGoal: saved.settings?.savingsGoal || 0
    },
    expenses: Array.isArray(saved.expenses) ? saved.expenses : [],
    incomes,
    extraIncomeMigrated: Boolean(saved.extraIncomeMigrated || migratedExtraIncome > 0)
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function parseMoney(value) {
  const normalized = String(value || "")
    .replace(/\./g, "")
    .replace(",", ".")
    .replace(/[^0-9.]/g, "");

  return Number.parseFloat(normalized) || 0;
}

function formatMoney(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
  }).format(value || 0);
}

function formatInput(value) {
  return value ? value.toFixed(2).replace(".", ",") : "";
}

function localDateValue(date = new Date()) {
  const offset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - offset * 60000);
  return local.toISOString().slice(0, 10);
}

function getMonthBounds() {
  const now = new Date();
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 1, 1),
    days: new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate(),
    day: now.getDate()
  };
}

function currentMonthExpenses() {
  const { start, end } = getMonthBounds();
  return state.expenses
    .filter((expense) => {
      const date = new Date(expense.date + "T12:00:00");
      return date >= start && date < end;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function currentMonthIncomes() {
  const { start, end } = getMonthBounds();
  return state.incomes
    .filter((income) => {
      const date = new Date(income.date + "T12:00:00");
      return date >= start && date < end;
    })
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
}

function totals() {
  const settings = state.settings;
  const month = getMonthBounds();
  const extraIncome = currentMonthIncomes().reduce((sum, income) => sum + income.amount, 0);
  const totalIncome = settings.salary + extraIncome;
  const monthlyBudget = Math.max(totalIncome - settings.fixedCosts - settings.savingsGoal, 0);
  const spent = currentMonthExpenses().reduce((sum, expense) => sum + expense.amount, 0);
  const remaining = monthlyBudget - spent;
  const idealDaily = monthlyBudget > 0 ? monthlyBudget / month.days : 0;
  const remainingDays = Math.max(month.days - month.day + 1, 1);
  const dailyLimit = remaining > 0 ? remaining / remainingDays : 0;
  const expectedSpent = idealDaily * Math.min(Math.max(month.day, 1), month.days);
  const pace = expectedSpent > 0 ? spent / expectedSpent : 0;

  let health = {
    key: "great",
    icon: "OK",
    title: "Ritmo saudavel",
    subtitle: "Seu gasto atual esta dentro do que sua renda comporta."
  };

  if (monthlyBudget <= 0) {
    health = {
      key: "great",
      icon: "INI",
      title: "Informe seu planejamento",
      subtitle: "Preencha renda, custos fixos e reserva para calcular seu limite."
    };
  } else if (pace >= 1.1) {
    health = {
      key: "danger",
      icon: "AL",
      title: "Voce esta gastando demais",
      subtitle: "O gasto acumulado esta acima do esperado para o dia de hoje."
    };
  } else if (pace >= 0.95) {
    health = {
      key: "attention",
      icon: "AT",
      title: "Atencao aos gastos",
      subtitle: "O gasto esta perto do limite ideal para este ponto do mes."
    };
  }

  return { totalIncome, extraIncome, monthlyBudget, spent, remaining, idealDaily, remainingDays, dailyLimit, health };
}

function render() {
  const result = totals();
  const monthName = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(new Date());

  document.querySelector("#monthLabel").textContent = monthName;
  document.querySelector("#remainingBudget").textContent = formatMoney(result.remaining);
  document.querySelector("#dailyLimit").textContent = formatMoney(result.dailyLimit);
  document.querySelector("#totalIncome").textContent = formatMoney(result.totalIncome);
  document.querySelector("#extraIncomeTotal").textContent = formatMoney(result.extraIncome);
  document.querySelector("#monthlyBudget").textContent = formatMoney(result.monthlyBudget);
  document.querySelector("#spentMonth").textContent = formatMoney(result.spent);
  document.querySelector("#idealDaily").textContent = formatMoney(result.idealDaily);
  document.querySelector("#remainingDays").textContent = String(result.remainingDays);
  document.querySelector("#healthIcon").textContent = result.health.icon;
  document.querySelector("#healthTitle").textContent = result.health.title;
  document.querySelector("#healthSubtitle").textContent = result.health.subtitle;

  const panel = document.querySelector("#statusPanel");
  panel.className = `status-panel ${result.health.key === "great" ? "" : result.health.key}`;

  renderCategoryBars();
  renderBudgetRule();
  renderAdvice(result);
  renderIncomes();
  renderExpenses();
}

function budgetRuleTotals() {
  const expenses = currentMonthExpenses();
  const needsCategoryTotal = expenses
    .filter((expense) => {
      const category = categories.find((item) => item.id === expense.category);
      return category && category.group === "needs";
    })
    .reduce((sum, expense) => sum + expense.amount, 0);
  const wantsTotal = expenses
    .filter((expense) => {
      const category = categories.find((item) => item.id === expense.category);
      return !category || category.group !== "needs";
    })
    .reduce((sum, expense) => sum + expense.amount, 0);

  return {
    needs: state.settings.fixedCosts + needsCategoryTotal,
    wants: wantsTotal,
    savings: state.settings.savingsGoal
  };
}

function renderBudgetRule() {
  const container = document.querySelector("#ruleGrid");
  const totalIncome = totals().totalIncome;
  const actual = budgetRuleTotals();

  if (totalIncome <= 0) {
    container.innerHTML = `<p class="empty-state">Informe sua renda para ver a divisao 50/30/20.</p>`;
    return;
  }

  container.innerHTML = budgetRule
    .map((rule) => {
      const targetValue = totalIncome * rule.target;
      const actualValue = actual[rule.id] || 0;
      const percentage = (actualValue / totalIncome) * 100;
      const targetPercentage = rule.target * 100;
      const width = Math.min(Math.max(percentage, 2), 100);
      const difference = targetValue - actualValue;
      const status = difference >= 0 ? "Dentro" : "Acima";
      const statusClass = difference >= 0 ? "ok" : "over";

      return `
        <article class="rule-card">
          <div class="rule-card-head">
            <div>
              <span>${rule.name}</span>
              <strong>${targetPercentage.toFixed(0)}%</strong>
            </div>
            <em class="${statusClass}">${status}</em>
          </div>
          <div class="rule-progress" aria-hidden="true">
            <div style="width:${width}%;background:${rule.color}"></div>
          </div>
          <div class="rule-numbers">
            <span>Usado: ${formatMoney(actualValue)} (${percentage.toFixed(1).replace(".", ",")}%)</span>
            <span>Meta: ${formatMoney(targetValue)}</span>
          </div>
          <small>${difference >= 0 ? "Ainda cabe " : "Passou "}${formatMoney(Math.abs(difference))}</small>
        </article>
      `;
    })
    .join("");
}

function buildAdvice(result) {
  const totalIncome = result.totalIncome;
  const ruleActual = budgetRuleTotals();
  const advice = [];

  if (totalIncome <= 0) {
    return [
      {
        level: "info",
        title: "Comece pela renda liquida",
        text: "Use o valor que realmente cai na conta e lance entradas extras quando elas acontecerem."
      },
      {
        level: "info",
        title: "Separe fixos, desejos e reserva",
        text: "Depois de preencher o planejamento, o app compara tudo com a regra 50/30/20 automaticamente."
      }
    ];
  }

  if (result.remaining < 0) {
    advice.push({
      level: "danger",
      title: "Saldo negativo no mes",
      text: `Voce passou ${formatMoney(Math.abs(result.remaining))} do orcamento. Segure gastos de desejos ate voltar para perto de zero.`
    });
  } else if (result.remaining < result.idealDaily * 3) {
    advice.push({
      level: "warning",
      title: "Pouca folga ate o fim do mes",
      text: "Seu saldo ainda esta positivo, mas a margem esta curta. Evite compras parceladas ou gastos por impulso agora."
    });
  }

  const needsLimit = totalIncome * 0.5;
  const wantsLimit = totalIncome * 0.3;
  const savingsTarget = totalIncome * 0.2;

  if (ruleActual.needs > needsLimit) {
    advice.push({
      level: "warning",
      title: "Necessidades acima de 50%",
      text: "Revise contas fixas, planos, assinaturas e compras de mercado. Pequenos fixos somados travam o mes."
    });
  }

  if (ruleActual.wants > wantsLimit) {
    advice.push({
      level: "warning",
      title: "Desejos acima de 30%",
      text: "Lazer e compras passaram do ideal. Defina um teto semanal para esses gastos antes de comprar."
    });
  }

  if (ruleActual.savings < savingsTarget) {
    advice.push({
      level: "info",
      title: "Reserva abaixo dos 20%",
      text: `A meta ideal seria ${formatMoney(savingsTarget)}. Se nao der agora, comece com um valor fixo menor e aumente aos poucos.`
    });
  } else {
    advice.push({
      level: "success",
      title: "Reserva bem posicionada",
      text: "Sua reserva esta dentro da regra 50/30/20. Trate esse valor como uma conta obrigatoria do mes."
    });
  }

  advice.push({
    level: "info",
    title: "Use o limite diario como freio",
    text: `Hoje o app sugere ate ${formatMoney(result.dailyLimit)}. Quando passar disso, compense gastando menos no dia seguinte.`
  });

  advice.push({
    level: "info",
    title: "Registre na hora",
    text: "Lancar o gasto no momento da compra evita esquecer despesas pequenas, que normalmente sao as que somem do radar."
  });

  return advice.slice(0, 5);
}

function renderAdvice(result) {
  const container = document.querySelector("#adviceList");
  const advice = buildAdvice(result);

  container.innerHTML = advice
    .map((item) => `
      <article class="advice-item ${item.level}">
        <div class="advice-mark" aria-hidden="true">${adviceIcon(item.level)}</div>
        <div>
          <strong>${item.title}</strong>
          <p>${item.text}</p>
        </div>
      </article>
    `)
    .join("");
}

function adviceIcon(level) {
  switch (level) {
    case "danger": return "!";
    case "warning": return "AT";
    case "success": return "OK";
    default: return "D";
  }
}

function renderCategoryBars() {
  const container = document.querySelector("#categoryBars");
  const expenses = currentMonthExpenses();
  const totalsByCategory = categories.map((category) => ({
    ...category,
    total: expenses
      .filter((expense) => expense.category === category.id)
      .reduce((sum, expense) => sum + expense.amount, 0)
  }));
  const max = Math.max(...totalsByCategory.map((item) => item.total), 0);

  if (max <= 0) {
    container.innerHTML = `<p class="empty-state">Nenhuma categoria com gastos neste mes.</p>`;
    return;
  }

  container.innerHTML = totalsByCategory
    .filter((item) => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .map((item) => {
      const width = Math.max((item.total / max) * 100, 4);
      return `
        <div class="category-row">
          <div class="category-name">
            <span class="category-mark" style="background:${item.color}"></span>
            <span>${item.name}</span>
          </div>
          <div class="bar-track" aria-hidden="true">
            <div class="bar-fill" style="width:${width}%;background:${item.color}"></div>
          </div>
          <div class="category-value">${formatMoney(item.total)}</div>
        </div>
      `;
    })
    .join("");
}

function renderExpenses() {
  const list = document.querySelector("#expenseList");
  const expenses = currentMonthExpenses();

  if (!expenses.length) {
    list.innerHTML = `<p class="empty-state">Nenhuma despesa registrada ainda.</p>`;
    return;
  }

  list.innerHTML = expenses
    .map((expense) => {
      const category = categories.find((item) => item.id === expense.category) || categories.at(-1);
      const date = new Date(expense.date + "T12:00:00");
      const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);

      return `
        <article class="expense-item">
          <div class="expense-badge" style="background:${category.color}">${category.short}</div>
          <div class="expense-main">
            <strong>${escapeHtml(expense.title)}</strong>
            <span>${category.name} - ${dateLabel}</span>
          </div>
          <div class="expense-value">
            <strong>${formatMoney(expense.amount)}</strong>
            <span>${expense.date}</span>
          </div>
          <button class="delete-button" type="button" data-delete="${expense.id}" aria-label="Excluir despesa">x</button>
        </article>
      `;
    })
    .join("");
}

function renderIncomes() {
  const list = document.querySelector("#incomeList");
  const incomes = currentMonthIncomes();

  if (!incomes.length) {
    list.innerHTML = `<p class="empty-state">Nenhuma renda extra registrada ainda.</p>`;
    return;
  }

  list.innerHTML = incomes
    .map((income) => {
      const date = new Date(income.date + "T12:00:00");
      const dateLabel = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "short" }).format(date);

      return `
        <article class="expense-item income-item">
          <div class="expense-badge income-badge">RE</div>
          <div class="expense-main">
            <strong>${escapeHtml(income.title)}</strong>
            <span>Renda extra - ${dateLabel}</span>
          </div>
          <div class="expense-value income-value">
            <strong>${formatMoney(income.amount)}</strong>
            <span>${income.date}</span>
          </div>
          <button class="delete-button" type="button" data-delete-income="${income.id}" aria-label="Excluir renda extra">x</button>
        </article>
      `;
    })
    .join("");
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function createId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function fillForms() {
  settingsForm.elements.salary.value = formatInput(state.settings.salary);
  settingsForm.elements.fixedCosts.value = formatInput(state.settings.fixedCosts);
  settingsForm.elements.savingsGoal.value = formatInput(state.settings.savingsGoal);
  incomeForm.elements.date.value = localDateValue();
  expenseForm.elements.date.value = localDateValue();

  categorySelect.innerHTML = categories
    .map((category) => `<option value="${category.id}">${category.name}</option>`)
    .join("");
}

settingsForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.settings = {
    salary: parseMoney(settingsForm.elements.salary.value),
    fixedCosts: parseMoney(settingsForm.elements.fixedCosts.value),
    savingsGoal: parseMoney(settingsForm.elements.savingsGoal.value)
  };
  saveState();
  fillForms();
  render();
});

incomeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = incomeForm.elements.title.value.trim();
  const amount = parseMoney(incomeForm.elements.amount.value);

  if (!title || amount <= 0) {
    return;
  }

  state.incomes.unshift({
    id: createId(),
    title,
    amount,
    date: incomeForm.elements.date.value || localDateValue(),
    createdAt: Date.now()
  });

  saveState();
  incomeForm.reset();
  incomeForm.elements.date.value = localDateValue();
  render();
});

expenseForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const title = expenseForm.elements.title.value.trim();
  const amount = parseMoney(expenseForm.elements.amount.value);

  if (!title || amount <= 0) {
    return;
  }

  state.expenses.unshift({
    id: createId(),
    title,
    amount,
    category: expenseForm.elements.category.value,
    date: expenseForm.elements.date.value || localDateValue(),
    createdAt: Date.now()
  });

  saveState();
  expenseForm.reset();
  expenseForm.elements.date.value = localDateValue();
  render();
});

document.querySelector("#expenseList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  state.expenses = state.expenses.filter((expense) => expense.id !== button.dataset.delete);
  saveState();
  render();
});

document.querySelector("#incomeList").addEventListener("click", (event) => {
  const button = event.target.closest("[data-delete-income]");
  if (!button) return;

  state.incomes = state.incomes.filter((income) => income.id !== button.dataset.deleteIncome);
  saveState();
  render();
});

clearMonthButton.addEventListener("click", () => {
  const currentIds = new Set(currentMonthExpenses().map((expense) => expense.id));
  if (!currentIds.size) return;

  state.expenses = state.expenses.filter((expense) => !currentIds.has(expense.id));
  saveState();
  render();
});

clearIncomeButton.addEventListener("click", () => {
  const currentIds = new Set(currentMonthIncomes().map((income) => income.id));
  if (!currentIds.size) return;

  state.incomes = state.incomes.filter((income) => !currentIds.has(income.id));
  saveState();
  render();
});

fillForms();
render();
