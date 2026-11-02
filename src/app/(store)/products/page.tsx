import { Suspense } from "react";

import { Catalog } from "./Catalog";

export default function Page() {
  return (
    <Suspense>
      <Catalog />
    </Suspense>
  );
}
