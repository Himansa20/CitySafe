export default function RouteSelector({
  routes,
  value,
  onChange,
  allowAll = true,
}: {
  routes: { id: string; name: string }[];
  value: string;
  onChange: (id: string) => void;
  allowAll?: boolean;
}) {
  return (
    <label style={{ fontSize: 12 }}>
      Route{" "}
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        {allowAll && <option value="all">all</option>}
        {routes.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>
    </label>
  );
}
