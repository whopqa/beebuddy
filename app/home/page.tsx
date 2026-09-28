import DashboardHub from "@/components/beebuddy/DashboardHub";
import FigmaHeader from "@/components/beebuddy/FigmaHeader";
import SimpleFooter from "@/components/beebuddy/SimpleFooter";

export default function AuthenticatedHome() {
  return <div className="bb-site bb-product-page-root"><FigmaHeader authenticated /><DashboardHub /><SimpleFooter /></div>;
}
