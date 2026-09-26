/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectsView } from './components/projects/ProjectsView';
import { ProjectFormModal } from './components/projects/ProjectFormModal';
import { ProjectDetailModal } from './components/projects/ProjectDetailModal';
import { ClientsView } from './components/clients/ClientsView';
import { ClientModal } from './components/clients/ClientModal';
import { TeamView } from './components/team/TeamView';
import { TeamMemberModal } from './components/team/TeamMemberModal';
import { InvoicesView } from './components/invoices/InvoicesView';
import { InvoiceFormModal } from './components/invoices/InvoiceFormModal';
import { InvoicePrintModal } from './components/invoices/InvoicePrintModal';
import { ClientPaymentsView } from './components/payments/ClientPaymentsView';
import { ClientPaymentModal } from './components/payments/ClientPaymentModal';
import { TeamPaymentsView } from './components/payments/TeamPaymentsView';
import { TeamPaymentModal } from './components/payments/TeamPaymentModal';
import { ExpensesView } from './components/expenses/ExpensesView';
import { ExpenseModal } from './components/expenses/ExpenseModal';
import { ReportsView } from './components/reports/ReportsView';
import { GanttView } from './components/gantt/GanttView';
import { UsersView } from './components/users/UsersView';
import { Project, Client, TeamMember, Invoice, ClientPayment, TeamPayment, ProjectExpense } from './types';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

function MainApp() {
  const { activeTab, selectedProjectId, setSelectedProjectId, toast } = useApp();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Modal States
  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [projectToEdit, setProjectToEdit] = useState<Project | null>(null);

  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [teamMemberModalOpen, setTeamMemberModalOpen] = useState(false);
  const [teamMemberToEdit, setTeamMemberToEdit] = useState<TeamMember | null>(null);

  const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [invoiceDefaultProjectId, setInvoiceDefaultProjectId] = useState<string | undefined>();

  const [invoicePrintId, setInvoicePrintId] = useState<string | null>(null);

  const [clientPaymentModalOpen, setClientPaymentModalOpen] = useState(false);
  const [clientPaymentToEdit, setClientPaymentToEdit] = useState<ClientPayment | null>(null);
  const [clientPaymentDefaultProject, setClientPaymentDefaultProject] = useState<string | undefined>();
  const [clientPaymentDefaultInvoice, setClientPaymentDefaultInvoice] = useState<string | undefined>();

  const [teamPaymentModalOpen, setTeamPaymentModalOpen] = useState(false);
  const [teamPaymentToEdit, setTeamPaymentToEdit] = useState<TeamPayment | null>(null);
  const [teamPaymentDefaultProject, setTeamPaymentDefaultProject] = useState<string | undefined>();
  const [teamPaymentDefaultMember, setTeamPaymentDefaultMember] = useState<string | undefined>();

  const [expenseModalOpen, setExpenseModalOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<ProjectExpense | null>(null);
  const [expenseDefaultProject, setExpenseDefaultProject] = useState<string | undefined>();

  // Quick Action Handler from Navbar / Actions
  const handleQuickAction = (
    type: 'project' | 'invoice' | 'client-payment' | 'team-payment' | 'expense' | 'client' | 'team'
  ) => {
    switch (type) {
      case 'project':
        setProjectToEdit(null);
        setProjectModalOpen(true);
        break;
      case 'invoice':
        setInvoiceToEdit(null);
        setInvoiceDefaultProjectId(undefined);
        setInvoiceModalOpen(true);
        break;
      case 'client-payment':
        setClientPaymentToEdit(null);
        setClientPaymentDefaultProject(undefined);
        setClientPaymentDefaultInvoice(undefined);
        setClientPaymentModalOpen(true);
        break;
      case 'team-payment':
        setTeamPaymentToEdit(null);
        setTeamPaymentDefaultProject(undefined);
        setTeamPaymentDefaultMember(undefined);
        setTeamPaymentModalOpen(true);
        break;
      case 'expense':
        setExpenseToEdit(null);
        setExpenseDefaultProject(undefined);
        setExpenseModalOpen(true);
        break;
      case 'client':
        setClientToEdit(null);
        setClientModalOpen(true);
        break;
      case 'team':
        setTeamMemberToEdit(null);
        setTeamMemberModalOpen(true);
        break;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans" dir="rtl">
      {/* Sidebar Navigation */}
      <div className="no-print">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </div>

      {/* Main Content Area (offset by 256px on desktop lg:mr-64) */}
      <div className="flex-1 flex flex-col lg:mr-64 min-w-0 transition-all duration-200">
        <div className="no-print">
          <Navbar
            onToggleSidebar={() => setSidebarOpen(prev => !prev)}
            onOpenQuickAction={handleQuickAction}
          />
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'dashboard' && (
            <DashboardView onOpenQuickAction={handleQuickAction} />
          )}

          {activeTab === 'projects' && (
            <ProjectsView
              onOpenCreate={() => {
                setProjectToEdit(null);
                setProjectModalOpen(true);
              }}
              onOpenEdit={project => {
                setProjectToEdit(project);
                setProjectModalOpen(true);
              }}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'clients' && (
            <ClientsView
              onOpenCreateClient={() => {
                setClientToEdit(null);
                setClientModalOpen(true);
              }}
              onOpenEditClient={client => {
                setClientToEdit(client);
                setClientModalOpen(true);
              }}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'team' && (
            <TeamView
              onOpenCreateMember={() => {
                setTeamMemberToEdit(null);
                setTeamMemberModalOpen(true);
              }}
              onOpenEditMember={member => {
                setTeamMemberToEdit(member);
                setTeamMemberModalOpen(true);
              }}
              onOpenCreatePayment={(projId, memberId) => {
                setTeamPaymentToEdit(null);
                setTeamPaymentDefaultProject(projId);
                setTeamPaymentDefaultMember(memberId);
                setTeamPaymentModalOpen(true);
              }}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'invoices' && (
            <InvoicesView
              onOpenCreateInvoice={() => {
                setInvoiceToEdit(null);
                setInvoiceDefaultProjectId(undefined);
                setInvoiceModalOpen(true);
              }}
              onOpenEditInvoice={inv => {
                setInvoiceToEdit(inv);
                setInvoiceModalOpen(true);
              }}
              onOpenCreatePaymentForInvoice={(projId, invId) => {
                setClientPaymentToEdit(null);
                setClientPaymentDefaultProject(projId);
                setClientPaymentDefaultInvoice(invId);
                setClientPaymentModalOpen(true);
              }}
              onPrintInvoice={id => setInvoicePrintId(id)}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'client-payments' && (
            <ClientPaymentsView
              onOpenCreatePayment={() => {
                setClientPaymentToEdit(null);
                setClientPaymentDefaultProject(undefined);
                setClientPaymentDefaultInvoice(undefined);
                setClientPaymentModalOpen(true);
              }}
              onOpenEditPayment={p => {
                setClientPaymentToEdit(p);
                setClientPaymentModalOpen(true);
              }}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'team-payments' && (
            <TeamPaymentsView
              onOpenCreatePayment={() => {
                setTeamPaymentToEdit(null);
                setTeamPaymentDefaultProject(undefined);
                setTeamPaymentDefaultMember(undefined);
                setTeamPaymentModalOpen(true);
              }}
              onOpenEditPayment={p => {
                setTeamPaymentToEdit(p);
                setTeamPaymentModalOpen(true);
              }}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'expenses' && (
            <ExpensesView
              onOpenCreateExpense={() => {
                setExpenseToEdit(null);
                setExpenseDefaultProject(undefined);
                setExpenseModalOpen(true);
              }}
              onOpenEditExpense={exp => {
                setExpenseToEdit(exp);
                setExpenseModalOpen(true);
              }}
              onSelectProject={id => setSelectedProjectId(id)}
            />
          )}

          {activeTab === 'gantt' && <GanttView />}

          {activeTab === 'reports' && <ReportsView />}

          {activeTab === 'users' && <UsersView />}
        </main>
      </div>

      {/* ----------------- GLOBAL MODALS ----------------- */}

      {/* Project Form Modal (Create / Edit) */}
      <ProjectFormModal
        isOpen={projectModalOpen}
        onClose={() => {
          setProjectModalOpen(false);
          setProjectToEdit(null);
        }}
        projectToEdit={projectToEdit}
      />

      {/* Project Detail Drawer / Modal with all tabs */}
      <ProjectDetailModal
        projectId={selectedProjectId}
        onClose={() => setSelectedProjectId(null)}
        onOpenEdit={() => {
          const p = selectedProjectId ? useApp().db.projects.find(proj => proj.id === selectedProjectId) : null;
          if (p) {
            setProjectToEdit(p);
            setProjectModalOpen(true);
          }
        }}
        onOpenCreateInvoice={projId => {
          setInvoiceToEdit(null);
          setInvoiceDefaultProjectId(projId);
          setInvoiceModalOpen(true);
        }}
        onOpenCreateClientPayment={projId => {
          setClientPaymentToEdit(null);
          setClientPaymentDefaultProject(projId);
          setClientPaymentDefaultInvoice(undefined);
          setClientPaymentModalOpen(true);
        }}
        onOpenCreateTeamPayment={(projId, memberId) => {
          setTeamPaymentToEdit(null);
          setTeamPaymentDefaultProject(projId);
          setTeamPaymentDefaultMember(memberId);
          setTeamPaymentModalOpen(true);
        }}
        onOpenCreateExpense={projId => {
          setExpenseToEdit(null);
          setExpenseDefaultProject(projId);
          setExpenseModalOpen(true);
        }}
        onPrintInvoice={invId => setInvoicePrintId(invId)}
      />

      {/* Client Modal */}
      <ClientModal
        isOpen={clientModalOpen}
        onClose={() => {
          setClientModalOpen(false);
          setClientToEdit(null);
        }}
        clientToEdit={clientToEdit}
      />

      {/* Team Member Modal */}
      <TeamMemberModal
        isOpen={teamMemberModalOpen}
        onClose={() => {
          setTeamMemberModalOpen(false);
          setTeamMemberToEdit(null);
        }}
        memberToEdit={teamMemberToEdit}
      />

      {/* Invoice Modal */}
      <InvoiceFormModal
        isOpen={invoiceModalOpen}
        onClose={() => {
          setInvoiceModalOpen(false);
          setInvoiceToEdit(null);
          setInvoiceDefaultProjectId(undefined);
        }}
        defaultProjectId={invoiceDefaultProjectId}
        invoiceToEdit={invoiceToEdit}
      />

      {/* Invoice Print Modal */}
      <InvoicePrintModal
        invoiceId={invoicePrintId}
        onClose={() => setInvoicePrintId(null)}
      />

      {/* Client Payment Modal */}
      <ClientPaymentModal
        isOpen={clientPaymentModalOpen}
        onClose={() => {
          setClientPaymentModalOpen(false);
          setClientPaymentToEdit(null);
          setClientPaymentDefaultProject(undefined);
          setClientPaymentDefaultInvoice(undefined);
        }}
        defaultProjectId={clientPaymentDefaultProject}
        defaultInvoiceId={clientPaymentDefaultInvoice}
        paymentToEdit={clientPaymentToEdit}
      />

      {/* Team Payment Modal */}
      <TeamPaymentModal
        isOpen={teamPaymentModalOpen}
        onClose={() => {
          setTeamPaymentModalOpen(false);
          setTeamPaymentToEdit(null);
          setTeamPaymentDefaultProject(undefined);
          setTeamPaymentDefaultMember(undefined);
        }}
        defaultProjectId={teamPaymentDefaultProject}
        defaultTeamMemberId={teamPaymentDefaultMember}
        paymentToEdit={teamPaymentToEdit}
      />

      {/* Expense Modal */}
      <ExpenseModal
        isOpen={expenseModalOpen}
        onClose={() => {
          setExpenseModalOpen(false);
          setExpenseToEdit(null);
          setExpenseDefaultProject(undefined);
        }}
        defaultProjectId={expenseDefaultProject}
        expenseToEdit={expenseToEdit}
      />

      {/* Toast Notification */}
      {toast && (
        <div className="no-print fixed bottom-5 left-5 z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div
            className={`flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-xs font-semibold border ${
              toast.type === 'error'
                ? 'bg-rose-50 text-rose-800 border-rose-200'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-950 text-emerald-100 border-emerald-800'
            }`}
          >
            {toast.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            ) : toast.type === 'info' ? (
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
}
