import { Suspense } from "react";
import AssistantClient from "./AssistantClient";

export default function AssistantPage() {
  return (
    <Suspense fallback={<div>Loading Assistant...</div>}>
      <AssistantClient />
    </Suspense>
  );
}
