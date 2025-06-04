import EchoMazeGame from '@/components/game/EchoMazeGame';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-background">
      <h1 className="text-4xl font-headline mb-8 text-primary">EchoMaze</h1>
      <EchoMazeGame />
    </main>
  );
}
