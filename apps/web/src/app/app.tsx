import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// The placeholder page. The product list replaces its content.
export function App() {
  return (
    <main className="flex min-h-svh items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>
            <h1 className="text-2xl">Grocy Next</h1>
          </CardTitle>
          <CardDescription>The companion app for Grocy.</CardDescription>
        </CardHeader>
        <CardContent>
          <p>The web app runs. The product list comes next.</p>
        </CardContent>
      </Card>
    </main>
  );
}
