export default function PlatformField({ label, value }) {
  return (
    <div className="platform-field">
      <label>{label}</label>
      <textarea readOnly value={value} className="platform-textarea" />
    </div>
  );
}
