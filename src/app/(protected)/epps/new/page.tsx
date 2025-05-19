import EppForm from "@/components/epp/EppForm";

export default function NewEppPage() {
  return (
    <section className="space-y-6 px-4 md:px-8 py-6">
      <h1 className="text-3xl font-bold tracking-tight">Registrar nuevo EPP</h1>
      <EppForm />
    </section>
  );
}