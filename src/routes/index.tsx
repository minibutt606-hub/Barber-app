import { createFileRoute } from "@tanstack/react-router";
import BookingPortal from "@/components/booking/BookingPortal";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [
    { title: "Book an Appointment — Paragon Salon" },
    { name: "description", content: "Book salon services with Paragon Salon at Shah Chowk near Chaman. Choose a service, stylist and time." },
    { property: "og:title", content: "Book an Appointment — Paragon Salon" },
    { property: "og:description", content: "Choose your salon service and book directly with Paragon Salon." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary_large_image" },
  ] }),
  component: BookingPortal,
});
