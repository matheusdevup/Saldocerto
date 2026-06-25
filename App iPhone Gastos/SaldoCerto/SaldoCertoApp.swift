import SwiftUI

@main
struct SaldoCertoApp: App {
    @StateObject private var store = FinanceStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(store)
        }
    }
}
