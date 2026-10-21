import { CallProvider } from "@/components/call/CallProvider";

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <CallProvider role="student">
      <div className="phone-wrapper">
        <div className="phone-frame">
          <div className="phone-notch" />
          <div className="phone-screen bg-ilo-bg">{children}</div>
        </div>
      </div>
    </CallProvider>
  );
}
