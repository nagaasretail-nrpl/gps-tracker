import carImg from "@assets/car_1774081966762.png";
import carRedImg from "@assets/car_(2)_1774081966764.png";
import tricycleImg from "@assets/tricycle_1774081966767.png";
import taxiImg from "@assets/taxi_1774081966768.png";
import deliveryImg from "@assets/delivery_1774081966769.png";
import busImg from "@assets/image_1774418118107.png";

export type VehicleIconType =
  | "car" | "hatchback" | "taxi" | "tricycle" | "truck" | "motorcycle" | "van" | "bus"
  | "round" | "pin" | "arrow"
  | "eagle-car" | "eagle-taxi" | "eagle-bus" | "eagle-moto" | "eagle-truck";

export interface VehicleTypeOption {
  value: VehicleIconType;
  label: string;
  img?: string;
}

export const VEHICLE_TYPE_OPTIONS: VehicleTypeOption[] = [
  { value: "car",        label: "Sedan",         img: carImg },
  { value: "hatchback",  label: "Hatchback",      img: carRedImg },
  { value: "taxi",       label: "Taxi",           img: taxiImg },
  { value: "tricycle",   label: "Tricycle",       img: tricycleImg },
  { value: "truck",      label: "Truck",          img: deliveryImg },
  { value: "motorcycle", label: "Moto" },
  { value: "van",        label: "Van" },
  { value: "bus",        label: "Bus",            img: busImg },
  { value: "round",      label: "Round" },
  { value: "pin",        label: "Pin" },
  { value: "arrow",      label: "Arrow" },
  { value: "eagle-car",  label: "Eagle Sedan" },
  { value: "eagle-taxi", label: "Eagle Taxi" },
  { value: "eagle-bus",  label: "Eagle Bus" },
  { value: "eagle-moto", label: "Eagle Moto" },
  { value: "eagle-truck",label: "Eagle Truck" },
];

export function getVehicleImg(type: string): string | null {
  switch (type) {
    case "car":        return carImg;
    case "hatchback":  return carRedImg;
    case "taxi":       return taxiImg;
    case "tricycle":   return tricycleImg;
    case "bus":        return busImg;
    case "truck":
    case "van":        return deliveryImg;
    default:           return null;
  }
}

export function isDirectionalType(type: string): boolean {
  return [
    "car", "hatchback", "taxi", "tricycle", "truck", "motorcycle", "van", "bus", "arrow",
    "eagle-car", "eagle-taxi", "eagle-bus", "eagle-moto", "eagle-truck",
  ].includes(type);
}

export function getIconAnchor(type: string): [number, number] {
  return type === "pin" ? [20, 38] : [20, 20];
}

export function getMarkerSvg(type: string, color: string, heading: number): string {
  const c = color;
  const h = isDirectionalType(type) ? Math.round(heading) : 0;

  switch (type) {
    case "car":
    case "hatchback":
    case "taxi":
    default:
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M20 3 C15 3 11 5 10 8 L9 14 L8 28 C8 31 10 34 12 35 L14 36 L26 36 L28 35 C30 34 32 31 32 28 L31 14 L30 8 C29 5 25 3 20 3 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M13 9 L13 15 Q13 16.5 14.5 17 L25.5 17 Q27 16.5 27 15 L27 9 Q24 7 20 7 Q16 7 13 9 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><path d="M13.5 28 L13.5 33 Q16 35 20 35 Q24 35 26.5 33 L26.5 28 Q24 29 20 29 Q16 29 13.5 28 Z" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="0.8"/><ellipse cx="10" cy="13" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30" cy="13" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="10" cy="28" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30" cy="28" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,1 17,5 23,5" fill="white" opacity="0.9"/></g></svg>`;

    case "tricycle":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="12" y="6" width="16" height="20" rx="2" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M14 7 L26 7 L26 14 Q23 15 20 15 Q17 15 14 14 Z" fill="rgba(255,255,255,0.45)" stroke="white" stroke-width="0.7"/><rect x="10" y="27" width="20" height="8" rx="2" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="14" cy="36" rx="3.5" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="26" cy="36" rx="3.5" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="20" cy="5" rx="2" ry="1.5" fill="${c}" stroke="white" stroke-width="1.2"/><polygon points="20,1 17,5 23,5" fill="white" opacity="0.9"/></g></svg>`;

    case "truck":
    case "van":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M13 3 L27 3 Q30 3 30 6 L30 14 Q30 16 27 16 L13 16 Q10 16 10 14 L10 6 Q10 3 13 3 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M11 17 L29 17 L29 37 L11 37 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M13 5 L27 5 L27 13 Q24 14.5 20 14.5 Q16 14.5 13 13 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><line x1="11" y1="23" x2="29" y2="23" stroke="white" stroke-width="0.8" opacity="0.5"/><line x1="11" y1="30" x2="29" y2="30" stroke="white" stroke-width="0.8" opacity="0.5"/><ellipse cx="9.5" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30.5" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="9.5" cy="23" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30.5" cy="23" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="9.5" cy="33" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="30.5" cy="33" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,1 17,4 23,4" fill="white" opacity="0.9"/></g></svg>`;

    case "motorcycle":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><ellipse cx="20" cy="32" rx="5" ry="4.5" fill="${c}" stroke="white" stroke-width="1.8"/><ellipse cx="20" cy="32" rx="3" ry="2.5" fill="rgba(255,255,255,0.25)"/><ellipse cx="20" cy="9" rx="4" ry="4" fill="${c}" stroke="white" stroke-width="1.8"/><ellipse cx="20" cy="9" rx="2.5" ry="2.5" fill="rgba(255,255,255,0.25)"/><rect x="17.5" y="12" width="5" height="17" rx="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="20" cy="20" rx="4" ry="5" fill="${c}" stroke="white" stroke-width="1.2"/><line x1="14" y1="11" x2="26" y2="11" stroke="${c}" stroke-width="2.5" stroke-linecap="round"/><line x1="14" y1="11" x2="26" y2="11" stroke="white" stroke-width="1" stroke-linecap="round"/><polygon points="20,3 17,7 23,7" fill="white" opacity="0.9"/></g></svg>`;

    case "bus":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><path d="M10 2 L30 2 Q33 2 33 5 L33 36 Q33 38 30 38 L10 38 Q7 38 7 36 L7 5 Q7 2 10 2 Z" fill="${c}" stroke="white" stroke-width="1.8"/><path d="M10 3.5 L30 3.5 L30 10 Q27 11.5 20 11.5 Q13 11.5 10 10 Z" fill="rgba(255,255,255,0.5)" stroke="white" stroke-width="0.8"/><rect x="9" y="14" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="15" y="14" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="21" y="14" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="27" y="14" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.4)" stroke="white" stroke-width="0.6"/><rect x="9" y="20" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="15" y="20" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="21" y="20" width="5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="27" y="20" width="4.5" height="4" rx="0.8" fill="rgba(255,255,255,0.35)" stroke="white" stroke-width="0.6"/><rect x="11" y="33" width="18" height="4" rx="1" fill="rgba(255,255,255,0.25)" stroke="white" stroke-width="0.6"/><ellipse cx="6" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="34" cy="10" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="6" cy="22" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="34" cy="22" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="6" cy="32" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="34" cy="32" rx="3" ry="2.5" fill="${c}" stroke="white" stroke-width="1.5"/><polygon points="20,0 17,3 23,3" fill="white" opacity="0.9"/></g></svg>`;

    case "round":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><circle cx="20" cy="20" r="16" fill="${c}" stroke="white" stroke-width="3"/><circle cx="20" cy="20" r="7" fill="white" opacity="0.3"/></svg>`;

    case "pin":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><path d="M20 2 C12 2 7 8 7 15 C7 24 20 38 20 38 C20 38 33 24 33 15 C33 8 28 2 20 2 Z" fill="${c}" stroke="white" stroke-width="2"/><circle cx="20" cy="15" r="6" fill="white" opacity="0.5"/></svg>`;

    case "arrow":
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><polygon points="20,3 32,34 20,27 8,34" fill="${c}" stroke="white" stroke-width="2.5" stroke-linejoin="round"/></g></svg>`;

    // ── Eagle-view (true top-down bird's-eye) icons ────────────────────────
    // These are SVG-only (no PNG fallback) so they always rotate with heading.

    case "eagle-car": {
      // Top-down sedan: tapered body, windshield, rear glass, side windows, 4 tyre ellipses, headlights, tail lights
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><ellipse cx="11" cy="12" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="29" cy="12" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="11" cy="28" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="29" cy="28" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><path d="M20 3.5 C16.5 3.5 12.5 5 11.5 8.5 L11 14 L11 26.5 Q11.5 33.5 15.5 35.5 L20 36.5 L24.5 35.5 Q28.5 33.5 29 26.5 L29 14 L28.5 8.5 C27.5 5 23.5 3.5 20 3.5Z" fill="${c}" stroke="white" stroke-width="1.5"/><path d="M14 8.5 Q20 7 26 8.5 L26.5 15 Q23.5 16.5 20 16.5 Q16.5 16.5 13.5 15Z" fill="rgba(200,230,255,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="0.7"/><path d="M14 28 Q17 27 20 27 Q23 27 26 28 L26 33 Q23 35 20 35 Q17 35 14 33Z" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.7)" stroke-width="0.6"/><rect x="11" y="17" width="2.5" height="8" rx="1" fill="rgba(200,230,255,0.55)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="26.5" y="17" width="2.5" height="8" rx="1" fill="rgba(200,230,255,0.55)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><line x1="11.5" y1="25" x2="28.5" y2="25" stroke="rgba(255,255,255,0.3)" stroke-width="0.7"/><line x1="20" y1="16.5" x2="20" y2="27" stroke="rgba(255,255,255,0.25)" stroke-width="0.6"/><rect x="14" y="3.5" width="4.5" height="1.8" rx="0.8" fill="rgba(255,255,200,0.9)"/><rect x="21.5" y="3.5" width="4.5" height="1.8" rx="0.8" fill="rgba(255,255,200,0.9)"/><rect x="14.5" y="35" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><rect x="21.5" y="35" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><polygon points="20,1 17.5,4.5 22.5,4.5" fill="white" opacity="0.95"/></g></svg>`;
    }

    case "eagle-taxi": {
      // Top-down taxi: same body as eagle-car with distinctive checkered roof strip
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><ellipse cx="11" cy="12" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="29" cy="12" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="11" cy="28" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="29" cy="28" rx="4" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><path d="M20 3.5 C16.5 3.5 12.5 5 11.5 8.5 L11 14 L11 26.5 Q11.5 33.5 15.5 35.5 L20 36.5 L24.5 35.5 Q28.5 33.5 29 26.5 L29 14 L28.5 8.5 C27.5 5 23.5 3.5 20 3.5Z" fill="${c}" stroke="white" stroke-width="1.5"/><path d="M14 8.5 Q20 7 26 8.5 L26.5 15 Q23.5 16.5 20 16.5 Q16.5 16.5 13.5 15Z" fill="rgba(200,230,255,0.7)" stroke="rgba(255,255,255,0.9)" stroke-width="0.7"/><path d="M14 28 Q17 27 20 27 Q23 27 26 28 L26 33 Q23 35 20 35 Q17 35 14 33Z" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.7)" stroke-width="0.6"/><rect x="11" y="17" width="2.5" height="8" rx="1" fill="rgba(200,230,255,0.55)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="26.5" y="17" width="2.5" height="8" rx="1" fill="rgba(200,230,255,0.55)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="13" y="17" width="3" height="3" fill="rgba(255,220,0,0.75)"/><rect x="16" y="17" width="3" height="3" fill="rgba(0,0,0,0.4)"/><rect x="19" y="17" width="3" height="3" fill="rgba(255,220,0,0.75)"/><rect x="22" y="17" width="3" height="3" fill="rgba(0,0,0,0.4)"/><rect x="25" y="17" width="2" height="3" fill="rgba(255,220,0,0.75)"/><rect x="13" y="20" width="3" height="3" fill="rgba(0,0,0,0.4)"/><rect x="16" y="20" width="3" height="3" fill="rgba(255,220,0,0.75)"/><rect x="19" y="20" width="3" height="3" fill="rgba(0,0,0,0.4)"/><rect x="22" y="20" width="3" height="3" fill="rgba(255,220,0,0.75)"/><rect x="25" y="20" width="2" height="3" fill="rgba(0,0,0,0.4)"/><rect x="14" y="3.5" width="4.5" height="1.8" rx="0.8" fill="rgba(255,255,200,0.9)"/><rect x="21.5" y="3.5" width="4.5" height="1.8" rx="0.8" fill="rgba(255,255,200,0.9)"/><rect x="14.5" y="35" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><rect x="21.5" y="35" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><polygon points="20,1 17.5,4.5 22.5,4.5" fill="white" opacity="0.95"/></g></svg>`;
    }

    case "eagle-bus": {
      // Top-down bus: wide rectangular body, 3 rows of side windows each side, 6 wheels
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="5.5" y="8" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="29.5" y="8" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="5.5" y="18" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="29.5" y="18" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="5.5" y="28" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="29.5" y="28" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="9" y="2.5" width="22" height="35" rx="3" fill="${c}" stroke="white" stroke-width="1.5"/><path d="M10 3 L30 3 L30 9 Q25 10.5 20 10.5 Q15 10.5 10 9Z" fill="rgba(200,230,255,0.65)" stroke="rgba(255,255,255,0.8)" stroke-width="0.7"/><rect x="9.5" y="12" width="3" height="5" rx="0.8" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="9.5" y="20" width="3" height="5" rx="0.8" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="9.5" y="28" width="3" height="5" rx="0.8" fill="rgba(200,230,255,0.45)" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/><rect x="27.5" y="12" width="3" height="5" rx="0.8" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="27.5" y="20" width="3" height="5" rx="0.8" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="27.5" y="28" width="3" height="5" rx="0.8" fill="rgba(200,230,255,0.45)" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/><rect x="12" y="31" width="16" height="5" rx="1" fill="rgba(200,230,255,0.35)" stroke="rgba(255,255,255,0.6)" stroke-width="0.6"/><line x1="10" y1="19" x2="30" y2="19" stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/><line x1="10" y1="27" x2="30" y2="27" stroke="rgba(255,255,255,0.3)" stroke-width="0.6"/><rect x="12.5" y="2.5" width="4" height="1.5" rx="0.6" fill="rgba(255,255,200,0.9)"/><rect x="23.5" y="2.5" width="4" height="1.5" rx="0.6" fill="rgba(255,255,200,0.9)"/><rect x="13" y="36" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><rect x="23" y="36" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><polygon points="20,0 17.5,3.5 22.5,3.5" fill="white" opacity="0.95"/></g></svg>`;
    }

    case "eagle-moto": {
      // Top-down motorcycle: narrow elongated shape, front & rear wheels, handlebars, body
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><ellipse cx="20" cy="7.5" rx="4.5" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><ellipse cx="20" cy="32.5" rx="4.5" ry="5.5" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="16" y="12" width="8" height="16" rx="4" fill="${c}" stroke="white" stroke-width="1.5"/><ellipse cx="20" cy="19" rx="5.5" ry="6" fill="${c}" stroke="white" stroke-width="1.2"/><ellipse cx="20" cy="7.5" rx="3" ry="3.5" fill="${c}" stroke="white" stroke-width="1"/><line x1="13" y1="12.5" x2="27" y2="12.5" stroke="${c}" stroke-width="3" stroke-linecap="round"/><line x1="13" y1="12.5" x2="27" y2="12.5" stroke="white" stroke-width="1" stroke-linecap="round"/><ellipse cx="20" cy="19" rx="2" ry="2.5" fill="rgba(255,255,255,0.2)"/><rect x="18.5" y="3.5" width="3" height="1.5" rx="0.6" fill="rgba(255,255,200,0.9)"/><polygon points="20,1 18,4.5 22,4.5" fill="white" opacity="0.95"/></g></svg>`;
    }

    case "eagle-truck": {
      // Top-down truck: short cab at front + long cargo bed, 6 wheels (2 front, 4 rear)
      return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 40 40"><g transform="rotate(${h},20,20)"><rect x="6" y="5.5" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="29" y="5.5" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="6" y="23" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="29" y="23" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="6" y="31" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="29" y="31" width="5" height="7" rx="2" fill="#111" stroke="rgba(255,255,255,0.5)" stroke-width="0.8"/><rect x="10" y="18" width="20" height="20" rx="2" fill="${c}" stroke="white" stroke-width="1.3"/><line x1="11" y1="25" x2="29" y2="25" stroke="rgba(255,255,255,0.35)" stroke-width="0.7"/><line x1="11" y1="31" x2="29" y2="31" stroke="rgba(255,255,255,0.35)" stroke-width="0.7"/><path d="M12 2.5 L28 2.5 Q31 2.5 31 5.5 L31 17 Q31 18 28 18 L12 18 Q9 18 9 17 L9 5.5 Q9 2.5 12 2.5Z" fill="${c}" stroke="white" stroke-width="1.5"/><path d="M13 4 L27 4 L27 11 Q24 12.5 20 12.5 Q16 12.5 13 11Z" fill="rgba(200,230,255,0.65)" stroke="rgba(255,255,255,0.85)" stroke-width="0.7"/><rect x="9" y="12.5" width="2.5" height="4" rx="0.8" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="28.5" y="12.5" width="2.5" height="4" rx="0.8" fill="rgba(200,230,255,0.5)" stroke="rgba(255,255,255,0.6)" stroke-width="0.5"/><rect x="13.5" y="2.5" width="4" height="1.5" rx="0.6" fill="rgba(255,255,200,0.9)"/><rect x="22.5" y="2.5" width="4" height="1.5" rx="0.6" fill="rgba(255,255,200,0.9)"/><rect x="14" y="37" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><rect x="22" y="37" width="4" height="1.5" rx="0.6" fill="rgba(255,40,40,0.9)"/><polygon points="20,0.5 17.5,4 22.5,4" fill="white" opacity="0.95"/></g></svg>`;
    }
  }
}
