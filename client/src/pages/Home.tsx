import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";

export default function Home() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-blue-600 flex flex-col items-center justify-center p-4">
      <main className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">Pianew Tiles</h1>
        <p className="text-xl text-white/90 mb-8">A musical rhythm game inspired by Piano Tiles 2</p>
        <Button
          onClick={() => setLocation('/game')}
          className="bg-white text-purple-600 hover:bg-gray-100 px-8 py-3 text-lg font-bold"
        >
          Play Now
        </Button>
      </main>
    </div>
  );
}
