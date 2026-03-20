export type VehicleIconType = "car" | "truck" | "motorcycle" | "van" | "bus" | "round" | "pin";

export interface VehicleTypeOption {
  value: VehicleIconType;
  label: string;
}

export const VEHICLE_TYPE_OPTIONS: VehicleTypeOption[] = [
  { value: "car", label: "Car" },
  { value: "truck", label: "Truck" },
  { value: "motorcycle", label: "Moto" },
  { value: "van", label: "Van" },
  { value: "bus", label: "Bus" },
  { value: "round", label: "Round" },
  { value: "pin", label: "Pin" },
];

export function isDirectionalType(type: string): boolean {
  return ["car", "truck", "motorcycle", "van", "bus"].includes(type);
}

export function getIconAnchor(type: string): [number, number] {
  return type === "pin" ? [20, 38] : [20, 20];
}

export function getMarkerSvg(type: string, color: string, heading: number): string {
  const c = color;
  const h = isDirectionalType(type) ? Math.round(heading) : 0;

  switch (type) {
    case "truck":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="9" y="6" width="22" height="28" rx="4" fill="${c}" stroke="white" stroke-width="2"/><rect x="12" y="9" width="16" height="8" rx="2" fill="rgba(255,255,255,0.45)"/><polygon points="20,2 15,7 25,7" fill="${c}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></g></svg>`;

    case "motorcycle":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><ellipse cx="20" cy="20" rx="5" ry="14" fill="${c}" stroke="white" stroke-width="2"/><circle cx="20" cy="8" r="4" fill="${c}" stroke="white" stroke-width="1.5"/><circle cx="20" cy="32" r="3.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,2 17,7 23,7" fill="white" opacity="0.5"/></g></svg>`;

    case "van":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="7" y="7" width="26" height="26" rx="5" fill="${c}" stroke="white" stroke-width="2"/><rect x="10" y="10" width="20" height="7" rx="2" fill="rgba(255,255,255,0.45)"/><polygon points="20,2 15,8 25,8" fill="${c}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></g></svg>`;

    case "bus":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="8" y="5" width="24" height="30" rx="4" fill="${c}" stroke="white" stroke-width="2"/><rect x="11" y="8" width="18" height="5" rx="1.5" fill="rgba(255,255,255,0.45)"/><rect x="11" y="17" width="18" height="5" rx="1.5" fill="rgba(255,255,255,0.2)"/><polygon points="20,1 15,6 25,6" fill="${c}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></g></svg>`;

    case "round":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${c}" stroke="white" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="white" opacity="0.3"/></svg>`;

    case "pin":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M20 2 C12 2 7 8 7 15 C7 24 20 38 20 38 C20 38 33 24 33 15 C33 8 28 2 20 2 Z" fill="${c}" stroke="white" stroke-width="2"/><circle cx="20" cy="15" r="6" fill="white" opacity="0.5"/></svg>`;

    case "car":
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="10" y="7" width="20" height="26" rx="6" fill="${c}" stroke="white" stroke-width="2"/><rect x="13" y="10" width="14" height="7" rx="2" fill="rgba(255,255,255,0.45)"/><rect x="13" y="24" width="14" height="5" rx="2" fill="rgba(255,255,255,0.2)"/><polygon points="20,3 16,8 24,8" fill="${c}" stroke="white" stroke-width="1.5" stroke-linejoin="round"/></g></svg>`;
  }
}
