import Link from "next/link";
import PostForm from "./PostForm";

export default function NuevaPublicacionPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Nueva publicación</h1>
        <Link href="/admin/publicaciones" className="text-sm underline" style={{ color: "var(--primary)" }}>
          Volver
        </Link>
      </div>
      <PostForm />
    </div>
  );
}
