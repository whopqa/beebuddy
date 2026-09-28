import FigmaHeader from "@/components/beebuddy/FigmaHeader";
import MessagesHub from "@/components/beebuddy/MessagesHub";

export default function MessagesPage({ searchParams }: { searchParams: { user?: string; conversation?: string } }) {
  return <div className="bb-site bb-product-page-root"><FigmaHeader /><MessagesHub initialUserId={searchParams.user} initialConversationId={searchParams.conversation} /></div>;
}
