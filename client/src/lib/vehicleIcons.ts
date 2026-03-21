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
    case "car":
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M20 3 C15 3 11 5 10 8 L9 14 L8 28 C8 31 10 34 12 35 L14 36 L26 36 L28 35 C30 34 32 31 32 28 L31 14 L30 8 C29 5 25 3 20 3 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M13 9 L13 15 Q13 16.5 14.5 17 L25.5 17 Q27 16.5 27 15 L27 9 Q24 7 20 7 Q16 7 13 9 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><path d="M13.5 28 L13.5 33 Q16 35 20 35 Q24 35 26.5 33 L26.5 28 Q24 29 20 29 Q16 29 13.5 28 Z" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="0.8"/><ellipse cx="10" cy="13" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30" cy="13" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="10" cy="28" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30" cy="28" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,1 17,5 23,5" fill="white" opacity="0.9"/></g></svg>`;

    case "truck":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M13 3 L27 3 Q30 3 30 6 L30 14 Q30 16 27 16 L13 16 Q10 16 10 14 L10 6 Q10 3 13 3 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M11 17 L29 17 L29 37 L11 37 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M13 5 L27 5 L27 13 Q24 14.5 20 14.5 Q16 14.5 13 13 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><line x1="11" y1="23" x2="29" y2="23" stroke="white" stroke-width="0.8" opacity="0.5"/><line x1="11" y1="30" x2="29" y2="30" stroke="white" stroke-width="0.8" opacity="0.5"/><ellipse cx="9.5" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30.5" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="9.5" cy="23" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30.5" cy="23" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="9.5" cy="33" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30.5" cy="33" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,1 17,4 23,4" fill="white" opacity="0.9"/></g></svg>`;

    case "motorcycle":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><ellipse cx="20" cy="32" rx="5" ry="4.5" fill="${c}" stroke="white" stroke-width="1.8"/><ellipse cx="20" cy="32" rx="3" ry="2.5" fill="rgba(255,255,255,0.25)"/><ellipse cx="20" cy="9" rx="4" ry="4" fill="${c}" stroke="white" stroke-width="1.8"/><ellipse cx="20" cy="9" rx="2.5" ry="2.5" fill="rgba(255,255,255,0.25)"/><rect x="17.5" y="12" width="5" height="17" rx="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="20" cy="20" rx="4" ry="5" fill="${c}" stroke="white" stroke-width="1.2"/><line x1="14" y1="11" x2="26" y2="11" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="11" x2="26" y2="11" stroke="white" stroke-width="1" stroke-linecap="round"/><polygon points="20,3 17,7 23,7" fill="white" opacity="0.9"/></g></svg>`;

    case "van":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M11 4 L29 4 Q32 4 32 7 L32 34 Q32 37 29 37 L11 37 Q8 37 8 34 L8 7 Q8 4 11 4 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M11 5.5 L29 5.5 L29 13 Q26 14.5 20 14.5 Q14 14.5 11 13 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><rect x="9" y="17" width="4" height="5" rx="1" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="0.6"/><rect x="9" y="24" width="4" height="5" rx="1" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="0.6"/><rect x="27" y="17" width="4" height="5" rx="1" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="0.6"/><rect x="27" y="24" width="4" height="5" rx="1" fill="rgba(255,255,255,0.3)" stroke="white" stroke-width="0.6"/><rect x="12" y="32" width="16" height="4" rx="1" fill="rgba(255,255,255,0.2)" stroke="white" stroke-width="0.6"/><ellipse cx="7.5" cy="11" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="32.5" cy="11" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="7.5" cy="30" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="32.5" cy="30" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,1 17,4.5 23,4.5" fill="white" opacity="0.9"/></g></svg>`;

    case "bus":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M10 2 L30 2 Q33 2 33 5 L33 36 Q33 38 30 38 L10 38 Q7 38 7 36 L7 5 Q7 2 10 2 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M10 3.5 L30 3.5 L30 10 Q27 11.5 20 11.5 Q13 11.5 10 10 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><rect x="9" y="14" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="15" y="14" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="21" y="14" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="27" y="14" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="9" y="20" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="15" y="20" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="21" y="20" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="27" y="20" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="11" y="33" width="18" height="4" rx="1" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="0.6"/><ellipse cx="6" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="34" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="6" cy="22" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="34" cy="22" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="6" cy="32" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="34" cy="32" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,0 17,3 23,3" fill="white" opacity="0.9"/></g></svg>`;

    case "round":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${c}" stroke="white" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="white" opacity="0.3"/></svg>`;

    case "pin":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M20 2 C12 2 7 8 7 15 C7 24 20 38 20 38 C20 38 33 24 33 15 C33 8 28 2 20 2 Z" fill="${c}" stroke="white" stroke-width="2"/><circle cx="20" cy="15" r="6" fill="white" opacity="0.5"/></svg>`;
  }
}
