import { Link, Route, Routes } from "react-router-dom";
import { MarketingLayout } from "@/components/layout/MarketingLayout";
import { PortalLayout } from "@/components/layout/PortalLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { Button, EmptyState } from "@/components/ui/primitives";
import { Home } from "@/pages/marketing/Home";
import { About } from "@/pages/marketing/About";
import { Products } from "@/pages/marketing/Products";
import { Services } from "@/pages/marketing/Services";
import { Operations } from "@/pages/marketing/Operations";
import { Contact } from "@/pages/marketing/Contact";
import { Careers } from "@/pages/marketing/Careers";
import { News } from "@/pages/marketing/News";
import { NewsArticle } from "@/pages/marketing/NewsArticle";
import { Login } from "@/pages/auth/Login";
import { ForgotPassword } from "@/pages/auth/ForgotPassword";
import { ResetPassword } from "@/pages/auth/ResetPassword";
import { Dashboard } from "@/pages/portal/Dashboard";
import { Orders } from "@/pages/portal/Orders";
import { OrderDetail } from "@/pages/portal/OrderDetail";
import { Procurement } from "@/pages/portal/Procurement";
import { Inventory } from "@/pages/portal/Inventory";
import { LpgOperations } from "@/pages/portal/LpgOperations";
import { PetroleumOperations } from "@/pages/portal/PetroleumOperations";
import { Manufacturing } from "@/pages/portal/Manufacturing";
import { Quality } from "@/pages/portal/Quality";
import { Logistics } from "@/pages/portal/Logistics";
import { Customers, Suppliers } from "@/pages/portal/Parties";
import { Finance } from "@/pages/portal/Finance";
import { Hse } from "@/pages/portal/Hse";
import { Reports } from "@/pages/portal/Reports";
import { Users } from "@/pages/portal/Users";
import { AuditLogs } from "@/pages/portal/AuditLogs";
import { Enquiries } from "@/pages/portal/Enquiries";
import { Notifications } from "@/pages/portal/Notifications";
import { Settings } from "@/pages/portal/Settings";

function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <EmptyState
        title="Page not found"
        description="The page you followed does not exist, or the link has changed."
        action={
          <Link to="/">
            <Button variant="secondary">Return to the website</Button>
          </Link>
        }
      />
    </div>
  );
}

export function App() {
  return (
    <Routes>
      <Route element={<MarketingLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/products" element={<Products />} />
        <Route path="/services" element={<Services />} />
        <Route path="/operations" element={<Operations />} />
        <Route path="/careers" element={<Careers />} />
        <Route path="/news" element={<News />} />
        <Route path="/news/:slug" element={<NewsArticle />} />
        <Route path="/contact" element={<Contact />} />
      </Route>

      <Route path="/login" element={<Login />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/portal"
        element={
          <ProtectedRoute>
            <PortalLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="orders" element={<Orders />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route
          path="procurement"
          element={
            <ProtectedRoute requires={["procurement:read"]}>
              <Procurement />
            </ProtectedRoute>
          }
        />
        <Route
          path="inventory"
          element={
            <ProtectedRoute requires={["inventory:read"]}>
              <Inventory />
            </ProtectedRoute>
          }
        />
        <Route
          path="lpg"
          element={
            <ProtectedRoute requires={["lpg:read"]}>
              <LpgOperations />
            </ProtectedRoute>
          }
        />
        <Route
          path="petroleum"
          element={
            <ProtectedRoute requires={["petroleum:read"]}>
              <PetroleumOperations />
            </ProtectedRoute>
          }
        />
        <Route
          path="manufacturing"
          element={
            <ProtectedRoute requires={["manufacturing:read"]}>
              <Manufacturing />
            </ProtectedRoute>
          }
        />
        <Route
          path="quality"
          element={
            <ProtectedRoute requires={["quality:read"]}>
              <Quality />
            </ProtectedRoute>
          }
        />
        <Route
          path="logistics"
          element={
            <ProtectedRoute requires={["logistics:read", "deliveries:confirm"]}>
              <Logistics />
            </ProtectedRoute>
          }
        />
        <Route
          path="customers"
          element={
            <ProtectedRoute requires={["customers:read"]}>
              <Customers />
            </ProtectedRoute>
          }
        />
        <Route
          path="suppliers"
          element={
            <ProtectedRoute requires={["suppliers:read"]}>
              <Suppliers />
            </ProtectedRoute>
          }
        />
        <Route
          path="finance"
          element={
            <ProtectedRoute requires={["finance:read"]}>
              <Finance />
            </ProtectedRoute>
          }
        />
        <Route
          path="hse"
          element={
            <ProtectedRoute requires={["hse:read", "hse:report"]}>
              <Hse />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute requires={["reports:read"]}>
              <Reports />
            </ProtectedRoute>
          }
        />
        <Route
          path="users"
          element={
            <ProtectedRoute requires={["users:read"]}>
              <Users />
            </ProtectedRoute>
          }
        />
        <Route
          path="audit"
          element={
            <ProtectedRoute requires={["audit:read"]}>
              <AuditLogs />
            </ProtectedRoute>
          }
        />
        <Route
          path="enquiries"
          element={
            <ProtectedRoute requires={["enquiries:manage"]}>
              <Enquiries />
            </ProtectedRoute>
          }
        />
        <Route path="notifications" element={<Notifications />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
