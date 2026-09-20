import { Navigate, Route, Routes, Link } from "react-router-dom";

import { Layout } from "./components/Layout";
import { LoginPage } from "./pages/Login";
import { DashboardPage } from "./pages/Dashboard";
import { AddFinancePage } from "./pages/AddFinance";
import { MembersPage } from "./pages/Members";
import { MemberDetailPage } from "./pages/MemberDetail";
import { SavingsPage } from "./pages/Savings";
import { TransactionsPage } from "./pages/Transactions";
import { LoansPage } from "./pages/Loans";
import { LoanDetailPage } from "./pages/LoanDetail";
import { FixedDepositsPage } from "./pages/FixedDeposits";
import { SettingsPage } from "./pages/Settings";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-6xl font-black text-ink">404</h1>
        <h2 className="mt-4 text-lg font-semibold text-ink">Page not found</h2>
        <p className="mt-2 text-sm text-muted-ink">This page isn't part of the ledger.</p>
        <div className="mt-6">
          <Link
            to="/dashboard"
            className="inline-flex h-11 items-center justify-center rounded-xl bg-ink px-4 font-display text-sm font-semibold text-paper"
          >
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/login" element={<LoginPage />} />

      <Route element={<Layout />}>
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/add-finance" element={<AddFinancePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/members/:id" element={<MemberDetailPage />} />
        <Route path="/savings" element={<SavingsPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/loans" element={<LoansPage />} />
        <Route path="/loans/:id" element={<LoanDetailPage />} />
        <Route path="/fixed-deposits" element={<FixedDepositsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
