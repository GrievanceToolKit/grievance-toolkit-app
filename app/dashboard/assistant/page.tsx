"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import StewardAssistant from "@/components/StewardAssistant";

interface Grievance {
  id: string;
  summary: string;
  description: string;
}

export default function AssistantPage() {
  const searchParams = useSearchParams();
  const grievanceId = searchParams.get("id");
  const supabase = createClientComponentClient();

  const [grievance, setGrievance] = useState<Grievance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGrievance = async () => {
      if (!grievanceId) return;

      const { data, error } = await supabase
        .from("grievances")
        .select("id, summary, description")
        .eq("id", grievanceId)
        .single();

      if (!error) {
        setGrievance(data);
      } else {
        console.error("Grievance fetch error:", error.message);
      }

      setLoading(false);
    };

    fetchGrievance();
  }, [grievanceId, supabase]);

  if (loading) return <div>Loading...</div>;
  if (!grievance) return <div>Grievance not found.</div>;

  return (
    <StewardAssistant
      summary={grievance.summary}
      description={grievance.description}
      grievanceId={grievance.id}
    />
  );
}
