import Foundation
import SwiftUI

struct BudgetSettings: Codable {
    var salary: Double
    var fixedCosts: Double
    var savingsGoal: Double

    static let empty = BudgetSettings(salary: 0, fixedCosts: 0, savingsGoal: 0)
}

enum ExpenseCategory: String, CaseIterable, Codable, Identifiable {
    case food = "Alimentacao"
    case transport = "Transporte"
    case leisure = "Lazer"
    case housing = "Casa"
    case health = "Saude"
    case shopping = "Compras"
    case other = "Outros"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .food: return "fork.knife"
        case .transport: return "car.fill"
        case .leisure: return "gamecontroller.fill"
        case .housing: return "house.fill"
        case .health: return "cross.case.fill"
        case .shopping: return "bag.fill"
        case .other: return "ellipsis.circle.fill"
        }
    }

    var tint: Color {
        switch self {
        case .food: return .orange
        case .transport: return .blue
        case .leisure: return .purple
        case .housing: return .teal
        case .health: return .red
        case .shopping: return .pink
        case .other: return .gray
        }
    }
}

struct Expense: Identifiable, Codable {
    var id: UUID
    var title: String
    var amount: Double
    var category: ExpenseCategory
    var date: Date

    init(id: UUID = UUID(), title: String, amount: Double, category: ExpenseCategory, date: Date) {
        self.id = id
        self.title = title
        self.amount = amount
        self.category = category
        self.date = date
    }
}

enum BudgetHealth {
    case great
    case attention
    case danger

    var title: String {
        switch self {
        case .great: return "Ritmo saudavel"
        case .attention: return "Atencao aos gastos"
        case .danger: return "Voce esta gastando demais"
        }
    }

    var subtitle: String {
        switch self {
        case .great: return "Seu gasto atual esta dentro do que o salario comporta."
        case .attention: return "O gasto esta perto do limite ideal para este ponto do mes."
        case .danger: return "O gasto acumulado esta acima do esperado para o dia de hoje."
        }
    }

    var color: Color {
        switch self {
        case .great: return Color(red: 0.16, green: 0.56, blue: 0.40)
        case .attention: return Color(red: 0.82, green: 0.55, blue: 0.08)
        case .danger: return Color(red: 0.78, green: 0.20, blue: 0.19)
        }
    }

    var symbol: String {
        switch self {
        case .great: return "checkmark.seal.fill"
        case .attention: return "exclamationmark.triangle.fill"
        case .danger: return "flame.fill"
        }
    }
}

extension Double {
    var brl: String {
        let formatter = NumberFormatter()
        formatter.numberStyle = .currency
        formatter.currencyCode = "BRL"
        formatter.locale = Locale(identifier: "pt_BR")
        return formatter.string(from: NSNumber(value: self)) ?? "R$ 0,00"
    }
}

extension Calendar {
    func startOfMonth(for date: Date) -> Date {
        dateInterval(of: .month, for: date)?.start ?? date
    }

    func daysInMonth(for date: Date) -> Int {
        range(of: .day, in: .month, for: date)?.count ?? 30
    }
}
