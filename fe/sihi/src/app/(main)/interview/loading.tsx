import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export default function InterviewLoading() {
  return (
    <div className="max-w-3xl mx-auto space-y-6 py-4">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-9 w-64" />
        <Skeleton className="h-4 w-96" />
      </div>

      {/* Field & Level selection */}
      <div className="grid gap-4 sm:grid-cols-2">
        {[1, 2].map((i) => (
          <Card key={i} className="glass border-0">
            <CardContent className="p-5 space-y-3">
              <Skeleton className="h-5 w-28" />
              <div className="grid grid-cols-2 gap-2">
                {[1, 2, 3, 4].map((j) => (
                  <Skeleton key={j} className="h-10 rounded-lg" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CV section */}
      <Card className="glass border-0">
        <CardContent className="p-5 space-y-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>
          <Skeleton className="h-10 w-full rounded-lg" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* JD textarea */}
      <Card className="glass border-0">
        <CardContent className="p-5 space-y-3">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-24 w-full rounded-lg" />
        </CardContent>
      </Card>

      {/* Start button */}
      <div className="flex justify-center pt-2">
        <Skeleton className="h-12 w-48 rounded-md" />
      </div>
    </div>
  );
}
