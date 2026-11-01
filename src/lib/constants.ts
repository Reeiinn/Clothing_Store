// Shared by the server (zod) and the browser (UI). Client components can't
// import Prisma's enums without pulling Prisma into the bundle.
export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type SizeCode = (typeof SIZES)[number];
