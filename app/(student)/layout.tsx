export default function StudentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="phone-wrapper">
      <div className="phone-frame">
        <div className="phone-notch" />
        <div className="phone-screen bg-ilo-bg">{children}</div>
      </div>
    </div>
  );
}
