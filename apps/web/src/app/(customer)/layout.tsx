import { CustomerFooter } from "@/components/CustomerFooter";
import { CustomerHeader } from "@/components/CustomerHeader";
import { getAccessToken } from "@/lib/session";

export default async function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="customer-view">
      <CustomerHeader signedIn={Boolean(await getAccessToken())} />
      <main id="main" tabIndex={-1}>
        {children}
      </main>
      <CustomerFooter />
    </div>
  );
}
