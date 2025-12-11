import { Badge } from "./badge";

export function BrandBadge({ name = "HAIROTICMEN" }: { name?: string }) {
  return <Badge variant="secondary">{name}</Badge>;
}
