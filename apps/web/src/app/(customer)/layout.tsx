import { CustomerFooter } from "@/components/CustomerFooter";
import { CustomerHeader } from "@/components/CustomerHeader";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-view">
      <CustomerHeader />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <CustomerFooter />
    </div>
  );
}
