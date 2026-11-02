// Not Prisma's enum: importing that would pull Prisma into the client bundle
export const SIZES = ["XS", "S", "M", "L", "XL"] as const;
export type SizeCode = (typeof SIZES)[number];
