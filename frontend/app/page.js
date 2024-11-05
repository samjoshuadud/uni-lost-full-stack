import UniLostAndFound from "./uni-lost-and-found"
import { AuthProvider } from "@/lib/AuthContext"

export default function Home() {
  return (
    <AuthProvider>
      <UniLostAndFound />
    </AuthProvider>
  );
}
