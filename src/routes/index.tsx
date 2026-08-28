import { createFileRoute } from "@tanstack/react-router";
import BookingPortal from "@/components/booking/BookingPortal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Paragon Barber — Book Your Grooming Ritual" },
      {
        name: "description",
        content:
          "Book haircuts, beard styling, facials and royal grooming packages at Paragon Barber. Pick your stylist, choose a slot and confirm on WhatsApp.",
      },
      { property: "og:title", content: "Paragon Barber — Book Your Grooming Ritual" },
      {
        property: "og:description",
        content: "Luxury barbering in Lahore. Reserve your chair in under a minute.",
      },
    ],
  }),
  component: BookingPortal,
});
