import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var store: FinanceStore

    @State private var salaryText = ""
    @State private var fixedCostsText = ""
    @State private var savingsGoalText = ""

    @State private var expenseTitle = ""
    @State private var expenseAmount = ""
    @State private var selectedCategory: ExpenseCategory = .food
    @State private var expenseDate = Date()

    var body: some View {
        NavigationStack {
            ZStack {
                LinearGradient(
                    colors: [
                        Color(red: 0.96, green: 0.93, blue: 0.87),
                        Color(red: 0.88, green: 0.93, blue: 0.96),
                        Color(red: 0.94, green: 0.97, blue: 0.94)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
                .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 20) {
                        statusCard
                        summaryGrid
                        settingsCard
                        newExpenseCard
                        recentExpensesCard
                    }
                    .padding(20)
                }
            }
            .navigationTitle("SaldoCerto")
            .onAppear(perform: syncSettingsFields)
        }
    }

    private var statusCard: some View {
        let health = store.budgetHealth

        return VStack(alignment: .leading, spacing: 12) {
            Label(health.title, systemImage: health.symbol)
                .font(.title3.weight(.semibold))

            Text(health.subtitle)
                .font(.subheadline)
                .foregroundStyle(.white.opacity(0.92))

            Divider()
                .overlay(.white.opacity(0.25))

            HStack {
                budgetLine(title: "Salario", value: store.settings.salary.brl)
                Spacer()
                budgetLine(title: "Gasto no mes", value: store.totalSpentThisMonth.brl)
            }

            HStack {
                budgetLine(title: "Pode gastar hoje", value: store.suggestedDailyLimit.brl)
                Spacer()
                budgetLine(title: "Saldo restante", value: store.remainingBudget.brl)
            }
        }
        .foregroundStyle(.white)
        .padding(20)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 28, style: .continuous)
                .fill(LinearGradient(colors: [health.color.opacity(0.92), health.color], startPoint: .topLeading, endPoint: .bottomTrailing))
        )
        .shadow(color: health.color.opacity(0.22), radius: 18, x: 0, y: 10)
    }

    private var summaryGrid: some View {
        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 14) {
            metricCard(title: "Orcamento do mes", value: store.monthlyBudget.brl, caption: "Depois dos fixos e da reserva")
            metricCard(title: "Meta diaria ideal", value: store.idealDailyLimit.brl, caption: "Media para o mes inteiro")
            metricCard(title: "Esperado ate hoje", value: store.expectedSpentUntilToday.brl, caption: "Limite acumulado do periodo")
            metricCard(title: "Dias restantes", value: "\(store.remainingDaysIncludingToday)", caption: "Contando o dia de hoje")
        }
    }

    private var settingsCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Base do seu salario")
                .font(.headline)

            moneyField(title: "Salario mensal", text: $salaryText)
            moneyField(title: "Contas fixas do mes", text: $fixedCostsText)
            moneyField(title: "Quanto quer guardar", text: $savingsGoalText)

            Button(action: saveSettings) {
                Text("Salvar planejamento")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(red: 0.12, green: 0.26, blue: 0.45))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
        .cardStyle()
    }

    private var newExpenseCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Lancar gasto")
                .font(.headline)

            TextField("Descricao", text: $expenseTitle)
                .textInputAutocapitalization(.sentences)
                .padding()
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            moneyField(title: "Valor", text: $expenseAmount)

            Picker("Categoria", selection: $selectedCategory) {
                ForEach(ExpenseCategory.allCases) { category in
                    Label(category.rawValue, systemImage: category.icon)
                        .tag(category)
                }
            }
            .pickerStyle(.menu)
            .padding()
            .background(Color.white.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))

            DatePicker("Data", selection: $expenseDate, displayedComponents: .date)

            Button(action: addExpense) {
                Text("Adicionar despesa")
                    .font(.headline)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color(red: 0.18, green: 0.52, blue: 0.40))
                    .foregroundStyle(.white)
                    .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            }
        }
        .cardStyle()
    }

    private var recentExpensesCard: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Despesas deste mes")
                .font(.headline)

            if store.currentMonthExpenses.isEmpty {
                Text("Nenhuma despesa registrada ainda.")
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            } else {
                ForEach(store.currentMonthExpenses.prefix(8)) { expense in
                    HStack(spacing: 12) {
                        Image(systemName: expense.category.icon)
                            .font(.title3)
                            .foregroundStyle(expense.category.tint)
                            .frame(width: 40, height: 40)
                            .background(expense.category.tint.opacity(0.14))
                            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))

                        VStack(alignment: .leading, spacing: 4) {
                            Text(expense.title)
                                .font(.subheadline.weight(.semibold))
                            Text(expense.category.rawValue)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }

                        Spacer()

                        VStack(alignment: .trailing, spacing: 4) {
                            Text(expense.amount.brl)
                                .font(.subheadline.weight(.semibold))
                            Text(expense.date.formatted(date: .abbreviated, time: .omitted))
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                    .padding(.vertical, 4)
                }
            }
        }
        .cardStyle()
    }

    private func metricCard(title: String, value: String, caption: String) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(title)
                .font(.subheadline.weight(.medium))
                .foregroundStyle(.secondary)

            Text(value)
                .font(.title3.weight(.bold))
                .foregroundStyle(Color(red: 0.08, green: 0.16, blue: 0.26))

            Text(caption)
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(16)
        .background(Color.white.opacity(0.85))
        .clipShape(RoundedRectangle(cornerRadius: 22, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 22, style: .continuous)
                .stroke(Color.black.opacity(0.05), lineWidth: 1)
        )
    }

    private func budgetLine(title: String, value: String) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(title.uppercased())
                .font(.caption2.weight(.bold))
                .foregroundStyle(.white.opacity(0.8))
            Text(value)
                .font(.headline.weight(.semibold))
        }
    }

    private func moneyField(title: String, text: Binding<String>) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.subheadline.weight(.medium))

            TextField("0,00", text: text)
                .keyboardType(.decimalPad)
                .padding()
                .background(Color.white.opacity(0.7))
                .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        }
    }

    private func syncSettingsFields() {
        salaryText = formattedInputValue(store.settings.salary)
        fixedCostsText = formattedInputValue(store.settings.fixedCosts)
        savingsGoalText = formattedInputValue(store.settings.savingsGoal)
    }

    private func saveSettings() {
        store.settings = BudgetSettings(
            salary: parseCurrency(salaryText),
            fixedCosts: parseCurrency(fixedCostsText),
            savingsGoal: parseCurrency(savingsGoalText)
        )
        syncSettingsFields()
    }

    private func addExpense() {
        let amount = parseCurrency(expenseAmount)
        let title = expenseTitle.trimmingCharacters(in: .whitespacesAndNewlines)

        guard !title.isEmpty, amount > 0 else { return }

        store.addExpense(title: title, amount: amount, category: selectedCategory, date: expenseDate)

        expenseTitle = ""
        expenseAmount = ""
        selectedCategory = .food
        expenseDate = Date()
    }

    private func parseCurrency(_ rawValue: String) -> Double {
        let normalized = rawValue
            .replacingOccurrences(of: ".", with: "")
            .replacingOccurrences(of: ",", with: ".")
            .filter { "0123456789.".contains($0) }

        return Double(normalized) ?? 0
    }

    private func formattedInputValue(_ value: Double) -> String {
        value == 0 ? "" : String(format: "%.2f", value).replacingOccurrences(of: ".", with: ",")
    }
}

private extension View {
    func cardStyle() -> some View {
        self
            .padding(18)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(.ultraThinMaterial)
            .background(Color.white.opacity(0.7))
            .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 26, style: .continuous)
                    .stroke(Color.black.opacity(0.05), lineWidth: 1)
            )
    }
}

#Preview {
    ContentView()
        .environmentObject(FinanceStore())
}
