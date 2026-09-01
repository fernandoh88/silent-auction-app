import { formatCurrency } from "../utils/formatters";

export default function PriceDisplay({ value }) {
  return <>{formatCurrency(value)}</>;
}
