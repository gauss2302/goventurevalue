import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // Avoid immediate refetch after SSR hydration
        staleTime: 60 * 1000,
        // Keep unused data for 5 minutes
        gcTime: 5 * 60 * 1000,
        refetchOnWindowFocus: true,
      },
    },
  })
}

export function getContext() {
  const queryClient = createQueryClient()
  return {
    queryClient,
  }
}

export function Provider({
  children,
  queryClient,
}: {
  children: React.ReactNode
  queryClient: QueryClient
}) {
  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}

