"use client";

import { useStore } from "@/lib/store";
import PersonaForm from "@/components/PersonaForm";
import { use } from "react";

export default function EditPersonaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const persona = useStore((s) => s.personas.find((p) => p.id === id));

  if (!persona) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-slate-500">Persona not found.</p>
      </div>
    );
  }

  return <PersonaForm initial={persona} />;
}
