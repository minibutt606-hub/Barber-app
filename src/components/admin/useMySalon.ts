import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";

import { getMySalon } from "@/lib/account.functions";
import { SALON } from "@/lib/salon";

export type SalonProfile = {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  whatsapp: string;
  slug: string;
  openFrom: string;
  openTo: string;
};

/** Branding + contact details for the salon the signed-in user belongs to. */
export function useMySalon(): SalonProfile {
  const fn = useServerFn(getMySalon);
  const { data } = useQuery({
    queryKey: ["my-salon"],
    queryFn: () => fn(),
    staleTime: 5 * 60 * 1000,
  });

  return {
    name: data?.name ?? SALON.name,
    tagline: data?.tagline ?? SALON.tagline,
    address: data?.address ?? "",
    phone: data?.phone ?? "",
    whatsapp: data?.whatsapp ?? "",
    slug: data?.slug ?? "",
    openFrom: data?.open_from ?? SALON.openFrom,
    openTo: data?.open_to ?? SALON.openTo,
  };
}
