import { createFileRoute } from "@tanstack/react-router";
import BookingPortal from "@/components/booking/BookingPortal";

export const Route = createFileRoute("/book")({
  head: () => ({ meta: [
    { title: "Salon Booking — Paragon Salon" },
    { name: "description", content: "Reserve your appointment at Paragon Salon online." },
    { property: "og:title", content: "Salon Booking — Paragon Salon" },
    { property: "og:description", content: "Book your Paragon Salon appointment and confirm on WhatsApp." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BookingPortal,
});
