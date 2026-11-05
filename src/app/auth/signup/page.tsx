"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  CheckCircle2,
  Loader2,
  Building2,
  MessageCircle,
  Mail,
} from "lucide-react";

const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL ?? "jzavalaolivares@gmail.com";
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_CONTACT_WHATSAPP ?? "";

function whatsappHref(message: string): string | null {
  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

export default function RequestAccessPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    message: "",
    website: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/access-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "No se pudo enviar la solicitud");
        return;
      }

      setSent(true);
    } catch (err) {
      console.error("Error enviando solicitud de acceso:", err);
      setError("Ocurrió un error. Por favor, intenta de nuevo.");
    } finally {
      setIsLoading(false);
    }
  };

  const followUpMessage =
    "Hola, envié una solicitud de acceso al sistema EPP Manager y quisiera conocer más.";
  const waHref = whatsappHref(followUpMessage);
  const waContactHref = whatsappHref(
    "Hola, quiero conocer más sobre EPP Manager.",
  );
  const mailHref = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(
    "Solicitud de acceso a EPP Manager",
  )}&body=${encodeURIComponent(followUpMessage)}`;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-slate-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-md bg-blue-600">
              <Building2 className="h-6 w-6 text-white" />
            </div>
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl font-bold">
              {sent ? "Solicitud enviada" : "Solicitar acceso"}
            </CardTitle>
            <CardDescription>
              {sent
                ? "Gracias. Nos pondremos en contacto contigo para coordinar una demostración."
                : "El registro público está cerrado. Cuéntanos sobre tu empresa y te contactamos."}
            </CardDescription>
          </div>
        </CardHeader>

        {sent ? (
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <span>
                Recibimos tu solicitud. Si necesitas una respuesta más rápida,
                escríbenos directamente.
              </span>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              {waHref && (
                <a
                  href={waHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp
                </a>
              )}
              <a
                href={mailHref}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <Mail className="h-4 w-4" />
                Correo
              </a>
            </div>
          </CardContent>
        ) : (
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nombre completo</Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Juan Pérez"
                  required
                  minLength={2}
                  maxLength={128}
                  disabled={isLoading}
                  autoComplete="name"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="tu.email@empresa.com"
                    required
                    maxLength={160}
                    disabled={isLoading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono / WhatsApp</Label>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+51 999 999 999"
                    maxLength={32}
                    disabled={isLoading}
                    autoComplete="tel"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="company">Empresa</Label>
                <Input
                  id="company"
                  name="company"
                  value={formData.company}
                  onChange={handleChange}
                  placeholder="Nombre de la empresa"
                  maxLength={128}
                  disabled={isLoading}
                  autoComplete="organization"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Mensaje (opcional)</Label>
                <Textarea
                  id="message"
                  name="message"
                  value={formData.message}
                  onChange={handleChange}
                  placeholder="Cuéntanos qué necesitas o cuántos usuarios estimas."
                  rows={3}
                  maxLength={1000}
                  disabled={isLoading}
                />
              </div>

              {/* Honeypot anti-spam: invisible para personas */}
              <div className="hidden" aria-hidden="true">
                <label htmlFor="website">No completar</label>
                <input
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  tabIndex={-1}
                  autoComplete="off"
                />
              </div>
            </CardContent>

            <CardFooter className="flex flex-col space-y-4">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoading ? "Enviando..." : "Enviar solicitud"}
              </Button>

              {waContactHref && (
                <a
                  href={waContactHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-sm font-medium text-green-700 hover:underline"
                >
                  <MessageCircle className="h-4 w-4" />
                  ¿Preferís WhatsApp? Escribinos
                </a>
              )}

              <div className="text-center text-sm text-muted-foreground">
                ¿Ya tienes cuenta?{" "}
                <Link
                  href="/auth/signin"
                  className="text-blue-600 hover:underline font-medium"
                >
                  Iniciar sesión
                </Link>
              </div>
            </CardFooter>
          </form>
        )}
      </Card>
    </div>
  );
}
