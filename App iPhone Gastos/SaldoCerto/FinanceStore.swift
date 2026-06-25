import Foundation

final class FinanceStore: ObservableObject {
    @Published var settings: BudgetSettings {
        didSet { save() }
    }

    @Published var expenses: [Expense] {
        didSet { save() }
    }

    private let settingsKey = "saldoCerto.settings"
    private let expensesKey = "saldoCerto.expenses"
    private let defaults = UserDefaults.standard
    private let calendar = Calendar.current

    init() {
        let decoder = JSONDecoder()

        if let settingsData = defaults.data(forKey: settingsKey),
           let decodedSettings = try? decoder.decode(BudgetSettings.self, from: settingsData) {
            settings = decodedSettings
        } else {
            settings = BudgetSettings.empty
        }

        if let expensesData = defaults.data(forKey: expensesKey),
           let decodedExpenses = try? decoder.decode([Expense].self, from: expensesData) {
            expenses = decodedExpenses.sorted { $0.date > $1.date }
        } else {
            expenses = []
        }
    }

    var monthlyBudget: Double {
        max(settings.salary - settings.fixedCosts - settings.savingsGoal, 0)
    }

    var currentMonthExpenses: [Expense] {
        let monthStart = calendar.startOfMonth(for: Date())
        guard let nextMonth = calendar.date(byAdding: .month, value: 1, to: monthStart) else {
            return expenses.filter { $0.date >= monthStart }.sorted { $0.date > $1.date }
        }

        return expenses
            .filter { $0.date >= monthStart && $0.date < nextMonth }
            .sorted { $0.date > $1.date }
    }

    var totalSpentThisMonth: Double {
        currentMonthExpenses.reduce(0) { $0 + $1.amount }
    }

    var remainingBudget: Double {
        monthlyBudget - totalSpentThisMonth
    }

    var daysInCurrentMonth: Int {
        calendar.daysInMonth(for: Date())
    }

    var currentDay: Int {
        calendar.component(.day, from: Date())
    }

    var elapsedDays: Int {
        min(max(currentDay, 1), daysInCurrentMonth)
    }

    var remainingDaysIncludingToday: Int {
        max(daysInCurrentMonth - currentDay + 1, 1)
    }

    var idealDailyLimit: Double {
        guard monthlyBudget > 0 else { return 0 }
        return monthlyBudget / Double(daysInCurrentMonth)
    }

    var suggestedDailyLimit: Double {
        guard remainingBudget > 0 else { return 0 }
        return remainingBudget / Double(remainingDaysIncludingToday)
    }

    var expectedSpentUntilToday: Double {
        idealDailyLimit * Double(elapsedDays)
    }

    var budgetHealth: BudgetHealth {
        guard expectedSpentUntilToday > 0 else { return .great }

        let pace = totalSpentThisMonth / expectedSpentUntilToday

        switch pace {
        case ..<0.95:
            return .great
        case ..<1.10:
            return .attention
        default:
            return .danger
        }
    }

    func addExpense(title: String, amount: Double, category: ExpenseCategory, date: Date) {
        let expense = Expense(title: title, amount: amount, category: category, date: date)
        expenses.insert(expense, at: 0)
    }

    func deleteExpenses(at offsets: IndexSet) {
        let idsToDelete = offsets.map { currentMonthExpenses[$0].id }
        expenses.removeAll { idsToDelete.contains($0.id) }
    }

    private func save() {
        let encoder = JSONEncoder()

        if let settingsData = try? encoder.encode(settings) {
            defaults.set(settingsData, forKey: settingsKey)
        }

        if let expensesData = try? encoder.encode(expenses) {
            defaults.set(expensesData, forKey: expensesKey)
        }
    }
}
