import { LoadingText, Skeleton } from "./misc";

export function PageLoading({ text }: { text: string }) {
  return (
    <div className="container pb-24 pt-36 md:pt-44">
      <LoadingText>{text}</LoadingText>
      <Skeleton className="mt-8 h-16 w-2/3 max-w-xl" />
      <Skeleton className="mt-4 h-5 w-1/2 max-w-md" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-56" />
        ))}
      </div>
    </div>
  );
}
