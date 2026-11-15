/**
 * Demonstration accounts.
 *
 * These are SAMPLE identities for the demo environment. They are not real
 * Stockgap employees, partners or credentials. The password is identical for
 * every demo user so reviewers can switch roles quickly; the login screen
 * labels them explicitly as demonstration data.
 */
export const DEMO_PASSWORD = "Stockgap#2026";

export interface DemoAccount {
  email: string;
  fullName: string;
  roleId: string;
  roleLabel: string;
  partyCode?: string;
  jobTitle: string;
}

export const DEMO_ACCOUNTS: DemoAccount[] = [
  { email: "admin@stockgap.demo", fullName: "Adaeze Okonkwo", roleId: "admin", roleLabel: "System administrator", jobTitle: "Head, Business Systems" },
  { email: "executive@stockgap.demo", fullName: "Chinedu Nwosu", roleId: "executive", roleLabel: "Executive management", jobTitle: "Chief Operating Officer" },
  { email: "operations@stockgap.demo", fullName: "Ifeanyi Eze", roleId: "operations_manager", roleLabel: "Operations manager", jobTitle: "Terminal Operations Manager" },
  { email: "procurement@stockgap.demo", fullName: "Halima Bello", roleId: "procurement_officer", roleLabel: "Procurement officer", jobTitle: "Procurement Officer" },
  { email: "warehouse@stockgap.demo", fullName: "Emeka Obi", roleId: "warehouse_manager", roleLabel: "Warehouse manager", jobTitle: "Warehouse Manager" },
  { email: "depot@stockgap.demo", fullName: "Yusuf Danjuma", roleId: "depot_operator", roleLabel: "Depot / terminal operator", jobTitle: "Depot Operator" },
  { email: "production@stockgap.demo", fullName: "Grace Etim", roleId: "production_supervisor", roleLabel: "Production supervisor", jobTitle: "Cylinder Plant Supervisor" },
  { email: "quality@stockgap.demo", fullName: "Tunde Adeyemi", roleId: "quality_inspector", roleLabel: "Quality inspector", jobTitle: "Quality Assurance Inspector" },
  { email: "logistics@stockgap.demo", fullName: "Blessing Okafor", roleId: "logistics_officer", roleLabel: "Logistics officer", jobTitle: "Logistics Coordinator" },
  { email: "finance@stockgap.demo", fullName: "Kelechi Umeh", roleId: "finance_officer", roleLabel: "Finance officer", jobTitle: "Receivables Accountant" },
  { email: "hse@stockgap.demo", fullName: "Amina Sule", roleId: "hse_officer", roleLabel: "HSE officer", jobTitle: "HSE Officer" },
  { email: "distributor@stockgap.demo", fullName: "Ngozi Nwafor", roleId: "distributor", roleLabel: "Distributor", partyCode: "PTY-0004", jobTitle: "Commercial Manager" },
  { email: "retailer@stockgap.demo", fullName: "Sani Musa", roleId: "retailer", roleLabel: "Retailer", partyCode: "PTY-0005", jobTitle: "Outlet Manager" },
  { email: "supplier@stockgap.demo", fullName: "Peter Okoye", roleId: "supplier", roleLabel: "Supplier", partyCode: "PTY-0001", jobTitle: "Account Manager" },
  { email: "transporter@stockgap.demo", fullName: "John Bassey", roleId: "transporter", roleLabel: "Transporter", partyCode: "PTY-0006", jobTitle: "Dispatch Coordinator" },
  { email: "customer@stockgap.demo", fullName: "Funmi Adebayo", roleId: "customer", roleLabel: "Customer", partyCode: "PTY-0007", jobTitle: "Facilities Buyer" },
];
