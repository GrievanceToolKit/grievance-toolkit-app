// app/grievance/[gid]/page.tsx

import { Suspense } from "react";
import DetailsClient from "./DetailsClient";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DetailsClient />
    </Suspense>
  );
}