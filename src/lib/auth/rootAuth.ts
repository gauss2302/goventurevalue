import { createServerFn } from "@tanstack/react-start";
import { getRequestHeaders } from "@tanstack/react-start/server";

import { getServerSession } from "@/lib/auth/server";

export const getRootAuth = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    const session = await getServerSession(headers);
    return { isAuthenticated: !!session?.user };
  },
);

export const getSession = createServerFn({ method: "GET" }).handler(
  async () => {
    const headers = getRequestHeaders();
    return getServerSession(headers);
  },
);
